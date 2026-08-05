import { useState } from 'react';
import { Plus, Search, X, Zap, GripVertical } from 'lucide-react';
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
import { useStore, useFilteredCorretores } from '../store';
import { STAGES } from '../data';
import { ApiError } from '../api/client';
import { CorretorCard } from './CorretorCard';
import { AdvancedFiltersPanel } from './AdvancedFiltersPanel';
import type { Corretor, StageConfig } from '../types';

type FunnelFilter = 'todos' | 'pre-atendimento' | 'treinamento' | 'venda' | 'pos-venda';

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

export function PipelineView() {
  const setShowNewCorretorModal = useStore((s) => s.setShowNewCorretorModal);
  const filterTemperatura = useStore((s) => s.filterTemperatura);
  const setFilterTemperatura = useStore((s) => s.setFilterTemperatura);
  const searchQuery = useStore((s) => s.searchQuery);
  const setSearchQuery = useStore((s) => s.setSearchQuery);
  const filteredCorretores = useFilteredCorretores();
  const moveCorretor = useStore((s) => s.moveCorretor);
  const addInteracao = useStore((s) => s.addInteracao);
  const corretores = useStore((s) => s.corretores);
  const currentUser = useStore((s) => s.currentUser);
  const isReadOnly = currentUser?.cargo === 'Marketing';

  const [activeId, setActiveId] = useState<string | null>(null);
  const [funnelFilter, setFunnelFilter] = useState<FunnelFilter>('todos');

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const activeCorretor = activeId ? corretores.find((l) => l.id === activeId) ?? null : null;
  const activeStage = activeCorretor ? STAGES.find((s) => s.id === activeCorretor.etapa) ?? null : null;

  const visibleStageIds = FUNNEL_CONFIG[funnelFilter].stages;

  const corretoresByStage = STAGES.reduce<Record<number, Corretor[]>>((acc, stage) => {
    acc[stage.id] = filteredCorretores.filter((l) => l.etapa === stage.id);
    return acc;
  }, {});

  const visibleCorretores = filteredCorretores.filter((l) => visibleStageIds.includes(l.etapa));
  const totalActive = visibleCorretores.length;

  const visibleColumns = ALL_STAGE_COLUMNS.filter((group) =>
    group.some((id) => visibleStageIds.includes(id))
  );

  function handleDragStart(event: DragStartEvent) {
    setActiveId(String(event.active.id));
  }

  async function handleDragEnd(event: DragEndEvent) {
    setActiveId(null);
    if (isReadOnly) return;
    const { active, over } = event;
    if (!over) return;
    const overId = String(over.id);
    if (!overId.startsWith('stage-')) return;
    const toEtapa = Number(overId.replace('stage-', ''));
    const corretor = corretores.find((l) => l.id === active.id);
    if (!corretor || corretor.etapa === toEtapa || isNaN(toEtapa)) return;

    try {
      await moveCorretor(String(active.id), toEtapa);
      await addInteracao(String(active.id), {
        data: new Date().toISOString(),
        tipo: 'nota',
        resumo: `Movido para etapa ${toEtapa}: ${STAGES.find((s) => s.id === toEtapa)?.nome}`,
        responsavel: 'Sistema',
        etapa: corretor.etapa,
      });
    } catch (err) {
      alert(err instanceof ApiError ? err.message : 'Não foi possível mover o corretor de etapa.');
    }
  }

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

              {!isReadOnly && (
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
          {(Object.entries(FUNNEL_CONFIG) as [FunnelFilter, typeof FUNNEL_CONFIG[FunnelFilter]][]).map(([key, cfg]) => {
            const isActive = funnelFilter === key;
            const count = key === 'todos'
              ? filteredCorretores.length
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
                    isReadOnly={isReadOnly}
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
                    isReadOnly={isReadOnly}
                  />
                  <DroppableStageColumn
                    stage={stage7}
                    corretores={corretoresByStage[id7] ?? []}
                    noBorderLeft
                    isReadOnly={isReadOnly}
                  />
                </div>
              );
            })}
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
    </div>
  );
}

function DroppableStageColumn({
  stage,
  corretores,
  noBorderRight,
  noBorderLeft,
  isReadOnly,
}: {
  stage: StageConfig;
  corretores: Corretor[];
  noBorderRight?: boolean;
  noBorderLeft?: boolean;
  isReadOnly?: boolean;
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
        {corretores.length === 0 && !isOver ? (
          <div className="py-8 text-center">
            <div className="text-2xl mb-2 opacity-20">○</div>
            <p className="text-xs" style={{ color: '#9ca3af' }}>Nenhum corretor</p>
          </div>
        ) : (
          corretores.map((corretor) => (
            <DraggableCorretorCard key={corretor.id} corretor={corretor} stage={stage} isReadOnly={isReadOnly} />
          ))
        )}
      </div>
    </div>
  );
}

function DraggableCorretorCard({ corretor, stage, isReadOnly }: { corretor: Corretor; stage: StageConfig; isReadOnly?: boolean }) {
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
