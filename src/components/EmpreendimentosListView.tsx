import { useEffect, useState } from 'react';
import { Plus, Building2, MapPin, Layers, CheckCircle2 } from 'lucide-react';
import { useStore } from '../store';
import { useViewReady } from '../navLoading';
import type { Empreendimento } from '../types';
import { EmpreendimentoFormModal } from './EmpreendimentoFormModal';
import { EmpreendimentoDetailView } from './EmpreendimentoDetailView';

export function EmpreendimentosListView() {
  const currentUser = useStore((s) => s.currentUser);
  const isReadOnly = currentUser?.cargo === 'Marketing';
  const empreendimentos = useStore((s) => s.empreendimentos);
  const ensureEmpreendimentosLoaded = useStore((s) => s.ensureEmpreendimentosLoaded);

  const [ready, setReady] = useState(false);
  useViewReady(ready);
  useEffect(() => {
    ensureEmpreendimentosLoaded().catch(() => undefined).finally(() => setReady(true));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [formOpen, setFormOpen] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);

  if (detailId) {
    return <EmpreendimentoDetailView id={detailId} onClose={() => setDetailId(null)} />;
  }

  return (
    <div className="h-full overflow-y-auto" style={{ backgroundColor: '#e6e3de' }}>
      <div className="max-w-6xl mx-auto px-4 md:px-6 py-6 md:py-8 space-y-6">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
              Empreendimentos
            </h1>
            <p className="text-sm text-gray-500 mt-1">{empreendimentos.length} empreendimento(s) cadastrado(s)</p>
          </div>
          {!isReadOnly && (
            <button
              onClick={() => setFormOpen(true)}
              className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white rounded-xl hover:opacity-90 transition-colors flex-shrink-0"
              style={{ backgroundColor: '#d55006' }}
            >
              <Plus size={16} /> Novo empreendimento
            </button>
          )}
        </div>

        {empreendimentos.length === 0 ? (
          <div className="bg-white rounded-2xl border flex flex-col items-center justify-center text-center py-16 gap-3" style={{ borderColor: '#e5e7eb' }}>
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ backgroundColor: '#fff7ed', color: '#d55006' }}>
              <Building2 size={22} />
            </div>
            <p className="text-sm font-semibold text-gray-700">Nenhum empreendimento cadastrado ainda</p>
            <p className="text-xs text-gray-400 max-w-xs">Cadastre o primeiro empreendimento para começar a gerenciar as unidades.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {empreendimentos.map((e) => (
              <EmpreendimentoCard key={e.id} empreendimento={e} onOpen={() => setDetailId(e.id)} />
            ))}
          </div>
        )}
      </div>

      {formOpen && <EmpreendimentoFormModal onClose={() => setFormOpen(false)} />}
    </div>
  );
}

function EmpreendimentoCard({ empreendimento, onOpen }: { empreendimento: Empreendimento; onOpen: () => void }) {
  return (
    <button
      onClick={onOpen}
      className="text-left rounded-2xl border overflow-hidden bg-white hover:shadow-lg transition-shadow flex flex-col"
      style={{ borderColor: '#e5e7eb' }}
    >
      <div className="relative w-full" style={{ aspectRatio: '16 / 9', backgroundColor: '#1e1e1e' }}>
        {empreendimento.imagemCapaUrl ? (
          <img src={empreendimento.imagemCapaUrl} alt={empreendimento.nome} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-500">
            <Building2 size={28} />
          </div>
        )}
      </div>
      <div className="p-4 flex-1 flex flex-col gap-2">
        <p className="font-semibold text-gray-900 font-questrial truncate">{empreendimento.nome}</p>
        {empreendimento.cidade && (
          <p className="text-xs text-gray-500 flex items-center gap-1.5 truncate">
            <MapPin size={12} className="flex-shrink-0" /> {empreendimento.cidade}{empreendimento.uf ? ` - ${empreendimento.uf}` : ''}
          </p>
        )}
        <div className="flex items-center gap-3 mt-1 pt-2 border-t" style={{ borderColor: '#f3f4f6' }}>
          <span className="flex items-center gap-1.5 text-xs font-semibold text-gray-600">
            <Layers size={12} /> {empreendimento.totalUnidades} unidade(s)
          </span>
          <span className="flex items-center gap-1.5 text-xs font-semibold" style={{ color: '#15803d' }}>
            <CheckCircle2 size={12} /> {empreendimento.unidadesDisponiveis} disponível(is)
          </span>
        </div>
      </div>
    </button>
  );
}
