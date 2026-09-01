import { useState } from 'react';
import { v4 as uuid } from 'uuid';
import {
  DndContext, DragOverlay, closestCenter, PointerSensor, useSensor, useSensors,
  useDraggable, useDroppable,
} from '@dnd-kit/core';
import type { DragEndEvent, DragStartEvent } from '@dnd-kit/core';
import { SortableContext, useSortable, arrayMove, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  ArrowLeft, Eye, Save, ChevronRight, Heading1, Type, Image as ImageIcon,
  MousePointerClick, Minus, MoveVertical, GripVertical, Copy, Trash2, Upload,
  AlignLeft, AlignCenter, AlignRight, Sparkles, Video,
} from 'lucide-react';
import { useStore } from '../store';
import { ApiError } from '../api/client';
import { emailApi } from '../api/endpoints';
import type { EmailBlock, EmailBlockType, EmailTemplate, Alinhamento } from '../types';
import { EmailBlockRenderer } from './EmailBlockRenderer';
import { EmailPreviewModal } from './EmailPreviewModal';
import { FileDropzone } from './FileDropzone';

function extractYouTubeThumb(url: string): string | null {
  try {
    const u = new URL(url);
    let id: string | null = null;
    if (u.hostname === 'youtu.be') id = u.pathname.slice(1);
    else if (u.hostname.endsWith('youtube.com')) {
      id = u.searchParams.get('v') ?? (u.pathname.startsWith('/embed/') ? u.pathname.split('/')[2] : null);
    }
    return id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : null;
  } catch {
    return null;
  }
}

function extractVimeoId(url: string): string | null {
  try {
    const u = new URL(url);
    if (!u.hostname.endsWith('vimeo.com')) return null;
    return u.pathname.match(/(\d+)/)?.[1] ?? null;
  } catch {
    return null;
  }
}

