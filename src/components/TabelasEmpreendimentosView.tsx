import { useEffect, useMemo, useState } from 'react';
import { Plus, Table2, Trash2, X, Building2, Search } from 'lucide-react';
import { useStore } from '../store';
import { useViewReady } from '../navLoading';
import { ViewLoader } from './ViewLoader';
import { ConfirmModal } from './ConfirmModal';
import { Spinner } from './Spinner';
import { BotaoImportarExcel } from './BotaoImportarExcel';
import { celulasDasAbas } from '../lib/celulasDaPlanilha';
import type { PlanilhaImportada } from '../lib/importarExcel';
import { tabelasEmpreendimentosApi } from '../api/endpoints';
import { ApiError } from '../api/client';
import { formatRelativeTime } from '../utils';
import { TabelaEmpreendimentoEditor } from './TabelaEmpreendimentoEditor';
import type { TabelaEmpreendimentoResumo } from '../types';

/** Sem acento e em minúsculas, para comparar nomes digitados por pessoas diferentes. */
function normalizado(texto: string): string {
  return texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}

function iniciaisDe(nome: string): string {
  return nome.split(/\s+/).map((p) => p[0] ?? '').join('').toUpperCase().slice(0, 2);
}

export function TabelasEmpreendimentosView() {
  const currentUser = useStore((s) => s.currentUser);
  const showToast = useStore((s) => s.showToast);
  const podeEditar = currentUser?.cargo === 'Diretora';

  const [tabelas, setTabelas] = useState<TabelaEmpreendimentoResumo[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState('');
  const [aberta, setAberta] = useState<{ id: string; nome: string } | null>(null);
  const [busca, setBusca] = useState('');

  const [criando, setCriando] = useState(false);
  const [novoNome, setNovoNome] = useState('');
  const [salvandoNovo, setSalvandoNovo] = useState(false);
  const [paraExcluir, setParaExcluir] = useState<TabelaEmpreendimentoResumo | null>(null);
  const [excluindo, setExcluindo] = useState(false);

  // Dispensa o toast de navegação (a tela é carregada sob demanda — só o chunk já pode
  // demorar) quando a lista de tabelas chega pela primeira vez.
  const [primeiraCargaFeita, setPrimeiraCargaFeita] = useState(false);
  useViewReady(primeiraCargaFeita);

  function carregar() {
    setLoading(true);
    setErro('');
    tabelasEmpreendimentosApi
      .list()
      .then(setTabelas)
      .catch((err) => setErro(err instanceof ApiError ? err.message : 'Não foi possível carregar as tabelas.'))
      .finally(() => { setLoading(false); setPrimeiraCargaFeita(true); });
  }

  useEffect(() => {
    if (!aberta) carregar();
  }, [aberta]);

  const ordenadas = useMemo(
    () => [...tabelas].sort((a, b) => b.atualizadoEm.localeCompare(a.atualizadoEm)),
    [tabelas]
  );

  // A busca olha também o empreendimento: as tabelas vinculadas nem sempre repetem o nome dele
  // no título, e procurar por "Vibra" tem que achar a tabela do Vibra de qualquer jeito.
  const visiveis = useMemo(() => {
    const termo = normalizado(busca);
    if (!termo) return ordenadas;
    return ordenadas.filter((t) =>
      normalizado(`${t.nome} ${t.empreendimentoNome ?? ''}`).includes(termo)
    );
  }, [ordenadas, busca]);

  async function handleCriar() {
    const nome = novoNome.trim();
    if (!nome) return;
    setSalvandoNovo(true);
    try {
      const nova = await tabelasEmpreendimentosApi.create(nome);
      setCriando(false);
      setNovoNome('');
      setAberta({ id: nova.id, nome: nova.nome });
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'Não foi possível criar a tabela.');
    } finally {
      setSalvandoNovo(false);
    }
  }

  /**
   * Um .xlsx vira uma tabela NOVA, já aberta no editor.
   *
   * Tabela nova, e não substituição da que estiver selecionada: importar é trazer a planilha
   * da cliente para dentro do CRM, e sobrescrever uma tabela existente por engano apagaria
   * meses de trabalho de outra pessoa. Para substituir, o botão fica dentro do editor, onde
   * está claro qual tabela vai mudar.
   */
  async function handleImportar(planilha: PlanilhaImportada) {
    const nome = planilha.nomeSugerido.slice(0, 160);
    const nova = await tabelasEmpreendimentosApi.create(nome);
    try {
      await tabelasEmpreendimentosApi.save(nova.id, {
        nome,
        dados: planilha.sheets,
        celulas: celulasDasAbas(planilha.sheets),
      });
    } catch (err) {
      // A tabela já existe no banco, vazia. Deixá-la lá seria entulho com o nome do arquivo,
      // parecendo uma importação que deu certo.
      await tabelasEmpreendimentosApi.remove(nova.id).catch(() => undefined);
      throw err;
    }

    const partes = [
      `${planilha.sheets.length} aba(s)`,
      `${planilha.totalCelulas.toLocaleString('pt-BR')} células`,
      ...(planilha.totalImagens > 0 ? [`${planilha.totalImagens} imagem(ns)`] : []),
      ...(planilha.abasIgnoradas > 0 ? [`${planilha.abasIgnoradas} aba(s) não importada(s)`] : []),
    ];
    showToast(`"${nome}" importada — ${partes.join(', ')}.`);
    for (const aviso of planilha.avisos) showToast(aviso);

    setAberta({ id: nova.id, nome });
  }

  async function handleExcluir() {
    if (!paraExcluir) return;
    setExcluindo(true);
    try {
      await tabelasEmpreendimentosApi.remove(paraExcluir.id);
      setTabelas((prev) => prev.filter((x) => x.id !== paraExcluir.id));
      setParaExcluir(null);
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'Não foi possível excluir a tabela.');
    } finally {
      setExcluindo(false);
    }
  }

  if (aberta) {
    return (
      <TabelaEmpreendimentoEditor
        id={aberta.id}
        nomeInicial={aberta.nome}
        readOnly={!podeEditar}
        onBack={() => setAberta(null)}
        onNomeChange={(nome) => setAberta((a) => (a ? { ...a, nome } : a))}
      />
    );
  }

  if (!primeiraCargaFeita) return <ViewLoader label="Carregando tabelas…" />;

  const total = tabelas.length;
  const resumo = busca.trim()
    ? `${visiveis.length} de ${total} ${total === 1 ? 'tabela' : 'tabelas'}`
    : `${total} ${total === 1 ? 'tabela' : 'tabelas'} de custos e rentabilidade`;

  return (
    <div className="flex flex-col h-full" style={{ backgroundColor: '#fafafa' }}>
      {/* ── Cabeçalho ── */}
      <div className="bg-white border-b px-4 md:px-6 py-4 flex-shrink-0" style={{ borderColor: '#e5e7eb' }}>
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          <div className="min-w-0">
            {/* O menu lateral chama esta tela de "Tabelas de Custos"; o título dizia outra
                coisa. Dois nomes para a mesma tela fazem quem lê duvidar se chegou no lugar. */}
            <h1 className="font-questrial text-xl text-gray-800">Tabelas de Custos</h1>
            <p className="text-sm text-gray-500 mt-0.5 flex items-center gap-1.5">
              {loading && <Spinner size={12} className="text-gray-400" />}
              {resumo}
            </p>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {total > 0 && (
              <div className="relative flex-1 lg:flex-none">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                <input
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  placeholder="Buscar tabela…"
                  aria-label="Buscar tabela"
                  className="w-full lg:w-60 pl-9 pr-8 py-2 text-sm rounded-lg border bg-white placeholder:text-gray-400 focus:outline-none focus:border-orange-300 focus:ring-2 focus:ring-orange-100 transition-colors"
                  style={{ borderColor: '#e5e7eb' }}
                />
                {busca && (
                  <button
                    onClick={() => setBusca('')}
                    aria-label="Limpar busca"
                    className="absolute right-2 top-1/2 -translate-y-1/2 w-5 h-5 rounded flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>
            )}

            {podeEditar && (
              <>
                <BotaoImportarExcel
                  onImportado={handleImportar}
                  onErro={(mensagem) => showToast(mensagem)}
                />
                <button
                  onClick={() => { setNovoNome(''); setCriando(true); }}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white rounded-lg hover:opacity-90 transition-opacity flex-shrink-0"
                  style={{ backgroundColor: '#d55006' }}
                >
                  <Plus size={16} />
                  <span className="hidden sm:inline">Nova tabela</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── Lista ── */}
      <div className="flex-1 overflow-auto p-4 md:p-6">
        {erro && (
          <div className="mb-4 rounded-xl border px-4 py-3" style={{ borderColor: '#fecaca', backgroundColor: '#fef2f2' }}>
            <p className="text-sm font-semibold text-red-700">{erro}</p>
            <button
              onClick={carregar}
              className="mt-2 px-3 py-1.5 rounded-lg text-xs font-bold text-white"
              style={{ backgroundColor: '#d55006' }}
            >
              Tentar novamente
            </button>
          </div>
        )}

        {!loading && !erro && total === 0 && (
          <div className="py-20 flex flex-col items-center text-center">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-3" style={{ backgroundColor: '#fff7ed' }}>
              <Table2 size={24} style={{ color: '#d55006' }} />
            </div>
            <p className="text-sm font-semibold text-gray-700">Nenhuma tabela criada ainda</p>
            <p className="text-xs text-gray-400 mt-1 max-w-sm">
              Cada empreendimento ganha a sua automaticamente. Aqui você cria uma avulsa ou
              importa um arquivo <strong>.xlsx</strong> já pronto, com a formatação do Excel.
            </p>
          </div>
        )}

        {!erro && total > 0 && visiveis.length === 0 && (
          <div className="py-20 flex flex-col items-center text-center">
            <Search size={24} className="text-gray-300 mb-3" />
            <p className="text-sm font-semibold text-gray-600">Nenhuma tabela para “{busca.trim()}”</p>
            <button onClick={() => setBusca('')} className="mt-2 text-xs font-semibold" style={{ color: '#d55006' }}>
              Limpar a busca
            </button>
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {visiveis.map((t) => (
            <CartaoTabela
              key={t.id}
              tabela={t}
              podeExcluir={podeEditar}
              onAbrir={() => setAberta({ id: t.id, nome: t.nome })}
              onExcluir={() => setParaExcluir(t)}
            />
          ))}
        </div>
      </div>

      {paraExcluir && (
        <ConfirmModal
          title="Excluir tabela"
          description={`"${paraExcluir.nome}" será apagada junto com todas as abas e fórmulas dela. Não há como desfazer.`}
          confirmLabel="Excluir"
          confirmColor="#dc2626"
          loading={excluindo}
          onConfirm={() => void handleExcluir()}
          onCancel={() => setParaExcluir(null)}
        />
      )}

      {criando && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center modal-backdrop"
          style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
          onClick={(e) => { if (e.target === e.currentTarget) setCriando(false); }}
        >
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-3">
            <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: '#e5e7eb' }}>
              <h2 className="font-questrial font-bold text-lg text-gray-900">Nova tabela</h2>
              <button onClick={() => setCriando(false)} className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-100">
                <X size={16} />
              </button>
            </div>
            <div className="px-5 py-4">
              <label className="text-xs font-semibold text-gray-500 block mb-1">Nome da tabela</label>
              <input
                autoFocus
                className="form-input"
                placeholder="Ex: Blue Forest — Comercial 02/2026"
                value={novoNome}
                onChange={(e) => setNovoNome(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleCriar(); }}
              />
            </div>
            <div className="flex items-center gap-3 px-5 py-4 border-t bg-gray-50 rounded-b-2xl" style={{ borderColor: '#e5e7eb' }}>
              <button onClick={() => setCriando(false)} className="px-4 py-2 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-200 transition-colors">
                Cancelar
              </button>
              <button
                onClick={handleCriar}
                disabled={!novoNome.trim() || salvandoNovo}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white transition-colors hover:opacity-90 disabled:opacity-50"
                style={{ backgroundColor: '#d55006' }}
              >
                {salvandoNovo ? 'Criando…' : 'Criar e abrir'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Um cartão da grade.
 *
 * O card inteiro abre a tabela, mas quem faz isso é um botão invisível esticado por cima
 * (`inset-0`), e não um `onClick` no `div`. A diferença aparece no teclado e no leitor de tela:
 * um `div` clicável não recebe foco nem anuncia que é acionável, e o único jeito de abrir uma
 * tabela era com o mouse. O conteúdo fica acima dele, sem capturar clique, e só o botão de
 * excluir volta a receber — assim o cartão tem exatamente duas paradas de tabulação, abrir e
 * excluir, em vez de nenhuma.
 */
function CartaoTabela({
  tabela,
  podeExcluir,
  onAbrir,
  onExcluir,
}: {
  tabela: TabelaEmpreendimentoResumo;
  podeExcluir: boolean;
  onAbrir: () => void;
  onExcluir: () => void;
}) {
  const vinculada = Boolean(tabela.empreendimentoNome);

  /**
   * A etiqueta do empreendimento só aparece quando ACRESCENTA algo.
   *
   * Oito das nove tabelas se chamam exatamente como o empreendimento delas, e a tela repetia o
   * mesmo texto duas vezes lado a lado, em laranja — era o que mais poluía a lista. Quando o
   * nome já diz, o vínculo é mostrado pelo ícone e pela legenda, sem repetir a frase.
   */
  const etiquetaAcrescenta =
    vinculada && !normalizado(tabela.nome).includes(normalizado(tabela.empreendimentoNome!));

  const autor = tabela.atualizadoPorNome ?? tabela.criadoPorNome;
  // "Atualizada por Beatriz MKT · criada por Beatriz MKT" dizia o nome duas vezes na mesma
  // linha. Quem criou só entra quando é outra pessoa — aí sim é informação.
  const outroCriador =
    tabela.criadoPorNome && tabela.criadoPorNome !== tabela.atualizadoPorNome
      ? tabela.criadoPorNome
      : null;

  return (
    <div
      className="group relative flex flex-col rounded-2xl border bg-white transition-shadow hover:shadow-md"
      style={{ borderColor: '#e5e7eb' }}
    >
      <button
        type="button"
        onClick={onAbrir}
        aria-label={`Abrir a tabela ${tabela.nome}`}
        title={tabela.nome}
        className="absolute inset-0 z-0 rounded-2xl cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400"
      />

      <div className="relative z-10 pointer-events-none flex flex-col flex-1 p-4">
        <div className="flex items-start gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: vinculada ? '#fff7ed' : '#f3f4f6' }}
          >
            {vinculada
              ? <Building2 size={17} style={{ color: '#d55006' }} />
              : <Table2 size={17} className="text-gray-500" />}
          </div>

          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-gray-800 leading-snug line-clamp-2">
              {tabela.nome}
            </p>
            <p className="text-[11px] text-gray-400 mt-1">
              {vinculada ? 'Do empreendimento' : 'Avulsa'}
            </p>
          </div>
        </div>

        {etiquetaAcrescenta && (
          <span
            className="mt-3 self-start inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full font-semibold"
            style={{ backgroundColor: '#fff7ed', color: '#c2410c' }}
          >
            <Building2 size={10} />
            {tabela.empreendimentoNome}
          </span>
        )}

        {/* `mt-auto` encosta o rodapé na base: os cartões da linha têm alturas de título
            diferentes, e sem isto a linha dos autores ficava desalinhada entre eles. */}
        <div className="mt-auto pt-4 flex items-center gap-2">
          {autor && (
            <div
              className="w-6 h-6 rounded-full flex items-center justify-center text-white flex-shrink-0"
              style={{ backgroundColor: '#d55006', fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: '9px', fontWeight: 700 }}
            >
              {iniciaisDe(autor)}
            </div>
          )}
          <p className="text-xs text-gray-400 truncate flex-1 min-w-0">
            {autor ?? 'Autor desconhecido'} · {formatRelativeTime(tabela.atualizadoEm)}
            {outroCriador && <span className="text-gray-300"> · criada por {outroCriador}</span>}
          </p>

          {podeExcluir && (
            <button
              type="button"
              onClick={onExcluir}
              aria-label={`Excluir a tabela ${tabela.nome}`}
              title="Excluir"
              // `pointer-events-auto` devolve o clique só a este botão; `opacity` some no
              // repouso mas volta no foco do teclado, senão ele seria inalcançável sem mouse.
              className="pointer-events-auto w-7 h-7 rounded-lg flex items-center justify-center text-gray-300 opacity-0 group-hover:opacity-100 focus-visible:opacity-100 hover:text-red-500 hover:bg-red-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-200 transition-all flex-shrink-0"
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
