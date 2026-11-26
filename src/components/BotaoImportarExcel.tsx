import { useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Upload, Search, X } from 'lucide-react';
import { Spinner } from './Spinner';
import { ApiError } from '../api/client';
import type { PlanilhaImportada } from '../lib/importarExcel';

/**
 * Camada dos modais que abrem POR CIMA da planilha.
 *
 * O fortune-sheet desenha as imagens da planilha, os menus e as alças de seleção em camadas
 * próprias, que vão até z-index 1005. Os modais do sistema vivem entre 200 e 300, então ficavam
 * ATRÁS das imagens: o modal de "quais abas importar" abria com o logo da tabela por cima dele.
 *
 * 2000 é folgado acima de 1005 de propósito — não é para ficar disputando por um ponto.
 *
 * E não basta o número: estes modais vão para `document.body` por portal. Renderizados dentro
 * do editor, ficariam presos ao contexto de empilhamento da planilha, onde z-index nenhum os
 * tiraria de lá.
 */
const ACIMA_DA_PLANILHA = 'z-[2000]';

/**
 * Botão que lê um .xlsx e entrega a planilha já convertida para quem chamou.
 *
 * A conversão fica aqui e a gravação fica com a tela: a lista cria uma tabela nova com o
 * conteúdo importado, enquanto o editor substitui o conteúdo da tabela aberta. São destinos
 * diferentes para o mesmo arquivo, e só o caminho até o JSON é comum.
 *
 * Entre escolher o arquivo e converter existe uma parada: QUAIS abas trazer. A pasta de
 * trabalho da cliente tem 85 — meses de tabelas de preço guardadas uma ao lado da outra — e
 * trazer tudo rende uma planilha de 29 MB que o navegador arrasta para desenhar. Ler os nomes
 * das abas custa milissegundos, então a pergunta vem antes do trabalho pesado.
 *
 * O aviso em tela cheia não é enfeite. A leitura roda na própria aba do navegador e trava a
 * interface por bastante tempo num arquivo grande — sem ele, a tela ficaria congelada sem
 * explicação e a pessoa clicaria de novo.
 */