async function fetchVimeoThumb(id: string): Promise<string | null> {
  try {
    const res = await fetch(`https://vimeo.com/api/oembed.json?url=${encodeURIComponent(`https://vimeo.com/${id}`)}`);
    if (!res.ok) return null;
    const data = await res.json();
    return typeof data.thumbnail_url === 'string' ? data.thumbnail_url : null;
  } catch {
    return null;
  }
}

interface BlockDef {
  type: EmailBlockType;
  label: string;
  icon: React.ElementType;
  create: () => EmailBlock;
}

const BLOCK_DEFS: BlockDef[] = [
  { type: 'heading', label: 'Título', icon: Heading1, create: () => ({ id: uuid(), type: 'heading', texto: 'Novo título', tamanho: 26, cor: '#1e1e1e', alinhamento: 'left' }) },
  { type: 'text', label: 'Texto', icon: Type, create: () => ({ id: uuid(), type: 'text', texto: 'Escreva seu texto aqui...', tamanho: 15, cor: '#4b5563', alinhamento: 'left' }) },
  { type: 'image', label: 'Imagem', icon: ImageIcon, create: () => ({ id: uuid(), type: 'image', url: '', alt: '', largura: 100, alinhamento: 'center' }) },
  { type: 'video', label: 'Vídeo', icon: Video, create: () => ({ id: uuid(), type: 'video', url: '', posterUrl: '', legenda: 'Assistir vídeo', largura: 100, alinhamento: 'center' }) },
  { type: 'button', label: 'Botão', icon: MousePointerClick, create: () => ({ id: uuid(), type: 'button', texto: 'Saiba mais', url: '', corFundo: '#d55006', corTexto: '#ffffff', alinhamento: 'center' }) },
  { type: 'divider', label: 'Divisória', icon: Minus, create: () => ({ id: uuid(), type: 'divider', cor: '#e5e7eb' }) },
  { type: 'spacer', label: 'Espaço', icon: MoveVertical, create: () => ({ id: uuid(), type: 'spacer', altura: 24 }) },
];

interface EmailBuilderProps {
  initialTemplate: EmailTemplate | null;
  onClose: () => void;
  onSaved: (template: EmailTemplate) => void;
  onRequestSend: (template: EmailTemplate) => void;
}

export function EmailBuilder({ initialTemplate, onClose, onSaved, onRequestSend }: EmailBuilderProps) {
  const saveEmailTemplate = useStore((s) => s.saveEmailTemplate);

  const [nome, setNome] = useState(initialTemplate?.nome ?? 'Novo e-mail');
  const [assunto, setAssunto] = useState(initialTemplate?.assunto ?? '');
  const [preheader, setPreheader] = useState(initialTemplate?.preheader ?? '');
  const [blocks, setBlocks] = useState<EmailBlock[]>(initialTemplate?.blocks ?? []);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [activeDrag, setActiveDrag] = useState<
    | { kind: 'palette'; blockType: EmailBlockType }
    | { kind: 'block'; block: EmailBlock }
    | null
  >(null);
  const [savedSnapshot, setSavedSnapshot] = useState(() =>
    JSON.stringify({
      nome: initialTemplate?.nome ?? 'Novo e-mail',
      assunto: initialTemplate?.assunto ?? '',
      preheader: initialTemplate?.preheader ?? '',
      blocks: initialTemplate?.blocks ?? [],
    })
  );

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const selectedBlock = blocks.find((b) => b.id === selectedBlockId) ?? null;

  function buildTemplate(): EmailTemplate {
    const now = new Date().toISOString();
    return {
      id: initialTemplate?.id ?? uuid(),
      nome: nome.trim() || 'Sem título',
      assunto,
      preheader,
      blocks,
      criadoEm: initialTemplate?.criadoEm ?? now,
      atualizadoEm: now,
    };
  }

  function currentSnapshot() {
    return JSON.stringify({ nome, assunto, preheader, blocks });
  }

  async function handleSave() {
    try {
      const saved = await saveEmailTemplate(buildTemplate());
      setSavedSnapshot(currentSnapshot());
      onSaved(saved);
    } catch (err) {
      alert(err instanceof ApiError ? err.message : 'Não foi possível salvar o modelo.');
    }
  }

  async function handleGoToSend() {
    try {
      const saved = await saveEmailTemplate(buildTemplate());
      setSavedSnapshot(currentSnapshot());
      onRequestSend(saved);
    } catch (err) {
      alert(err instanceof ApiError ? err.message : 'Não foi possível salvar o modelo.');
    }
  }

  function handleClose() {
    if (currentSnapshot() !== savedSnapshot) {
      if (!window.confirm('Você tem alterações não salvas neste e-mail. Deseja sair mesmo assim?')) return;
    }
    onClose();
  }

  function updateSelectedBlock(patch: Record<string, unknown>) {
    if (!selectedBlockId) return;
    setBlocks((prev) => prev.map((b) => (b.id === selectedBlockId ? ({ ...b, ...patch } as EmailBlock) : b)));
  }

  function deleteBlock(id: string) {
    setBlocks((prev) => prev.filter((b) => b.id !== id));
    if (selectedBlockId === id) setSelectedBlockId(null);
  }

  function duplicateBlock(id: string) {
    setBlocks((prev) => {
      const index = prev.findIndex((b) => b.id === id);
      if (index === -1) return prev;
      const copy = { ...prev[index], id: uuid() };
      const next = [...prev];
      next.splice(index + 1, 0, copy);
      return next;
    });
  }

  function handleDragStart(event: DragStartEvent) {
    const data = event.active.data.current as { fromPalette?: boolean; blockType?: EmailBlockType } | undefined;
    if (data?.fromPalette && data.blockType) {
      setActiveDrag({ kind: 'palette', blockType: data.blockType });
    } else {
      const block = blocks.find((b) => b.id === event.active.id);
      if (block) setActiveDrag({ kind: 'block', block });
    }
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveDrag(null);
    if (!over) return;

    const data = active.data.current as { fromPalette?: boolean; blockType?: EmailBlockType } | undefined;

    if (data?.fromPalette && data.blockType) {
      const def = BLOCK_DEFS.find((d) => d.type === data.blockType);
      if (!def) return;
      const newBlock = def.create();
      setBlocks((prev) => {
        if (prev.length === 0 || over.id === 'canvas-empty' || over.id === 'canvas-end') {
          return [...prev, newBlock];
        }
        const overIndex = prev.findIndex((b) => b.id === over.id);
        if (overIndex === -1) return [...prev, newBlock];
        const next = [...prev];
        next.splice(overIndex, 0, newBlock);
        return next;
      });
      setSelectedBlockId(newBlock.id);
      return;
    }

    if (active.id !== over.id) {
      setBlocks((prev) => {
        const oldIndex = prev.findIndex((b) => b.id === active.id);
        const newIndex = prev.findIndex((b) => b.id === over.id);
        if (oldIndex === -1 || newIndex === -1) return prev;
        return arrayMove(prev, oldIndex, newIndex);
      });
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white">
      {/* Top bar */}
      <div className="h-16 flex items-center justify-between px-3 sm:px-5 border-b flex-shrink-0 gap-2" style={{ borderColor: '#e5e7eb' }}>
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <button onClick={handleClose} className="w-9 h-9 rounded-xl flex items-center justify-center text-gray-500 hover:bg-gray-100 transition-colors flex-shrink-0">
            <ArrowLeft size={17} />
          </button>
          <input
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            className="font-questrial font-bold text-base text-gray-900 bg-transparent border-none focus:ring-0 outline-none min-w-0"
            style={{ width: Math.min(420, Math.max(100, nome.length * 11)) }}
          />
        </div>
        <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
          <button
            onClick={() => setPreviewOpen(true)}
            title="Pré-visualizar"
            className="flex items-center gap-2 px-2.5 sm:px-4 py-2 text-sm font-semibold text-gray-600 rounded-xl hover:bg-gray-100 transition-colors"
          >
            <Eye size={15} /> <span className="hidden lg:inline">Pré-visualizar</span>
          </button>
          <button
            onClick={handleSave}
            title="Salvar modelo"
            className="flex items-center gap-2 px-2.5 sm:px-4 py-2 text-sm font-semibold text-gray-600 border rounded-xl hover:bg-gray-50 transition-colors"
            style={{ borderColor: '#e5e7eb' }}
          >
            <Save size={15} /> <span className="hidden lg:inline">Salvar modelo</span>
          </button>
          <button
            onClick={handleGoToSend}
            className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-4 py-2 text-sm font-semibold text-white rounded-xl hover:opacity-90 transition-colors whitespace-nowrap"
            style={{ backgroundColor: '#d55006' }}
          >
            <span className="hidden sm:inline">Avançar para envio</span><span className="sm:hidden">Enviar</span> <ChevronRight size={15} />
          </button>
        </div>
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="flex-1 flex flex-col md:flex-row overflow-y-auto md:overflow-hidden">
          {/* Palette */}
          <div className="flex-shrink-0 border-b md:border-b-0 md:border-r md:w-64 md:overflow-y-auto p-3 md:p-4" style={{ borderColor: '#e5e7eb', backgroundColor: '#fafafa' }}>
            <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-2 px-1">Blocos</p>
            <div className="flex md:flex-col gap-2 overflow-x-auto md:overflow-visible pb-1 md:pb-0">
              {BLOCK_DEFS.map((def) => (
                <PaletteItem key={def.type} def={def} />
              ))}
            </div>
            <div className="hidden md:flex mt-4 p-3 rounded-xl items-start gap-2" style={{ backgroundColor: '#fff7ed', border: '1px solid #fed7aa' }}>
              <Sparkles size={14} style={{ color: '#d55006' }} className="flex-shrink-0 mt-0.5" />
              <p className="text-xs" style={{ color: '#9a5219' }}>Arraste um bloco para o canvas ao lado para montar seu e-mail.</p>
            </div>
          </div>

          {/* Canvas */}
          <div className="flex-1 md:overflow-y-auto flex items-start justify-center py-6 md:py-10 px-3 md:px-6" style={{ backgroundColor: '#e9ebee' }}>
            <div className="w-full bg-white rounded-2xl flex-shrink-0" style={{ maxWidth: 600, boxShadow: '0 4px 20px rgba(0,0,0,0.08)', minHeight: 400 }}>
              {blocks.length === 0 ? (
                <EmptyCanvasDropZone />
              ) : (
                <SortableContext items={blocks.map((b) => b.id)} strategy={verticalListSortingStrategy}>
                  <div className="py-6">
                    {blocks.map((block) => (
                      <CanvasBlockItem
                        key={block.id}
                        block={block}
                        isSelected={selectedBlockId === block.id}
                        onSelect={() => setSelectedBlockId(block.id)}
                        onDelete={() => deleteBlock(block.id)}
                        onDuplicate={() => duplicateBlock(block.id)}
                      />
                    ))}
                    <EndCanvasDropZone />
                  </div>
                </SortableContext>
              )}
            </div>
          </div>

          {/* Properties */}
          <div className="flex-shrink-0 border-t md:border-t-0 md:border-l md:w-80 md:overflow-y-auto p-4 md:p-5" style={{ borderColor: '#e5e7eb' }}>
            {selectedBlock ? (
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-4">
                  {BLOCK_DEFS.find((d) => d.type === selectedBlock.type)?.label ?? 'Bloco'}
                </p>
                <BlockPropertiesPanel key={selectedBlock.id} block={selectedBlock} onUpdate={updateSelectedBlock} />
              </div>
            ) : (
              <div className="space-y-5">
                <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-1">Configurações do e-mail</p>
                <div>
                  <label className="text-xs font-semibold text-gray-600 mb-1 block">Assunto</label>
                  <input className="form-input" placeholder="Assunto do e-mail" value={assunto} onChange={(e) => setAssunto(e.target.value)} />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 mb-1 block">Preheader</label>
                  <input className="form-input" placeholder="Texto de pré-visualização" value={preheader} onChange={(e) => setPreheader(e.target.value)} />
                  <p className="text-xs text-gray-400 mt-1">Aparece ao lado do assunto na caixa de entrada.</p>
                </div>
                <div className="p-3 rounded-xl" style={{ backgroundColor: '#f8f9fa', border: '1px solid #e9ecef' }}>
                  <p className="text-xs text-gray-400">Selecione um bloco no canvas para editar seu conteúdo, cores e alinhamento.</p>
                </div>
              </div>
            )}
          </div>
        </div>

        <DragOverlay>
          {activeDrag?.kind === 'palette' && (() => {
            const def = BLOCK_DEFS.find((d) => d.type === activeDrag.blockType);
            if (!def) return null;
            const Icon = def.icon;
            return (
              <div className="px-3 py-2.5 rounded-xl bg-white shadow-2xl border-2 flex items-center gap-2 text-sm font-semibold" style={{ borderColor: '#d55006' }}>
                <Icon size={15} style={{ color: '#d55006' }} />
                {def.label}
              </div>
            );
          })()}
          {activeDrag?.kind === 'block' && (
            <div className="rounded-xl bg-white shadow-2xl border-2 px-6 py-3 opacity-90" style={{ borderColor: '#d55006', width: 560 }}>
              <EmailBlockRenderer block={activeDrag.block} />
            </div>
          )}
        </DragOverlay>
      </DndContext>

      {previewOpen && (
        <EmailPreviewModal assunto={assunto} preheader={preheader} blocks={blocks} onClose={() => setPreviewOpen(false)} />
      )}
    </div>
  );
}

function EmptyCanvasDropZone() {
  const { setNodeRef, isOver } = useDroppable({ id: 'canvas-empty' });
  return (
    <div
      ref={setNodeRef}
      className="flex flex-col items-center justify-center gap-3 text-center px-8 rounded-2xl transition-colors"
      style={{ minHeight: 400, border: isOver ? '2px dashed #d55006' : '2px dashed transparent', backgroundColor: isOver ? '#fff7ed' : 'transparent' }}
    >
      <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: '#fff7ed' }}>
        <Sparkles size={20} style={{ color: '#d55006' }} />
      </div>
      <p className="text-sm font-semibold text-gray-500">Arraste um bloco aqui para começar</p>
      <p className="text-xs text-gray-400">Título, texto, imagem, botão e mais</p>
    </div>
  );
}

