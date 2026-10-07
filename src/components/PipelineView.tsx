import { useEffect, useState } from 'react';
import { Plus, Search, X, Zap, GripVertical, XCircle } from 'lucide-react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  useDraggable,
  useDroppable,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { useStore, useFilteredCorretores, type PipelineFunnel } from '../store';
import { useCorretoresQuery } from '../queries/corretores';
import { useViewReady } from '../navLoading';
import { ViewLoader } from './ViewLoader';
import { STAGES } from '../data';
import { ApiError } from '../api/client';
import { validateForStageMove, camposPendentesDoErro, mensagemEtapaBloqueada } from '../utils';
import { CorretorCard } from './CorretorCard';
import { AdvancedFiltersPanel } from './AdvancedFiltersPanel';
import { canCreateCorretor, canWriteCorretor, getHiddenPipelineStages } from '../permissions';
import type { Corretor, StageConfig } from '../types';

type FunnelFilter = PipelineFunnel;

const FUNNEL_CONFIG: Record<FunnelFilter, { label: string; stages: number[]; cor: string; desc: string }> = {
  'todos': { label: 'Todos os funis', stages: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10], cor: '#64748b', desc: 'Visão completa' },
  'pre-atendimento': { label: 'Pré-atendimento', stages: [1, 2, 3, 4, 5], cor: '#8b5cf6', desc: 'SDR — Etapas 1 a 5' },
  'treinamento': { label: 'Treinamento', stages: [6], cor: '#0d9488', desc: 'GR — Relacionamento ativo' },
  'venda': { label: 'Venda', stages: [7, 8, 9], cor: '#d55006', desc: 'GV — Etapas 7 a 9' },
  'pos-venda': { label: 'Pós-venda', stages: [10], cor: '#6366f1', desc: 'Fidelização — Etapa 10' },
};

const ALL_STAGE_COLUMNS = [
  [1], [2], [3], [4], [5], [6, 7], [8], [9], [10],
];

/**
 * Identificador da coluna "Perdidos" no arrastar-e-soltar.
 *
 * Perdido é STATUS do card, não etapa: o corretor guarda a etapa em que parou, e `motivoPerda`
 * registra por quê. Fazer disso uma etapa 11 criaria uma segunda fonte de verdade para "este
 * lead morreu" e os indicadores, que já contam por status, passariam a divergir do quadro.
 */
const COLUNA_PERDIDOS = 'coluna-perdidos';