export function BotaoImportarExcel({
  onImportado,
  onErro,
  rotulo = 'Importar Excel',
  variante = 'secundario',
}: {
  /** Recebe a planilha convertida; o que for devolvido é aguardado antes de fechar o aviso. */
  onImportado: (planilha: PlanilhaImportada) => Promise<void> | void;
  onErro: (mensagem: string) => void;
  rotulo?: string;
  variante?: 'primario' | 'secundario';
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [etapa, setEtapa] = useState<'lendo' | 'convertendo' | 'gravando' | null>(null);
  const [escolha, setEscolha] = useState<{ arquivo: File; abas: string[] } | null>(null);

  async function aoEscolherArquivo(e: React.ChangeEvent<HTMLInputElement>) {
    const arquivo = e.target.files?.[0];
    // Limpa já: sem isto, escolher o MESMO arquivo de novo não dispara `change` e o botão
    // parece quebrado justamente em quem está tentando reimportar depois de um erro.
    e.target.value = '';
    if (!arquivo) return;

    setEtapa('lendo');
    try {
      const { nomesDasAbas } = await import('../lib/importarExcel');
      const abas = await nomesDasAbas(arquivo);
      setEtapa(null);
      // Uma aba só não é uma escolha: perguntar seria só um clique a mais.
      if (abas.length <= 1) await converter(arquivo, undefined);
      else setEscolha({ arquivo, abas });
    } catch {
      setEtapa(null);
      onErro('Não foi possível abrir este arquivo. Confira se ele abre no Excel sem erro.');
    }
  }

  async function converter(arquivo: File, abas: string[] | undefined) {
    setEscolha(null);
    setEtapa('convertendo');

    // O conversor carrega só agora, e não junto com a tela: ele arrasta o leitor de zip e o
    // parser de .xlsx, que pesam mais que a tela inteira e não servem para quem só veio
    // consultar uma tabela.
    let importador: typeof import('../lib/importarExcel');
    try {
      importador = await import('../lib/importarExcel');
    } catch {
      setEtapa(null);
      onErro('Não foi possível carregar o leitor de planilhas. Verifique a conexão e tente de novo.');
      return;
    }

    // A fase também vive numa variável local: o `etapa` do estado fica desatualizado dentro
    // deste mesmo fluxo, e é ela que decide se a falha foi ao LER o arquivo ou ao GRAVAR.
    // Dizer "confira se o arquivo abre no Excel" depois de uma recusa do servidor manda a
    // pessoa procurar defeito numa planilha que estava perfeita.
    let fase: 'convertendo' | 'gravando' = 'convertendo';
    try {
      const planilha = await importador.importarExcel(arquivo, { abas });
      fase = 'gravando';
      setEtapa('gravando');
      await onImportado(planilha);
    } catch (err) {
      if (err instanceof importador.ErroDeImportacao || err instanceof ApiError) {
        onErro(err.message);
      } else if (fase === 'convertendo') {
        onErro('Não foi possível ler esta planilha. Confira se o arquivo abre no Excel sem erro.');
      } else {
        onErro('A planilha foi lida, mas não foi possível gravá-la no CRM. Tente de novo.');
      }
    } finally {
      setEtapa(null);
    }
  }

  const primario = variante === 'primario';

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        className="hidden"
        onChange={aoEscolherArquivo}
      />

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={etapa !== null}
        className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg transition-colors flex-shrink-0 disabled:opacity-50 ${
          primario ? 'text-white hover:opacity-90' : 'border text-gray-700 bg-white hover:bg-gray-50'
        }`}
        style={primario ? { backgroundColor: '#d55006' } : { borderColor: '#e5e7eb' }}
      >
        {etapa ? <Spinner size={15} /> : <Upload size={16} />}
        <span className="hidden sm:inline">{rotulo}</span>
      </button>

      {escolha && (
        <EscolhaDeAbas
          nomeDoArquivo={escolha.arquivo.name}
          abas={escolha.abas}
          onCancelar={() => setEscolha(null)}
          onConfirmar={(abas) => void converter(escolha.arquivo, abas)}
        />
      )}

      {etapa && createPortal(
        <div className={`fixed inset-0 ${ACIMA_DA_PLANILHA} flex items-center justify-center`} style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="bg-white rounded-2xl shadow-2xl px-6 py-5 w-full max-w-sm mx-3 text-center">
            <Spinner size={26} className="text-[#d55006] mx-auto" />
            <p className="mt-3 text-sm font-semibold text-gray-800">
              {etapa === 'lendo' ? 'Abrindo o arquivo…' : etapa === 'convertendo' ? 'Lendo a planilha…' : 'Gravando no CRM…'}
            </p>
            <p className="mt-1 text-xs text-gray-500">
              {etapa === 'convertendo'
                ? 'Em pastas de trabalho grandes isto leva alguns minutos e a tela fica parada. Não feche esta aba.'
                : etapa === 'gravando'
                  ? 'Guardando as abas, os valores e a formatação.'
                  : 'Só um instante.'}
            </p>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}

/** A partir daqui a planilha fica pesada de desenhar, e vale avisar antes de converter. */
const MUITAS_ABAS = 15;

function EscolhaDeAbas({
  nomeDoArquivo,
  abas,
  onCancelar,
  onConfirmar,
}: {
  nomeDoArquivo: string;
  abas: string[];
  onCancelar: () => void;
  onConfirmar: (abas: string[]) => void;
}) {
  const [marcadas, setMarcadas] = useState<Set<string>>(() => new Set(abas));
  const [busca, setBusca] = useState('');

  const visiveis = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return termo ? abas.filter((a) => a.toLowerCase().includes(termo)) : abas;
  }, [abas, busca]);

  function alternar(aba: string) {
    setMarcadas((atual) => {
      const nova = new Set(atual);
      if (nova.has(aba)) nova.delete(aba);
      else nova.add(aba);
      return nova;
    });
  }

  /** Marca ou desmarca o que está FILTRADO — com 85 abas, é assim que se escolhe "os de 2026". */
  function alternarVisiveis(marcar: boolean) {
    setMarcadas((atual) => {
      const nova = new Set(atual);
      for (const aba of visiveis) {
        if (marcar) nova.add(aba);
        else nova.delete(aba);
      }
      return nova;
    });
  }

  return createPortal(
    <div
      className={`fixed inset-0 ${ACIMA_DA_PLANILHA} flex items-center justify-center modal-backdrop p-3`}
      style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onCancelar(); }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col" style={{ maxHeight: '85vh' }}>
        <div className="flex items-start justify-between gap-3 px-5 py-4 border-b" style={{ borderColor: '#e5e7eb' }}>
          <div className="min-w-0">
            <h2 className="font-questrial font-bold text-lg text-gray-900">Quais abas importar?</h2>
            <p className="text-xs text-gray-500 mt-0.5 truncate">
              <strong>{nomeDoArquivo}</strong> tem {abas.length} aba(s).
            </p>
          </div>
          <button onClick={onCancelar} className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-100 flex-shrink-0">
            <X size={16} />
          </button>
        </div>

        <div className="px-5 pt-4 flex items-center gap-2">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input
              autoFocus
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Filtrar abas… (ex.: 2026)"
              className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border bg-white placeholder:text-gray-400 focus:outline-none focus:border-orange-300 focus:ring-2 focus:ring-orange-100"
              style={{ borderColor: '#e5e7eb' }}
            />
          </div>
          <button onClick={() => alternarVisiveis(true)} className="text-xs font-semibold px-2.5 py-2 rounded-lg hover:bg-gray-100" style={{ color: '#d55006' }}>
            Marcar
          </button>
          <button onClick={() => alternarVisiveis(false)} className="text-xs font-semibold px-2.5 py-2 rounded-lg text-gray-500 hover:bg-gray-100">
            Limpar
          </button>
        </div>

        <div className="flex-1 overflow-auto px-5 py-3 min-h-0">
          {visiveis.length === 0 && <p className="text-sm text-gray-400 py-8 text-center">Nenhuma aba com esse nome.</p>}
          <div className="grid sm:grid-cols-2 gap-1">
            {visiveis.map((aba) => (
              <label key={aba} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-gray-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={marcadas.has(aba)}
                  onChange={() => alternar(aba)}
                  className="flex-shrink-0"
                  style={{ accentColor: '#d55006' }}
                />
                <span className="text-sm text-gray-700 truncate" title={aba}>{aba}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="px-5 py-4 border-t bg-gray-50 rounded-b-2xl" style={{ borderColor: '#e5e7eb' }}>
          {marcadas.size > MUITAS_ABAS && (
            // Honestidade sobre o custo: o tempo de LEITURA é do arquivo inteiro e não muda
            // com a escolha — o que muda é o peso da planilha depois de pronta.
            <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-3">
              {marcadas.size} abas de uma vez deixam a tabela pesada de abrir e de rolar. A leitura do
              arquivo demora o mesmo de qualquer jeito; trazer menos abas deixa o resultado mais leve.
            </p>
          )}
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-500 flex-1">
              <strong>{marcadas.size}</strong> de {abas.length} selecionada(s)
            </span>
            <button onClick={onCancelar} className="px-4 py-2 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-200">
              Cancelar
            </button>
            <button
              onClick={() => onConfirmar([...marcadas])}
              disabled={marcadas.size === 0}
              className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white hover:opacity-90 disabled:opacity-40"
              style={{ backgroundColor: '#d55006' }}
            >
              Importar
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