function EndCanvasDropZone() {
  const { setNodeRef, isOver } = useDroppable({ id: 'canvas-end' });
  return (
    <div
      ref={setNodeRef}
      style={{
        height: isOver ? 56 : 20,
        margin: '0 10px',
        borderRadius: 8,
        border: isOver ? '2px dashed #d55006' : '2px dashed transparent',
        backgroundColor: isOver ? '#fff7ed' : 'transparent',
        transition: 'height 0.15s ease',
      }}
    />
  );
}

function PaletteItem({ def }: { def: BlockDef }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `palette-${def.type}`,
    data: { fromPalette: true, blockType: def.type },
  });
  const Icon = def.icon;
  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className="flex-shrink-0 whitespace-nowrap md:whitespace-normal md:w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl border text-sm font-semibold text-gray-700 hover:border-orange-300 transition-all cursor-grab active:cursor-grabbing select-none"
      style={{ borderColor: '#e5e7eb', backgroundColor: '#fff', opacity: isDragging ? 0.4 : 1, touchAction: 'none' }}
    >
      <span className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#fff7ed' }}>
        <Icon size={15} style={{ color: '#d55006' }} />
      </span>
      {def.label}
    </div>
  );
}

function CanvasBlockItem({ block, isSelected, onSelect, onDelete, onDuplicate }: {
  block: EmailBlock;
  isSelected: boolean;
  onSelect: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: block.id });

  return (
    <div
      ref={setNodeRef}
      onClick={onSelect}
      className="group relative px-6 py-3 border-2 rounded-lg cursor-pointer mx-2"
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
        borderColor: isSelected ? '#d55006' : 'transparent',
        backgroundColor: isSelected ? '#fffaf5' : 'transparent',
      }}
    >
      <EmailBlockRenderer block={block} />

      <div
        className="absolute -top-3 right-3 hidden group-hover:flex items-center gap-1 px-1 py-1 rounded-lg bg-white border shadow-sm"
        style={{ borderColor: '#e5e7eb' }}
        onClick={(e) => e.stopPropagation()}
      >
        <span
          {...listeners}
          {...attributes}
          className="w-6 h-6 rounded flex items-center justify-center text-gray-400 hover:text-gray-600 cursor-grab active:cursor-grabbing"
          style={{ touchAction: 'none' }}
          title="Arrastar para reordenar"
        >
          <GripVertical size={13} />
        </span>
        <button onClick={onDuplicate} className="w-6 h-6 rounded flex items-center justify-center text-gray-400 hover:text-gray-600" title="Duplicar">
          <Copy size={13} />
        </button>
        <button onClick={onDelete} className="w-6 h-6 rounded flex items-center justify-center text-gray-400 hover:text-red-500" title="Excluir">
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  );
}

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="text-xs font-semibold text-gray-600 mb-1 block">{label}</label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-9 h-9 rounded-lg border cursor-pointer flex-shrink-0"
          style={{ borderColor: '#e5e7eb', padding: 2 }}
        />
        <input className="form-input" value={value} onChange={(e) => onChange(e.target.value)} />
      </div>
    </div>
  );
}

