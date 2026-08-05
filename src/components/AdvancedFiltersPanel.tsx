import { useEffect, useRef, useState } from 'react';
import { SlidersHorizontal, Bookmark, Trash2, X, Check } from 'lucide-react';
import { useStore } from '../store';
import { STAGES } from '../data';
import { ApiError } from '../api/client';

export function AdvancedFiltersPanel() {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const filterEtapa = useStore((s) => s.filterEtapa);
  const setFilterEtapa = useStore((s) => s.setFilterEtapa);
  const filterResponsavel = useStore((s) => s.filterResponsavel);
  const setFilterResponsavel = useStore((s) => s.setFilterResponsavel);
  const filterCanalOrigem = useStore((s) => s.filterCanalOrigem);
  const setFilterCanalOrigem = useStore((s) => s.setFilterCanalOrigem);
  const clearAdvancedFilters = useStore((s) => s.clearAdvancedFilters);

  const users = useStore((s) => s.users);
  const canaisOrigem = useStore((s) => s.canaisOrigem);
  const savedSearches = useStore((s) => s.savedSearches);
  const createSavedSearch = useStore((s) => s.createSavedSearch);
  const removeSavedSearch = useStore((s) => s.removeSavedSearch);
  const applySavedSearch = useStore((s) => s.applySavedSearch);

  const [savingName, setSavingName] = useState(false);
  const [nomeBusca, setNomeBusca] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const responsavelNomes = [...new Set(users.filter((u) => u.ativo).map((u) => u.nome))].sort();

  const activeCount = [filterEtapa !== 'all', filterResponsavel !== 'all', filterCanalOrigem !== 'all'].filter(Boolean).length;

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [open]);

  async function handleSaveSearch() {
    if (!nomeBusca.trim()) return;
    setSaving(true);
    setError('');
    try {
      await createSavedSearch(nomeBusca.trim());
      setNomeBusca('');
      setSavingName(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Não foi possível salvar a busca.');
    } finally {
      setSaving(false);
    }
  }

  async function handleRemoveSearch(id: string) {
    try {
      await removeSavedSearch(id);
    } catch {
      // falha ao excluir não é crítica — usuário pode tentar de novo
    }
  }

  return (
    <div className="relative flex-shrink-0" ref={panelRef}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl border transition-all"
        style={
          activeCount > 0
            ? { borderColor: '#d55006', color: '#d55006', backgroundColor: '#fff7ed' }
            : { borderColor: '#e5e7eb', color: '#6b7280' }
        }
      >
        <SlidersHorizontal size={14} />
        <span className="hidden sm:inline">Filtros avançados</span>
        {activeCount > 0 && (
          <span
            className="w-4 h-4 rounded-full text-white font-bold flex items-center justify-center"
            style={{ backgroundColor: '#d55006', fontSize: '10px' }}
          >
            {activeCount}
          </span>
        )}
      </button>

      {open && (
        <div
          className="absolute right-0 top-full mt-2 w-80 max-w-[90vw] bg-white rounded-2xl shadow-2xl border z-30 p-4"
          style={{ borderColor: '#e5e7eb' }}
        >
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400">Filtros avançados</h4>
            {activeCount > 0 && (
              <button onClick={clearAdvancedFilters} className="text-xs font-semibold" style={{ color: '#d55006' }}>
                Limpar
              </button>
            )}
          </div>

          <div className="space-y-3">
            <div>
              <label className="text-xs font-semibold text-gray-600 block mb-1">Etapa</label>
              <select
                className="form-input"
                value={filterEtapa}
                onChange={(e) => setFilterEtapa(e.target.value === 'all' ? 'all' : Number(e.target.value))}
              >
                <option value="all">Todas</option>
                {STAGES.map((s) => (
                  <option key={s.id} value={s.id}>{s.nome}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 block mb-1">Responsável</label>
              <select className="form-input" value={filterResponsavel} onChange={(e) => setFilterResponsavel(e.target.value)}>
                <option value="all">Todos</option>
                {responsavelNomes.map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 block mb-1">Canal de origem</label>
              <select className="form-input" value={filterCanalOrigem} onChange={(e) => setFilterCanalOrigem(e.target.value)}>
                <option value="all">Todos</option>
                {canaisOrigem.filter((c) => c.ativo).map((c) => (
                  <option key={c.id} value={c.nome}>{c.nome}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t" style={{ borderColor: '#e5e7eb' }}>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400">Buscas salvas</h4>
              {!savingName && (
                <button
                  onClick={() => setSavingName(true)}
                  className="text-xs font-semibold flex items-center gap-1"
                  style={{ color: '#d55006' }}
                >
                  <Bookmark size={12} /> Salvar atual
                </button>
              )}
            </div>

            {savingName && (
              <div className="flex items-center gap-1.5 mb-2">
                <input
                  autoFocus
                  className="form-input flex-1"
                  placeholder="Nome da busca..."
                  value={nomeBusca}
                  onChange={(e) => setNomeBusca(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveSearch();
                    if (e.key === 'Escape') setSavingName(false);
                  }}
                />
                <button
                  onClick={handleSaveSearch}
                  disabled={saving || !nomeBusca.trim()}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-white flex-shrink-0 disabled:opacity-50"
                  style={{ backgroundColor: '#d55006' }}
                >
                  <Check size={14} />
                </button>
                <button
                  onClick={() => { setSavingName(false); setNomeBusca(''); }}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 flex-shrink-0"
                >
                  <X size={14} />
                </button>
              </div>
            )}

            {error && <p className="text-xs mb-2" style={{ color: '#dc2626' }}>{error}</p>}

            <div className="space-y-1 max-h-40 overflow-y-auto">
              {savedSearches.length === 0 && !savingName && (
                <p className="text-xs text-gray-400 py-2">Nenhuma busca salva ainda.</p>
              )}
              {savedSearches.map((s) => (
                <div key={s.id} className="flex items-center gap-2 group">
                  <button
                    onClick={() => { applySavedSearch(s); setOpen(false); }}
                    className="flex-1 text-left text-xs font-medium px-2.5 py-1.5 rounded-lg hover:bg-gray-50 transition-colors truncate"
                    style={{ color: '#374151' }}
                  >
                    {s.nome}
                  </button>
                  <button
                    onClick={() => handleRemoveSearch(s.id)}
                    className="w-6 h-6 rounded-md flex items-center justify-center text-gray-300 hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all flex-shrink-0"
                    title="Excluir busca salva"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
