import { useEffect, useRef, useState, useCallback } from 'react';
import { ArrowLeft, Save, Clock } from 'lucide-react';
import '@fortune-sheet/react/dist/index.css';
import { Workbook } from '@fortune-sheet/react';
import type { WorkbookInstance } from '@fortune-sheet/react';
import type { Sheet } from '@fortune-sheet/core';
import { useStore } from '../store';
import { BotaoImportarExcel } from './BotaoImportarExcel';
import { salvarTabelaEmPartes, lerTabelaEmPartes } from '../lib/salvarTabela';
import type { PlanilhaImportada } from '../lib/importarExcel';
import { ApiError } from '../api/client';
import { formatRelativeTime } from '../utils';

interface Props {
  id: string;
  nomeInicial: string;
  readOnly: boolean;
  onBack: () => void;
  onNomeChange?: (nome: string) => void;
}

function abaVazia(): Sheet {
  return { name: 'Planilha 1', celldata: [], order: 0, row: 200, column: 30, config: {} } as unknown as Sheet;
}

function normalizarDados(dados: unknown): Sheet[] {
  if (Array.isArray(dados) && dados.length > 0) return dados as Sheet[];
  const obj = dados as { sheets?: unknown } | null;
  if (obj && Array.isArray(obj.sheets) && obj.sheets.length > 0) return obj.sheets as Sheet[];
  return [abaVazia()];
}