function AlignPicker({ value, onChange }: { value: Alinhamento; onChange: (v: Alinhamento) => void }) {
  const options: { id: Alinhamento; icon: React.ElementType }[] = [
    { id: 'left', icon: AlignLeft },
    { id: 'center', icon: AlignCenter },
    { id: 'right', icon: AlignRight },
  ];
  return (
    <div className="flex items-center gap-1 p-1 rounded-lg" style={{ backgroundColor: '#f1f5f9' }}>
      {options.map(({ id, icon: Icon }) => (
        <button
          key={id}
          type="button"
          onClick={() => onChange(id)}
          className="flex-1 h-8 rounded-md flex items-center justify-center transition-colors"
          style={value === id ? { backgroundColor: '#fff', color: '#d55006', boxShadow: '0 1px 2px rgba(0,0,0,0.1)' } : { color: '#9ca3af' }}
        >
          <Icon size={14} />
        </button>
      ))}
    </div>
  );
}

function BlockPropertiesPanel({ block, onUpdate }: { block: EmailBlock; onUpdate: (patch: Record<string, unknown>) => void }) {
  const fileInputId = `file-${block.id}`;
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [uploadingPoster, setUploadingPoster] = useState(false);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => onUpdate({ url: String(reader.result) });
    reader.readAsDataURL(file);
  }

  async function handleVideoFile(file: File) {
    setUploadingVideo(true);
    try {
      const { url } = await emailApi.uploadAsset(file);
      onUpdate({ url });
    } catch (err) {
      alert(err instanceof ApiError ? err.message : 'Não foi possível enviar o vídeo.');
    } finally {
      setUploadingVideo(false);
    }
  }

  async function handlePosterFile(file: File) {
    setUploadingPoster(true);
    try {
      const { url } = await emailApi.uploadAsset(file);
      onUpdate({ posterUrl: url });
    } catch (err) {
      alert(err instanceof ApiError ? err.message : 'Não foi possível enviar a imagem de capa.');
    } finally {
      setUploadingPoster(false);
    }
  }

  function handleVideoUrlChange(url: string, hasPoster: boolean) {
    const patch: Record<string, unknown> = { url };
    if (!hasPoster) {
      const ytThumb = extractYouTubeThumb(url);
      if (ytThumb) {
        patch.posterUrl = ytThumb;
      } else {
        const vimeoId = extractVimeoId(url);
        if (vimeoId) {
          fetchVimeoThumb(vimeoId).then((thumb) => { if (thumb) onUpdate({ posterUrl: thumb }); });
        }
      }
    }
    onUpdate(patch);
  }

  switch (block.type) {
    case 'heading':
    case 'text':
      return (
        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-gray-600 mb-1 block">{block.type === 'heading' ? 'Título' : 'Texto'}</label>
            <textarea
              className="form-input resize-none"
              rows={block.type === 'heading' ? 2 : 6}
              value={block.texto}
              onChange={(e) => onUpdate({ texto: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-600 mb-1 block">Tamanho (px)</label>
              <input
                type="number"
                className="form-input"
                value={block.tamanho}
                onChange={(e) => onUpdate({ tamanho: Number(e.target.value) || 14 })}
              />
            </div>
            <ColorField label="Cor do texto" value={block.cor} onChange={(v) => onUpdate({ cor: v })} />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-600 mb-1 block">Alinhamento</label>
            <AlignPicker value={block.alinhamento} onChange={(v) => onUpdate({ alinhamento: v })} />
          </div>
        </div>
      );

    case 'image':
      return (
        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-gray-600 mb-1 block">URL da imagem</label>
            <input className="form-input" placeholder="https://..." value={block.url} onChange={(e) => onUpdate({ url: e.target.value })} />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-600 mb-1 block">Ou enviar do computador</label>
            <label
              htmlFor={fileInputId}
              className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg border border-dashed text-xs font-semibold text-gray-500 cursor-pointer hover:border-orange-300 hover:text-orange-600 transition-colors"
              style={{ borderColor: '#d1d5db' }}
            >
              <Upload size={14} /> Escolher arquivo
            </label>
            <input id={fileInputId} type="file" accept="image/*" className="hidden" onChange={handleFile} />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-600 mb-1 block">Texto alternativo</label>
            <input className="form-input" value={block.alt} onChange={(e) => onUpdate({ alt: e.target.value })} />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-600 mb-1 block">Link ao clicar (opcional)</label>
            <input className="form-input" placeholder="https://..." value={block.link ?? ''} onChange={(e) => onUpdate({ link: e.target.value })} />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-600 mb-1 block">Largura ({block.largura}%)</label>
            <input type="range" min={20} max={100} value={block.largura} onChange={(e) => onUpdate({ largura: Number(e.target.value) })} className="w-full" />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-600 mb-1 block">Alinhamento</label>
            <AlignPicker value={block.alinhamento} onChange={(v) => onUpdate({ alinhamento: v })} />
          </div>
        </div>
      );

    case 'video':
      return (
        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-gray-600 mb-1 block">Link do vídeo (YouTube, Vimeo ou link direto .mp4)</label>
            <input
              className="form-input"
              placeholder="https://..."
              value={block.url}
              onChange={(e) => handleVideoUrlChange(e.target.value, Boolean(block.posterUrl))}
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-600 mb-1 block">Ou enviar do computador</label>
            <FileDropzone
              id={`video-file-${block.id}`}
              accept="video/mp4,video/webm,video/quicktime,video/ogg"
              hint="Arraste um vídeo aqui ou clique para escolher"
              uploading={uploadingVideo}
              onFile={handleVideoFile}
            />
          </div>
          <div className="p-3 rounded-xl" style={{ backgroundColor: '#f8f9fa', border: '1px solid #e9ecef' }}>
            <p className="text-xs text-gray-500">
              A maioria dos e-mails não reproduz vídeo dentro da mensagem. Por isso, o e-mail exibe uma imagem de capa clicável que abre o vídeo no navegador.
            </p>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-600 mb-1 block">Imagem de capa (thumbnail)</label>
            <input
              className="form-input mb-2"
              placeholder="https://... (preenchida automaticamente para YouTube/Vimeo)"
              value={block.posterUrl ?? ''}
              onChange={(e) => onUpdate({ posterUrl: e.target.value })}
            />
            <FileDropzone
              id={`poster-file-${block.id}`}
              accept="image/jpeg,image/png,image/webp"
              hint="Arraste uma imagem aqui ou clique para escolher"
              uploading={uploadingPoster}
              onFile={handlePosterFile}
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-600 mb-1 block">Texto do link</label>
            <input className="form-input" value={block.legenda} onChange={(e) => onUpdate({ legenda: e.target.value })} />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-600 mb-1 block">Largura ({block.largura}%)</label>
            <input type="range" min={20} max={100} value={block.largura} onChange={(e) => onUpdate({ largura: Number(e.target.value) })} className="w-full" />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-600 mb-1 block">Alinhamento</label>
            <AlignPicker value={block.alinhamento} onChange={(v) => onUpdate({ alinhamento: v })} />
          </div>
        </div>
      );

    case 'button':
      return (
        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-gray-600 mb-1 block">Texto do botão</label>
            <input className="form-input" value={block.texto} onChange={(e) => onUpdate({ texto: e.target.value })} />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-600 mb-1 block">Link do botão</label>
            <input className="form-input" placeholder="https://..." value={block.url} onChange={(e) => onUpdate({ url: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <ColorField label="Cor de fundo" value={block.corFundo} onChange={(v) => onUpdate({ corFundo: v })} />
            <ColorField label="Cor do texto" value={block.corTexto} onChange={(v) => onUpdate({ corTexto: v })} />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-600 mb-1 block">Alinhamento</label>
            <AlignPicker value={block.alinhamento} onChange={(v) => onUpdate({ alinhamento: v })} />
          </div>
        </div>
      );

    case 'divider':
      return <ColorField label="Cor da linha" value={block.cor} onChange={(v) => onUpdate({ cor: v })} />;

    case 'spacer':
      return (
        <div>
          <label className="text-xs font-semibold text-gray-600 mb-1 block">Altura ({block.altura}px)</label>
          <input type="range" min={8} max={120} value={block.altura} onChange={(e) => onUpdate({ altura: Number(e.target.value) })} className="w-full" />
        </div>
      );

    default:
      return null;
  }
}
