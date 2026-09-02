import { useEffect, useMemo, useState } from 'react';
import { Plus, Table2, Trash2, X, ChevronRight } from 'lucide-react';
import { useStore } from '../store';
import { useViewReady } from '../navLoading';
import { ViewLoader } from './ViewLoader';
import { tabelasEmpreendimentosApi } from '../api/endpoints';
import { ApiError } from '../api/client';
import { formatRelativeTime } from '../utils';
import { TabelaEmpreendimentoEditor } from './TabelaEmpreendimentoEditor';
import type { TabelaEmpreendimentoResumo } from '../types';

export function TabelasEmpreendimentosView() {
  const currentUser = useStore((s) => s.currentUser);
  const showToast = useStore((s) => s.showToast);
  const podeEditar = currentUser?.cargo === 'Diretora';

  const [tabelas, setTabelas] = useState<TabelaEmpreendimentoResumo[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState('');
  const [aberta, setAberta] = useState<{ id: string; nome: string } | null>(null);

  const [criando, setCriando] = useState(false);
  const [novoNome, setNovoNome] = useState('');
  const [salvandoNovo, setSalvandoNovo] = useState(false);
  const [excluindoId, setExcluindoId] = useState<string | null>(null);

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

  async function handleExcluir(t: TabelaEmpreendimentoResumo) {
    if (!window.confirm(`Excluir a tabela "${t.nome}"? Essa ação não pode ser desfeita.`)) return;
    setExcluindoId(t.id);
    try {
      await tabelasEmpreendimentosApi.remove(t.id);
      setTabelas((prev) => prev.filter((x) => x.id !== t.id));
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'Não foi possível excluir a tabela.');
    } finally {
      setExcluindoId(null);
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

  return (
    <div className="flex flex-col h-full">
      <div className="bg-white border-b px-4 md:px-6 py-4 flex-shrink-0" style={{ borderColor: '#e5e7eb' }}>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h1 className="font-questrial text-xl text-gray-800">Tabela de Empreendimentos</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {loading ? 'Carregando…' : `${tabelas.length} tabela(s) de custos e rentabilidade`}
            </p>
          </div>
          {podeEditar && (
            <button
              onClick={() => { setNovoNome(''); setCriando(true); }}
              className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white rounded-lg hover:opacity-90 flex-shrink-0"
              style={{ backgroundColor: '#d55006' }}
            >
              <Plus size={16} />
              <span className="hidden sm:inline">Nova tabela</span>
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4 md:p-6">
        {erro && <p className="text-sm text-red-500 mb-3">{erro}</p>}

        {!loading && ordenadas.length === 0 && !erro && (
          <div className="py-16 flex flex-col items-center text-center text-gray-400">
            <Table2 size={30} className="mb-3 opacity-40" />
            <p className="text-sm font-medium text-gray-500">Nenhuma tabela criada ainda</p>
            {podeEditar && <p className="text-xs mt-1">Clique em "Nova tabela" para começar.</p>}
          </div>
        )}

        <div className="grid gap-2 max-w-3xl">
          {ordenadas.map((t) => (
            <div
              key={t.id}
              className="group flex items-center gap-3 rounded-xl border bg-white px-4 py-3 hover:border-orange-300 transition-colors cursor-pointer"
              style={{ borderColor: '#e5e7eb' }}
              onClick={() => setAberta({ id: t.id, nome: t.nome })}
            >
              <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#fff7ed' }}>
                <Table2 size={16} style={{ color: '#d55006' }} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-gray-800 truncate">{t.nome}</p>
                <p className="text-xs text-gray-400 truncate">
                  {t.atualizadoPorNome ? `Atualizada por ${t.atualizadoPorNome} · ` : 'Atualizada '}
                  {formatRelativeTime(t.atualizadoEm)}
                  {t.criadoPorNome ? ` · criada por ${t.criadoPorNome}` : ''}
                </p>
              </div>
              {podeEditar && (
                <button
                  onClick={(e) => { e.stopPropagation(); handleExcluir(t); }}
                  disabled={excluindoId === t.id}
                  title="Excluir"
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors flex-shrink-0 disabled:opacity-50"
                >
                  <Trash2 size={14} />
                </button>
              )}
              <ChevronRight size={16} className="text-gray-300 flex-shrink-0" />
            </div>
          ))}
        </div>
      </div>

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