export function TabelaEmpreendimentoEditor({ id, nomeInicial, readOnly, onBack, onNomeChange }: Props) {
  const showToast = useStore((s) => s.showToast);

  const wbRef = useRef<WorkbookInstance>(null);
  const sheetsRef = useRef<Sheet[] | null>(null);

  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [sheetsIniciais, setSheetsIniciais] = useState<Sheet[] | null>(null);
  const [nome, setNome] = useState(nomeInicial);
  const [dirty, setDirty] = useState(false);
  const [salvando, setSalvando] = useState(false);
  /**
   * Em que lote de células o salvamento está. Nulo enquanto a planilha ainda está subindo.
   *
   * O botão mostra isso porque uma pasta de trabalho grande leva dezenas de lotes: sem o
   * contador, "Salvando…" parado por meio minuto parece travamento.
   */
  const [progresso, setProgresso] = useState<{ feitas: number; paginas: number } | null>(null);
  /** Em que aba a LEITURA está — a planilha também vem uma aba por vez. */
  const [progressoLeitura, setProgressoLeitura] = useState<{ feitas: number; total: number } | null>(null);
  /** Lido dentro do catch, onde o `dirty` do closure estaria velho. */
  const dirtyRef = useRef(false);
  useEffect(() => {
    dirtyRef.current = dirty;
  }, [dirty]);
  const [atualizadoPorNome, setAtualizadoPorNome] = useState<string | null>(null);
  const [atualizadoEm, setAtualizadoEm] = useState<string | null>(null);
  /**
   * Sobe a cada importação, e entra na `key` do Workbook.
   *
   * O fortune-sheet lê `data` só na montagem: trocar a prop com o mesmo `key` não mudaria nada
   * na tela, e a planilha importada ficaria invisível até recarregar a página.
   */
  const [versao, setVersao] = useState(0);

  useEffect(() => {
    let vivo = true;
    setCarregando(true);
    setProgressoLeitura(null);
    lerTabelaEmPartes(id, (feitas, total) => {
      if (vivo) setProgressoLeitura({ feitas, total });
    })
      .then((t) => {
        if (!vivo) return;
        setSheetsIniciais(normalizarDados(t.sheets));
        setNome(t.nome);
        setAtualizadoPorNome(t.atualizadoPorNome);
        setAtualizadoEm(t.atualizadoEm);
      })
      .catch((err) => { if (vivo) setErro(err instanceof ApiError ? err.message : 'Não foi possível abrir a tabela.'); })
      .finally(() => { if (vivo) setCarregando(false); });
    return () => { vivo = false; };
  }, [id]);

  const salvar = useCallback(async () => {
    if (readOnly || salvando) return;
    const sheets = (wbRef.current?.getAllSheets() ?? sheetsRef.current ?? sheetsIniciais ?? []) as Sheet[];
    setSalvando(true);
    setProgresso(null);
    try {
      const res = await salvarTabelaEmPartes(id, sheets, {
        nome: nome.trim() || nomeInicial,
        onProgresso: (feitas, paginas) => {
          // A planilha já subiu quando o primeiro lote começa — daí marcar salvo aqui, e não
          // só no fim: o que a tela mostra está gravado, e o que falta é o registro.
          setDirty(false);
          setProgresso({ feitas, paginas });
        },
      });
      setDirty(false);
      setAtualizadoPorNome(res.atualizadoPorNome);
      setAtualizadoEm(res.atualizadoEm);
      onNomeChange?.(nome.trim() || nomeInicial);
      showToast(`Tabela salva — ${res.gravadas.toLocaleString('pt-BR')} célula(s).`);
    } catch (err) {
      const mensagem = err instanceof ApiError ? err.message : 'Não foi possível salvar a tabela.';
      // Se a planilha já gravou e o erro veio dos lotes, dizer só "não foi possível salvar"
      // seria mentira: o que a tela mostra está salvo. O que ficou pela metade é o registro de
      // auditoria, e reenviar resolve.
      showToast(dirtyRef.current ? mensagem : `${mensagem} A planilha foi salva; reenvie para completar o registro.`);
    } finally {
      setSalvando(false);
      setProgresso(null);
    }
  }, [id, nome, nomeInicial, readOnly, salvando, sheetsIniciais, onNomeChange, showToast]);

  /**
   * Importar aqui SUBSTITUI o conteúdo desta tabela — mas só na tela.
   *
   * Nada vai para o servidor até o Salvar, de propósito: a pessoa confere se a planilha chegou
   * como esperava e, se não chegou, sai sem salvar e a tabela antiga continua intacta. É o que
   * torna a substituição segura sem precisar de uma pergunta antes do seletor de arquivo.
   */
  function handleImportado(planilha: PlanilhaImportada) {
    sheetsRef.current = planilha.sheets;
    setSheetsIniciais(planilha.sheets);
    setVersao((v) => v + 1);
    setDirty(true);
    showToast(
      `Planilha carregada: ${planilha.sheets.length} aba(s), ${planilha.totalCelulas.toLocaleString('pt-BR')} células. ` +
        'Confira e clique em Salvar para substituir o conteúdo desta tabela.'
    );
    for (const aviso of planilha.avisos) showToast(aviso);
  }

  // Ctrl/Cmd+S salva
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        if (dirty) salvar();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [dirty, salvar]);

  function handleBack() {
    if (dirty && !window.confirm('Há alterações não salvas. Sair mesmo assim?')) return;
    onBack();
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Header */}
      <div className="bg-white border-b px-4 md:px-6 py-3 flex-shrink-0 flex items-center gap-3" style={{ borderColor: '#e5e7eb' }}>
        <button
          onClick={handleBack}
          className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-500 hover:bg-gray-100 transition-colors flex-shrink-0"
          title="Voltar"
        >
          <ArrowLeft size={16} />
        </button>
        <input
          className="font-questrial text-lg text-gray-800 bg-transparent border-0 border-b border-transparent focus:border-gray-300 focus:outline-none min-w-0 flex-1"
          value={nome}
          disabled={readOnly}
          onChange={(e) => { setNome(e.target.value); setDirty(true); }}
        />
        <div className="hidden md:flex items-center gap-1.5 text-xs text-gray-400 flex-shrink-0">
          <Clock size={12} />
          {atualizadoEm
            ? `${atualizadoPorNome ? `${atualizadoPorNome} · ` : ''}${formatRelativeTime(atualizadoEm)}`
            : '—'}
        </div>
        {!readOnly && (
          <BotaoImportarExcel
            rotulo="Importar"
            onImportado={handleImportado}
            onErro={(mensagem) => showToast(mensagem)}
          />
        )}
        {!readOnly && (
          <button
            onClick={salvar}
            disabled={!dirty || salvando}
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white rounded-lg hover:opacity-90 disabled:opacity-40 flex-shrink-0 transition-opacity"
            style={{ backgroundColor: '#d55006' }}
          >
            <Save size={15} />
            {salvando
              ? progresso
                ? `Salvando… ${progresso.feitas + 1}/${progresso.paginas}`
                : 'Salvando…'
              : dirty ? 'Salvar' : 'Salvo'}
          </button>
        )}
      </div>

      {/* Editor */}
      <div className="flex-1 min-h-0 relative">
        {carregando && (
          <div className="absolute inset-0 flex items-center justify-center text-sm text-gray-400 bg-white z-10">
            {progressoLeitura && progressoLeitura.total > 1
              ? `Carregando planilha… aba ${progressoLeitura.feitas + 1} de ${progressoLeitura.total}`
              : 'Carregando planilha…'}
          </div>
        )}
        {erro && (
          <div className="absolute inset-0 flex items-center justify-center text-sm text-red-500 bg-white z-10">{erro}</div>
        )}
        {sheetsIniciais && (
          <Workbook
            key={`${id}:${versao}`}
            ref={wbRef}
            data={sheetsIniciais}
            lang="en"
            allowEdit={!readOnly}
            showToolbar={!readOnly}
            showFormulaBar
            onChange={(data) => { sheetsRef.current = data as Sheet[]; setDirty(true); }}
          />
        )}
      </div>
    </div>
  );
}
