import { useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  ArrowLeft, Building2, Images, ExternalLink, FileText, MapPin, Bed, Bath, Car,
  Phone, Copy, Check, Plus, Pencil, Trash2, Loader2,
} from 'lucide-react';
import { useStore } from '../store';
import { ApiError } from '../api/client';
import { empreendimentosApi, unidadesApi } from '../api/endpoints';
import { formatCurrencyBRL, formatMetragem, parseDateKeyLocal, STATUS_UNIDADE_CONFIG } from '../utils';
import type { EmpreendimentoDetail, Unidade, CreateUnidadePayload } from '../types';
import { EmpreendimentoFormModal } from './EmpreendimentoFormModal';
import { UnidadeFormModal } from './UnidadeFormModal';

function formatMesAno(dateKey?: string): string {
  if (!dateKey) return '—';
  return format(parseDateKeyLocal(dateKey), 'MMM/yy', { locale: ptBR }).toUpperCase();
}

function faixaDormSuite(min: number, max: number): string {
  return min === max ? `${max}` : `${min} a ${max}`;
}

export function EmpreendimentoDetailView({ id, onClose }: { id: string; onClose: () => void }) {
  const currentUser = useStore((s) => s.currentUser);
  const isReadOnly = currentUser?.cargo === 'Marketing';
  const canDelete = currentUser?.cargo === 'Diretora';
  const removeEmpreendimento = useStore((s) => s.removeEmpreendimento);
  const refreshEmpreendimentoSummary = useStore((s) => s.refreshEmpreendimentoSummary);

  const [detail, setDetail] = useState<EmpreendimentoDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [activeTipo, setActiveTipo] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [unidadeModal, setUnidadeModal] = useState<{ unidade: Unidade | null } | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState('');
  const [linkCopied, setLinkCopied] = useState(false);
  const [deletingEmpreendimento, setDeletingEmpreendimento] = useState(false);

  async function loadDetail() {
    setLoading(true);
    setLoadError('');
    try {
      const data = await empreendimentosApi.get(id);
      setDetail(data);
      setActiveTipo((prev) => {
        const tipos = Array.from(new Set(data.unidades.map((u) => u.tipo)));
        if (prev && tipos.includes(prev)) return prev;
        return tipos[0] ?? null;
      });
    } catch (err) {
      setLoadError(err instanceof ApiError ? err.message : 'Não foi possível carregar o empreendimento.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDetail();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const tipos = useMemo(() => Array.from(new Set(detail?.unidades.map((u) => u.tipo) ?? [])), [detail]);
  const unidadesDoTipo = useMemo(
    () => detail?.unidades.filter((u) => u.tipo === activeTipo) ?? [],
    [detail, activeTipo]
  );
  const totalDisponiveis = useMemo(() => detail?.unidades.filter((u) => u.status === 'disponivel').length ?? 0, [detail]);

  async function handleSaveUnidade(data: CreateUnidadePayload, unidadeId?: string) {
    if (unidadeId) {
      await unidadesApi.update(unidadeId, data);
    } else {
      await empreendimentosApi.unidades.create(id, data);
    }
    await loadDetail();
    await refreshEmpreendimentoSummary(id);
  }

  async function handleDeleteUnidade(unidade: Unidade) {
    if (!window.confirm(`Excluir a unidade ${unidade.numero}? Essa ação não pode ser desfeita.`)) return;
    setDeletingId(unidade.id);
    setActionError('');
    try {
      await unidadesApi.remove(unidade.id);
      await loadDetail();
      await refreshEmpreendimentoSummary(id);
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : 'Não foi possível excluir a unidade.');
    } finally {
      setDeletingId(null);
    }
  }

  async function handleDeleteEmpreendimento() {
    if (!detail) return;
    if (!window.confirm(`Excluir o empreendimento "${detail.nome}"? Todas as unidades cadastradas também serão excluídas. Essa ação não pode ser desfeita.`)) return;
    setDeletingEmpreendimento(true);
    setActionError('');
    try {
      await removeEmpreendimento(id);
      onClose();
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : 'Não foi possível excluir o empreendimento.');
      setDeletingEmpreendimento(false);
    }
  }

  function handleCopyLink() {
    const link = detail?.hotsiteUrl || window.location.href;
    navigator.clipboard.writeText(link).then(() => {
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    }).catch(() => undefined);
  }

  return (
    <div className="h-full overflow-y-auto" style={{ backgroundColor: '#e6e3de' }}>
      <div className="max-w-6xl mx-auto px-4 md:px-6 py-6 md:py-8 space-y-4">
        <div className="flex items-center justify-between">
          <button onClick={onClose} className="flex items-center gap-2 text-sm font-semibold text-gray-600 hover:text-gray-900 transition-colors">
            <ArrowLeft size={16} /> Voltar
          </button>
          {canDelete && detail && (
            <button
              onClick={handleDeleteEmpreendimento}
              disabled={deletingEmpreendimento}
              className="flex items-center gap-1.5 text-xs font-semibold text-gray-400 hover:text-red-500 transition-colors disabled:opacity-50"
            >
              <Trash2 size={13} /> Excluir empreendimento
            </button>
          )}
        </div>

        {loading && (
          <div className="flex items-center justify-center py-24 text-gray-400">
            <Loader2 size={22} className="animate-spin" />
          </div>
        )}

        {!loading && loadError && (
          <div className="bg-white rounded-2xl border p-8 text-center text-sm text-red-500" style={{ borderColor: '#e5e7eb' }}>
            {loadError}
          </div>
        )}

        {!loading && detail && (
          <div className="rounded-2xl overflow-hidden flex flex-col lg:flex-row" style={{ backgroundColor: '#1a1a1a', boxShadow: '0 8px 30px rgba(0,0,0,0.25)' }}>
            {/* Coluna esquerda */}
            <div className="lg:w-[38%] flex-shrink-0 p-5 flex flex-col gap-4">
              <div className="relative rounded-xl overflow-hidden" style={{ aspectRatio: '16 / 10', backgroundColor: '#292929' }}>
                {detail.imagemCapaUrl ? (
                  <img src={detail.imagemCapaUrl} alt={detail.nome} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-500">
                    <Building2 size={28} />
                  </div>
                )}
                {detail.logoIncorporadoraUrl && (
                  <div
                    className="absolute -bottom-5 left-4 w-14 h-14 rounded-full overflow-hidden border-4 flex items-center justify-center bg-white"
                    style={{ borderColor: '#1a1a1a' }}
                  >
                    <img src={detail.logoIncorporadoraUrl} alt={detail.incorporadora} className="w-full h-full object-cover" />
                  </div>
                )}
              </div>

              <div className="pt-3">
                <p className="text-white font-bold font-questrial text-base leading-tight">{detail.nome}</p>
                {detail.incorporadora && <p className="text-xs" style={{ color: '#9ca3af' }}>{detail.incorporadora}</p>}
              </div>

              <div className="grid grid-cols-3 gap-2">
                <LeftIconButton icon={<Images size={15} />} label="Galeria" onClick={() => detail.imagemCapaUrl && window.open(detail.imagemCapaUrl, '_blank')} disabled={!detail.imagemCapaUrl} />
                <LeftIconButton icon={<ExternalLink size={15} />} label="Hotsite" onClick={() => detail.hotsiteUrl && window.open(detail.hotsiteUrl, '_blank')} disabled={!detail.hotsiteUrl} />
                <LeftIconButton icon={<FileText size={15} />} label="Catálogo" onClick={() => detail.catalogoUrl && window.open(detail.catalogoUrl, '_blank')} disabled={!detail.catalogoUrl} />
              </div>

              {(detail.rua || detail.cidade) && (
                <div className="flex items-start gap-2 text-xs" style={{ color: '#d1d5db' }}>
                  <MapPin size={13} className="flex-shrink-0 mt-0.5" />
                  <span>
                    {[detail.rua, detail.numero, detail.bairro].filter(Boolean).join(', ')}
                    {detail.rua || detail.bairro ? <br /> : null}
                    {[detail.cidade, detail.uf].filter(Boolean).join(' - ')}
                  </span>
                </div>
              )}

              <div className="flex items-center gap-6 text-xs" style={{ color: '#d1d5db' }}>
                <div>
                  <p style={{ color: '#6b7280' }}>Início da obra</p>
                  <p className="font-semibold text-white mt-0.5">{formatMesAno(detail.inicioObra)}</p>
                </div>
                <div>
                  <p style={{ color: '#6b7280' }}>Data de entrega</p>
                  <p className="font-semibold text-white mt-0.5">{formatMesAno(detail.dataEntrega)}</p>
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold text-white mb-1.5">{detail.percentualConcluido}% concluído</p>
                <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: '#374151' }}>
                  <div className="h-full rounded-full" style={{ width: `${Math.min(100, Math.max(0, detail.percentualConcluido))}%`, backgroundColor: '#22c55e' }} />
                </div>
                {detail.faixaIncorporacao && <p className="text-xs mt-1.5" style={{ color: '#9ca3af' }}>Incorporação {detail.faixaIncorporacao}</p>}
              </div>

              <div className="flex items-center gap-5 py-1">
                <FeatureIcon icon={<Bed size={16} />} value={faixaDormSuite(detail.dormitoriosMin, detail.dormitoriosMax)} label="Dorm." />
                <FeatureIcon icon={<Bath size={16} />} value={faixaDormSuite(detail.suitesMin, detail.suitesMax)} label="Suítes" />
                <FeatureIcon icon={<Car size={16} />} value={String(detail.vagasGaragem)} label="Vagas" />
              </div>

              {detail.caracteristicas.length > 0 && (
                <ul className="space-y-1">
                  {detail.caracteristicas.map((item, i) => (
                    <li key={`${item}-${i}`} className="text-xs flex items-center gap-2" style={{ color: '#d1d5db' }}>
                      <span className="w-1 h-1 rounded-full flex-shrink-0" style={{ backgroundColor: '#d55006' }} /> {item}
                    </li>
                  ))}
                </ul>
              )}

              {!isReadOnly && (
                <button
                  onClick={() => setEditOpen(true)}
                  className="mt-auto flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-colors hover:opacity-90"
                  style={{ backgroundColor: '#292929', color: '#fff' }}
                >
                  <Pencil size={14} /> Editar empreendimento
                </button>
              )}
            </div>

            {/* Coluna direita */}
            <div className="flex-1 p-5 flex flex-col gap-4" style={{ backgroundColor: '#fff' }}>
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div>
                  <p className="text-sm font-bold text-gray-800 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: '#22c55e' }} />
                    {totalDisponiveis} UNIDADES DISPONÍVEIS
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">Última atualização · {format(new Date(detail.updatedAt), 'dd/MM/yy')}</p>
                </div>
                <div className="flex items-center gap-2">
                  {detail.telefoneContato && (
                    <a href={`tel:${detail.telefoneContato}`} className="w-9 h-9 rounded-full flex items-center justify-center border text-gray-500 hover:bg-gray-50 transition-colors" style={{ borderColor: '#e5e7eb' }} title="Ligar">
                      <Phone size={14} />
                    </a>
                  )}
                  <button onClick={handleCopyLink} className="w-9 h-9 rounded-full flex items-center justify-center border text-gray-500 hover:bg-gray-50 transition-colors" style={{ borderColor: '#e5e7eb' }} title="Copiar link">
                    {linkCopied ? <Check size={14} style={{ color: '#15803d' }} /> : <Copy size={14} />}
                  </button>
                  {!isReadOnly && (
                    <button
                      onClick={() => setUnidadeModal({ unidade: null })}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-semibold text-white hover:opacity-90 transition-colors"
                      style={{ backgroundColor: '#d55006' }}
                    >
                      <Plus size={14} /> Nova unidade
                    </button>
                  )}
                </div>
              </div>

              {actionError && <p className="text-xs text-red-500">{actionError}</p>}

              {tipos.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center py-10 gap-2">
                  <p className="text-sm font-semibold text-gray-600">Nenhuma unidade cadastrada</p>
                  <p className="text-xs text-gray-400">Adicione a primeira unidade deste empreendimento.</p>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-1 flex-wrap">
                    {tipos.map((tipo) => (
                      <button
                        key={tipo}
                        onClick={() => setActiveTipo(tipo)}
                        className="px-3 py-1.5 rounded-lg text-sm font-bold transition-colors"
                        style={activeTipo === tipo ? { backgroundColor: '#111827', color: '#fff' } : { color: '#6b7280' }}
                      >
                        Apartamentos - {tipo}
                      </button>
                    ))}
                  </div>

                  <div className="overflow-x-auto rounded-xl border" style={{ borderColor: '#e5e7eb' }}>
                    <table className="w-full text-sm min-w-[420px]">
                      <thead>
                        <tr className="border-b" style={{ borderColor: '#e5e7eb', backgroundColor: '#fafafa' }}>
                          <Th>Unidade</Th>
                          <Th>Metragem (Privativo)</Th>
                          <Th className="text-right">Valor</Th>
                        </tr>
                      </thead>
                      <tbody>
                        {unidadesDoTipo.map((u) => (
                          <UnidadeRow
                            key={u.id}
                            unidade={u}
                            isReadOnly={isReadOnly}
                            deleting={deletingId === u.id}
                            onEdit={() => setUnidadeModal({ unidade: u })}
                            onDelete={() => handleDeleteUnidade(u)}
                          />
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {editOpen && detail && (
        <EmpreendimentoFormModal
          empreendimento={detail}
          onClose={() => setEditOpen(false)}
          onSaved={() => loadDetail()}
        />
      )}

      {unidadeModal && detail && (
        <UnidadeFormModal
          unidade={unidadeModal.unidade}
          empreendimento={detail}
          onClose={() => setUnidadeModal(null)}
          onSave={(data) => handleSaveUnidade(data, unidadeModal.unidade?.id)}
        />
      )}
    </div>
  );
}

function LeftIconButton({ icon, label, onClick, disabled }: { icon: React.ReactNode; label: string; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="flex flex-col items-center gap-1.5 py-2.5 rounded-xl transition-colors disabled:opacity-40"
      style={{ backgroundColor: '#ffffff', color: '#1a1a1a' }}
    >
      {icon}
      <span className="text-[11px] font-semibold">{label}</span>
    </button>
  );
}

function FeatureIcon({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5 text-white">
      {icon}
      <div className="leading-tight">
        <p className="text-xs font-bold">{value}</p>
        <p className="text-[10px]" style={{ color: '#9ca3af' }}>{label}</p>
      </div>
    </div>
  );
}

function Th({ children, className }: { children: React.ReactNode; className?: string }) {
  return <th className={`px-4 py-2.5 text-left text-xs font-bold text-gray-400 uppercase tracking-wider ${className ?? ''}`}>{children}</th>;
}

function UnidadeRow({ unidade, isReadOnly, deleting, onEdit, onDelete }: {
  unidade: Unidade;
  isReadOnly: boolean;
  deleting: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const statusConfig = STATUS_UNIDADE_CONFIG[unidade.status];
  return (
    <tr className="group border-b last:border-b-0 hover:bg-gray-50 transition-colors" style={{ borderColor: '#f3f4f6' }}>
      <td className="px-4 py-3 font-semibold text-gray-800">{unidade.numero}</td>
      <td className="px-4 py-3 text-gray-600">{formatMetragem(unidade.metragemPrivativa)}</td>
      <td className="px-4 py-3">
        <div className="flex items-center justify-end gap-2">
          <span
            className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold"
            style={{ backgroundColor: statusConfig.bg, color: statusConfig.text }}
          >
            {unidade.status === 'disponivel' ? formatCurrencyBRL(unidade.valor) : statusConfig.label}
          </span>
          {!isReadOnly && (
            <div className="hidden group-hover:flex items-center gap-1">
              <button onClick={onEdit} className="w-7 h-7 rounded flex items-center justify-center text-gray-400 hover:text-gray-600" title="Editar">
                <Pencil size={13} />
              </button>
              <button onClick={onDelete} disabled={deleting} className="w-7 h-7 rounded flex items-center justify-center text-gray-400 hover:text-red-500 disabled:opacity-50" title="Excluir">
                <Trash2 size={13} />
              </button>
            </div>
          )}
        </div>
      </td>
    </tr>
  );
}