export function PipelineView() {
  const setShowNewCorretorModal = useStore((s) => s.setShowNewCorretorModal);
  const filterTemperatura = useStore((s) => s.filterTemperatura);
  const setFilterTemperatura = useStore((s) => s.setFilterTemperatura);
  const searchQuery = useStore((s) => s.searchQuery);
  const setSearchQuery = useStore((s) => s.setSearchQuery);
  const filteredCorretores = useFilteredCorretores();
  const moveCorretor = useStore((s) => s.moveCorretor);
  const markAsLost = useStore((s) => s.markAsLost);
  const addInteracao = useStore((s) => s.addInteracao);
  const corretores = useStore((s) => s.corretores);
  const setCorretores = useStore((s) => s.setCorretores);
  const currentUser = useStore((s) => s.currentUser);
  const canCreate = canCreateCorretor(currentUser);
  const showToast = useStore((s) => s.showToast);

  const [activeId, setActiveId] = useState<string | null>(null);
  const funnelFilter = useStore((s) => s.pipelineFunnel);
  const setFunnelFilter = useStore((s) => s.setPipelineFunnel);

  // TanStack Query cuida do cache/memoização da listagem: evita rebuscar ao trocar de tela e
  // voltar dentro do staleTime, e revalida em background depois disso — a automação de tráfego
  // inclui leads no banco o tempo todo, então a lista não pode ficar parada por muito tempo.
  const { data: corretoresData, isLoading, error } = useCorretoresQuery();
  useViewReady(!isLoading);
  useEffect(() => {
    if (corretoresData) setCorretores(corretoresData);
  }, [corretoresData, setCorretores]);
  useEffect(() => {
    if (error) showToast(error instanceof ApiError ? error.message : 'Não foi possível atualizar o pipeline agora.', 'error');
  }, [error, showToast]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const activeCorretor = activeId ? corretores.find((l) => l.id === activeId) ?? null : null;
  const activeStage = activeCorretor ? STAGES.find((s) => s.id === activeCorretor.etapa) ?? null : null;

  const hiddenStageIds = getHiddenPipelineStages(currentUser);
  const visibleStageIds = FUNNEL_CONFIG[funnelFilter].stages.filter((id) => !hiddenStageIds.includes(id));

  /**
   * Perdido sai das colunas de etapa e vai só para a coluna "Perdidos". O card guarda a etapa
   * em que estava — é o `status` que o move, não a etapa — então, sem este recorte, ele
   * apareceria duas vezes no quadro.
   */
  const emAndamento = filteredCorretores.filter((l) => l.status !== 'perdido');
  const corretoresPerdidos = filteredCorretores.filter((l) => l.status === 'perdido');

  const corretoresByStage = STAGES.reduce<Record<number, Corretor[]>>((acc, stage) => {
    acc[stage.id] = emAndamento.filter((l) => l.etapa === stage.id);
    return acc;
  }, {});

  const visibleCorretores = emAndamento.filter((l) => visibleStageIds.includes(l.etapa));
  const totalActive = visibleCorretores.length;

  // Busca sem nenhum resultado em qualquer funil: cada coluna oferece "+ Adicionar corretor",
  // já abrindo o cadastro na etapa da coluna clicada.
  const showAddOnEmpty = canCreate && searchQuery.trim() !== '' && filteredCorretores.length === 0;

  const visibleColumns = ALL_STAGE_COLUMNS.filter((group) =>
    group.some((id) => visibleStageIds.includes(id))
  );

  /** Card sendo marcado como perdido — guarda o nome só para o texto do modal. */
  const [marcandoPerdido, setMarcandoPerdido] = useState<{ id: string; nome: string } | null>(null);

  function handleDragStart(event: DragStartEvent) {
    setActiveId(String(event.active.id));
  }

  async function handleDragEnd(event: DragEndEvent) {
    setActiveId(null);
    const { active, over } = event;
    if (!over) return;
    const overId = String(over.id);

    // Perdidos não é uma etapa: é o status do card, e exige motivo. Por isso abre o modal em
    // vez de mover — e vem antes da checagem de etapa, que não saberia o que fazer com ele.
    if (overId === COLUNA_PERDIDOS) {
      const alvo = corretores.find((l) => l.id === active.id);
      if (!alvo || alvo.status === 'perdido') return;
      if (!canWriteCorretor(currentUser, alvo)) return;
      setMarcandoPerdido({ id: alvo.id, nome: alvo.nomeCorretor });
      return;
    }

    if (!overId.startsWith('stage-')) return;
    const toEtapa = Number(overId.replace('stage-', ''));
    const corretor = corretores.find((l) => l.id === active.id);
    if (!corretor || corretor.etapa === toEtapa || isNaN(toEtapa)) return;
    if (!canWriteCorretor(currentUser, corretor)) return;

    // Antes o card só voltava pro lugar, sem explicar por quê. Agora o toast diz exatamente
    // quais campos faltam — tanto na checagem local quanto na recusa do backend.
    const nomeEtapa = STAGES.find((s) => s.id === toEtapa)?.nome ?? `Etapa ${toEtapa}`;
    const pendentes = validateForStageMove(corretor, toEtapa);
    if (pendentes.length > 0) {
      showToast(mensagemEtapaBloqueada(nomeEtapa, pendentes), 'error');
      return;
    }

    try {
      await moveCorretor(String(active.id), toEtapa);
      await addInteracao(String(active.id), {
        data: new Date().toISOString(),
        tipo: 'nota',
        resumo: `Movido para etapa ${toEtapa}: ${nomeEtapa}`,
        responsavel: 'Sistema',
        etapa: corretor.etapa,
      });
    } catch (err) {
      const campos = camposPendentesDoErro(err);
      showToast(
        campos.length > 0
          ? mensagemEtapaBloqueada(nomeEtapa, campos)
          : err instanceof ApiError ? err.message : 'Não foi possível mover o corretor de etapa.',
        'error'
      );
    }
  }

  if (isLoading) return <ViewLoader label="Carregando pipeline…" />;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="bg-white border-b px-4 md:px-6 py-4 flex-shrink-0" style={{ borderColor: '#e5e7eb' }}>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 md:gap-4">
          <div>
            <h1 className="font-questrial text-xl text-gray-800" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
              Pipeline de Vendas
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {totalActive} corretores {funnelFilter !== 'todos' ? `no funil ${FUNNEL_CONFIG[funnelFilter].label}` : 'ativos no funil'}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="relative flex-1 sm:flex-none">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar corretor ou cliente..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-4 py-2 text-sm border rounded-xl w-full sm:w-56 sm:focus:w-72 transition-all focus:outline-none"
                style={{ borderColor: '#e5e7eb' }}
                onFocus={(e) => (e.target.style.borderColor = '#d55006')}
                onBlur={(e) => (e.target.style.borderColor = '#e5e7eb')}
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2">
                  <X size={14} className="text-gray-400 hover:text-gray-600" />
                </button>
              )}
            </div>

            <AdvancedFiltersPanel />

            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-1 rounded-xl p-1 overflow-x-auto" style={{ backgroundColor: '#f3f4f6' }}>
                {(['all', 'quente', 'morno', 'frio'] as const).map((t) => {
                  const labels = { all: 'Todos', quente: '🔥', morno: '🌤', frio: '❄️' };
                  const fullLabels = { all: 'Todos', quente: 'Quente', morno: 'Morno', frio: 'Frio' };
                  const isActive = filterTemperatura === t;
                  return (
                    <button
                      key={t}
                      onClick={() => setFilterTemperatura(t)}
                      title={fullLabels[t]}
                      className="px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex-shrink-0"
                      style={
                        isActive
                          ? { backgroundColor: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', color: '#1e1e1e' }
                          : { color: '#6b7280' }
                      }
                    >
                      {labels[t]} {t !== 'all' && <span className="ml-0.5 hidden sm:inline">{fullLabels[t]}</span>}
                    </button>
                  );
                })}
              </div>

              {canCreate && (
                <button
                  onClick={() => setShowNewCorretorModal(true)}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white rounded-xl transition-colors hover:opacity-90 flex-shrink-0"
                  style={{ backgroundColor: '#d55006' }}
                >
                  <Plus size={16} />
                  <span className="hidden sm:inline">Novo Corretor</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Funnel tabs */}
      <div className="bg-white border-b flex-shrink-0" style={{ borderColor: '#e5e7eb' }}>
        <div className="px-4 md:px-6 flex items-center gap-1 overflow-x-auto">
          {(Object.entries(FUNNEL_CONFIG) as [FunnelFilter, typeof FUNNEL_CONFIG[FunnelFilter]][])
            .filter(([, cfg]) => cfg.stages.some((id) => !hiddenStageIds.includes(id)))
            .map(([key, cfg]) => {
            const isActive = funnelFilter === key;
            const count = key === 'todos'
              ? filteredCorretores.filter((l) => !hiddenStageIds.includes(l.etapa)).length
              : filteredCorretores.filter((l) => cfg.stages.includes(l.etapa)).length;
            return (
              <button
                key={key}
                onClick={() => setFunnelFilter(key)}
                className="flex items-center gap-2 px-4 py-3 text-xs font-semibold whitespace-nowrap border-b-2 transition-all"
                style={{
                  borderColor: isActive ? cfg.cor : 'transparent',
                  color: isActive ? cfg.cor : '#6b7280',
                }}
              >
                {cfg.label}
                <span
                  className="px-1.5 py-0.5 rounded-full text-white leading-none"
                  style={{ backgroundColor: isActive ? cfg.cor : '#d1d5db', fontSize: '10px' }}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* DnD hint */}
      <div className="hidden md:block px-6 py-2 flex-shrink-0 border-b" style={{ borderColor: '#e6e3de', backgroundColor: '#fff' }}>
        <p className="text-xs text-gray-400 flex items-center gap-1.5">
          <GripVertical size={12} />
          Passe o mouse sobre um card e arraste pelo ícone para mover entre etapas — ou clique no card para abrir os detalhes.
        </p>
      </div>

      {/* Kanban */}
      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="flex-1 overflow-hidden">
          <div className="h-full flex items-start gap-0 px-3 md:px-4 pt-3 md:pt-5 pb-4 overflow-x-auto overflow-y-hidden">
            {visibleColumns.map((group) => {
              const filteredGroup = group.filter((id) => visibleStageIds.includes(id));

              if (filteredGroup.length === 0) return null;

              if (filteredGroup.length === 1) {
                const stageId = filteredGroup[0];
                const stage = STAGES.find((s) => s.id === stageId)!;
                return (
                  <DroppableStageColumn
                    key={stageId}
                    stage={stage}
                    corretores={corretoresByStage[stageId] ?? []}
                    showAddButton={showAddOnEmpty}
                    onAdd={() => setShowNewCorretorModal(true, stageId)}
                  />
                );
              }

              // Parallel stages 6 & 7
              const [id6, id7] = filteredGroup;
              const stage6 = STAGES.find((s) => s.id === id6)!;
              const stage7 = STAGES.find((s) => s.id === id7)!;

              return (
                <div key="parallel-67" className="flex-shrink-0 flex gap-0 relative mr-3">
                  <div
                    className="absolute -top-3 left-0 right-0 h-3 rounded-t-lg flex items-center justify-center"
                    style={{ backgroundColor: '#0d9488' }}
                  >
                    <div className="flex items-center gap-1">
                      <Zap size={8} color="white" />
                      <span className="text-white font-bold tracking-widest" style={{ fontSize: '8px' }}>PARALELO</span>
                      <Zap size={8} color="white" />
                    </div>
                  </div>
                  <DroppableStageColumn
                    stage={stage6}
                    corretores={corretoresByStage[id6] ?? []}
                    noBorderRight
                    showAddButton={showAddOnEmpty}
                    onAdd={() => setShowNewCorretorModal(true, id6)}
                  />
                  <DroppableStageColumn
                    stage={stage7}
                    corretores={corretoresByStage[id7] ?? []}
                    noBorderLeft
                    showAddButton={showAddOnEmpty}
                    onAdd={() => setShowNewCorretorModal(true, id7)}
                  />
                </div>
              );
            })}

            {/* Sempre visível, em qualquer funil e para qualquer perfil. */}
            <ColunaPerdidos corretores={corretoresPerdidos} />
          </div>
        </div>

        <DragOverlay>
          {activeCorretor && activeStage ? (
            <div style={{ opacity: 0.9, transform: 'rotate(2deg)' }}>
              <CorretorCard corretor={activeCorretor} stage={activeStage} />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {marcandoPerdido && (
        <MotivoPerdaModal
          nome={marcandoPerdido.nome}
          onClose={() => setMarcandoPerdido(null)}
          onConfirm={async (motivo) => {
            await markAsLost(marcandoPerdido.id, motivo);
            setMarcandoPerdido(null);
          }}
        />
      )}
    </div>
  );
}

function DroppableStageColumn({
  stage,
  corretores,
  noBorderRight,
  noBorderLeft,
  showAddButton,
  onAdd,
}: {
  stage: StageConfig;
  corretores: Corretor[];
  noBorderRight?: boolean;
  noBorderLeft?: boolean;
  showAddButton?: boolean;
  onAdd?: () => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `stage-${stage.id}` });

  return (
    <div
      ref={setNodeRef}
      className="flex-shrink-0 flex flex-col mr-3"
      style={{
        width: 270,
        backgroundColor: isOver ? stage.corBg : '#f8f9fa',
        border: isOver ? `2px solid ${stage.cor}` : '1px solid #e9ecef',
        borderRight: noBorderRight ? 'none' : undefined,
        borderLeft: noBorderLeft ? 'none' : undefined,
        borderRadius: noBorderRight ? '12px 0 0 12px' : noBorderLeft ? '0 12px 12px 0' : '12px',
        maxHeight: 'calc(100vh - 225px)',
        transition: 'background-color 0.15s, border-color 0.15s',
      }}
    >
      <div className="px-3 py-3 border-b flex-shrink-0" style={{ borderColor: '#e9ecef' }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: stage.cor }} />
            <span className="text-xs font-bold" style={{ color: '#1e1e1e', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
              {stage.nome}
            </span>
          </div>
          <span
            className="text-xs px-2 py-0.5 rounded-full font-bold"
            style={{
              backgroundColor: corretores.length > 0 ? stage.cor : '#e9ecef',
              color: corretores.length > 0 ? '#fff' : '#9ca3af',
            }}
          >
            {corretores.length}
          </span>
        </div>
        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
          {stage.responsavel.map((r) => (
            <span key={r} className="text-xs px-1.5 py-0.5 rounded font-medium" style={{ backgroundColor: '#e9ecef', color: '#6b7280' }}>
              {r}
            </span>
          ))}
          <span className="text-xs ml-auto" style={{ color: '#9ca3af' }}>
            SLA: {stage.slaLabel}
          </span>
        </div>

        {isOver && (
          <div className="mt-2 text-xs font-semibold text-center py-1 rounded-lg" style={{ color: stage.cor, backgroundColor: `${stage.cor}15` }}>
            Soltar aqui
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {showAddButton && corretores.length === 0 && !isOver && (
          <button
            onClick={onAdd}
            className="w-full flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg border border-dashed transition-colors hover:opacity-80"
            style={{ color: stage.cor, borderColor: stage.cor, backgroundColor: stage.corBg }}
          >
            <Plus size={14} />
            Adicionar corretor
          </button>
        )}
        {corretores.length === 0 && !isOver ? (
          <div className="py-8 text-center">
            <div className="text-2xl mb-2 opacity-20">○</div>
            <p className="text-xs" style={{ color: '#9ca3af' }}>Nenhum corretor</p>
          </div>
        ) : (
          corretores.map((corretor) => (
            <DraggableCorretorCard key={corretor.id} corretor={corretor} stage={stage} />
          ))
        )}
      </div>
    </div>
  );
}

function DraggableCorretorCard({ corretor, stage }: { corretor: Corretor; stage: StageConfig }) {
  const currentUser = useStore((s) => s.currentUser);
  const isReadOnly = !canWriteCorretor(currentUser, corretor);
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: corretor.id, disabled: isReadOnly });

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      className="group relative"
      style={{
        transform: transform ? CSS.Translate.toString(transform) : undefined,
        opacity: isDragging ? 0 : 1,
        zIndex: isDragging ? 50 : undefined,
      }}
    >
      {!isReadOnly && (
        <button
          {...listeners}
          className="absolute top-2 right-2 z-10 w-6 h-6 rounded-md flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:bg-gray-100 cursor-grab active:cursor-grabbing"
          style={{ color: '#9ca3af' }}
          onClick={(e) => e.stopPropagation()}
          title="Arrastar para outra etapa"
        >
          <GripVertical size={13} />
        </button>
      )}
      <CorretorCard corretor={corretor} stage={stage} />
    </div>
  );
}

/**
 * Coluna "Perdidos": leads que saíram do funil, com o motivo registrado.
 *
 * Fica fora do filtro de funil e do recorte por perfil de propósito — todo mundo vê, porque
 * saber o que se perdeu é tão importante quanto ver o que está em andamento.
 */
function ColunaPerdidos({ corretores }: { corretores: Corretor[] }) {
  const { setNodeRef, isOver } = useDroppable({ id: COLUNA_PERDIDOS });
  const setSelectedCorretor = useStore((s) => s.setSelectedCorretor);

  return (
    <div ref={setNodeRef} className="flex-shrink-0 flex flex-col mr-3" style={{ width: 300 }}>
      <div
        className="rounded-t-xl px-3 py-2.5 border border-b-0"
        style={{ borderColor: isOver ? '#dc2626' : '#e5e7eb', backgroundColor: isOver ? '#fef2f2' : '#fff' }}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: '#dc2626' }} />
            <h3 className="text-sm font-semibold text-gray-800 truncate">Perdidos</h3>
          </div>
          <span
            className="text-xs font-bold px-2 py-0.5 rounded-full flex-shrink-0"
            style={{ backgroundColor: '#fee2e2', color: '#b91c1c' }}
          >
            {corretores.length}
          </span>
        </div>
        <p className="text-xs text-gray-400 mt-1">Arraste um card aqui para registrar a perda</p>
      </div>

      <div
        className="flex-1 overflow-y-auto rounded-b-xl border p-2 space-y-2"
        style={{
          borderColor: isOver ? '#dc2626' : '#e5e7eb',
          backgroundColor: isOver ? '#fef2f2' : '#fafafa',
          minHeight: 180,
        }}
      >
        {corretores.length === 0 ? (
          <p className="text-xs text-gray-400 text-center py-10">Nenhum corretor perdido</p>
        ) : (
          corretores.map((c) => (
            <button
              key={c.id}
              onClick={() => setSelectedCorretor(c.id)}
              className="w-full text-left bg-white rounded-xl border p-2.5 hover:shadow-sm transition-shadow"
              style={{ borderColor: '#e5e7eb' }}
            >
              <p className="text-sm font-semibold text-gray-700 truncate">{c.nomeCorretor}</p>
              <p className="text-xs text-gray-400 truncate">{c.imobiliaria || 'Sem imobiliária'}</p>
              {c.motivoPerda && (
                <p className="text-xs mt-1.5 line-clamp-2" style={{ color: '#b91c1c' }} title={c.motivoPerda}>
                  {c.motivoPerda}
                </p>
              )}
            </button>
          ))
        )}
      </div>
    </div>
  );
}

/** Pede o motivo antes de marcar o card como perdido — o backend também exige. */
function MotivoPerdaModal({ nome, onConfirm, onClose }: {
  nome: string;
  onConfirm: (motivo: string) => Promise<void>;
  onClose: () => void;
}) {
  const [motivo, setMotivo] = useState('');
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState(false);

  async function confirmar() {
    if (!motivo.trim()) {
      setErro('Informe o motivo da perda.');
      return;
    }
    setSalvando(true);
    setErro('');
    try {
      await onConfirm(motivo.trim());
    } catch (err) {
      setErro(err instanceof ApiError ? err.message : 'Não foi possível marcar como perdido.');
      setSalvando(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center modal-backdrop"
      style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-2 sm:mx-4 flex flex-col">
        <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b" style={{ borderColor: '#e5e7eb' }}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: '#fef2f2' }}>
              <XCircle size={18} style={{ color: '#dc2626' }} />
            </div>
            <div>
              <h2 className="font-questrial font-bold text-lg text-gray-900">Marcar como perdido</h2>
              <p className="text-xs text-gray-400 truncate">{nome}</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-100">
            <X size={16} />
          </button>
        </div>

        <div className="px-4 sm:px-6 py-4 space-y-3">
          <label className="text-xs font-semibold text-gray-600 block">
            Motivo da perda<span className="text-red-400 ml-0.5">*</span>
          </label>
          <textarea
            autoFocus
            className={`form-input resize-none ${erro ? 'border-red-400' : ''}`}
            style={{ minHeight: 90 }}
            placeholder="Ex.: não respondeu aos contatos, optou por outra construtora, saiu do mercado..."
            value={motivo}
            onChange={(e) => { setMotivo(e.target.value); setErro(''); }}
          />
          {erro && <p className="text-xs text-red-500">{erro}</p>}
          <p className="text-xs text-gray-400">
            O card sai do funil e passa a aparecer na coluna Perdidos, com este motivo.
          </p>
        </div>

        <div className="flex items-center gap-3 px-4 sm:px-6 py-4 border-t bg-gray-50 rounded-b-2xl" style={{ borderColor: '#e5e7eb' }}>
          <button onClick={onClose} className="px-5 py-2.5 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-200">
            Cancelar
          </button>
          <button
            onClick={confirmar}
            disabled={salvando}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60"
            style={{ backgroundColor: '#dc2626' }}
          >
            {salvando ? 'Salvando...' : 'Confirmar perda'}
          </button>
        </div>
      </div>
    </div>
  );
}
