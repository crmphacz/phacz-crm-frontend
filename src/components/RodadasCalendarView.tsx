import { useEffect, useMemo, useState } from 'react';
import {
  startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval,
  addMonths, subMonths, format, isSameMonth, isToday,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Plus, ChevronLeft, ChevronRight, MapPin, Wallet, User, Pencil, Trash2, X,
  CalendarDays, LayoutGrid, List as ListIcon, Check, XCircle, Clock, AlertCircle, PencilLine,
} from 'lucide-react';
import { useStore } from '../store';
import { useViewReady } from '../navLoading';
import { ViewLoader } from './ViewLoader';
import { ApiError } from '../api/client';
import { formatCurrency, parseDateKeyLocal, formatDateKeyBR } from '../utils';
import { canViewRodadas, canWriteRodadas, canViewFullRodada, canApproveRodada } from '../permissions';
import { isRodadaCompleta, type Rodada, type RodadaResumo, type TipoAcaoRodada, type StatusAprovacaoRodada } from '../types';
import { RodadaFormModal } from './RodadaFormModal';
import { RodadaResumoModal } from './RodadaResumoModal';
import { RodadaMotivoModal, type ModoMotivo } from './RodadaMotivoModal';

const STATUS_APROVACAO_CONFIG: Record<StatusAprovacaoRodada, { label: string; bg: string; text: string; icon: React.ElementType }> = {
  pendente: { label: 'Pendente de aprovação', bg: '#fef9c3', text: '#854d0e', icon: Clock },
  aprovada: { label: 'Aprovada', bg: '#dcfce7', text: '#166534', icon: Check },
  recusada: { label: 'Recusada', bg: '#fee2e2', text: '#b91c1c', icon: XCircle },
  correcao_solicitada: { label: 'Correção solicitada', bg: '#ffedd5', text: '#c2410c', icon: PencilLine },
};

/** Ordem dos filtros da aba Lista. 'todas' primeiro, depois o ciclo de vida da aprovação. */
const FILTROS_STATUS = ['todas', 'pendente', 'correcao_solicitada', 'aprovada', 'recusada'] as const;
type FiltroStatus = (typeof FILTROS_STATUS)[number];

/** `RodadaResumo` nunca chega pendente/recusada pro cliente — a API já filtra isso pra quem não vê o formulário completo. */
function statusDe(r: Rodada | RodadaResumo): StatusAprovacaoRodada {
  return isRodadaCompleta(r) ? r.statusAprovacao : 'aprovada';
}

const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

const TIPO_ACAO_LABELS: Record<TipoAcaoRodada, string> = {
  rodada: 'Rodada',
  cafe_na_obra: 'Café na obra',
  evento_externo: 'Evento externo',
  trafego_pago: 'Tráfego pago',
  almoco_jantar: 'Almoço/Jantar',
  outro: 'Outro',
};

/**
 * Expande o intervalo [inicio, fim] de uma rodada em chaves de dia "YYYY-MM-DD".
 * Usa aritmética em UTC porque as datas da rodada já chegam como "YYYY-MM-DD" puro
 * (sem hora) — misturar com Date local aqui reintroduziria o bug de fuso horário.
 */
function eachDateKeyInRange(startKey: string, endKey: string): string[] {
  const keys: string[] = [];
  let cursor = new Date(`${startKey}T00:00:00.000Z`).getTime();
  const end = new Date(`${endKey}T00:00:00.000Z`).getTime();
  while (cursor <= end) {
    keys.push(new Date(cursor).toISOString().slice(0, 10));
    cursor += 24 * 60 * 60 * 1000;
  }
  return keys;
}

export function RodadasCalendarView() {
  const currentUser = useStore((s) => s.currentUser);
  // Só a Diretoria cria/edita rodadas — os demais perfis com acesso a este módulo
  // (Administrativo, Recepção, SDR, GV "GRV", GR) só visualizam o calendário.
  const isReadOnly = !canWriteRodadas(currentUser);
  const canDelete = currentUser?.cargo === 'Diretora';
  // Só a Diretoria vê o formulário completo (11 seções); os demais perfis com acesso ao
  // calendário recebem da API só o resumo (dia, corretor parceiro, imobiliária, cidade/UF) —
  // isto só decide qual modal abrir, a restrição de dados de verdade já veio da API.
  const canSeeFull = canViewFullRodada(currentUser);
  // Só a Diretoria aprova/recusa — é quem enxerga rodadas pendentes/recusadas de todo mundo
  // (os demais perfis, quando enxergam alguma pendente/recusada, só veem a própria).
  const canApprove = canApproveRodada(currentUser);

  const rodadas = useStore((s) => s.rodadas);
  const removeRodada = useStore((s) => s.removeRodada);
  const approveRodada = useStore((s) => s.approveRodada);
  const rodadaFocoData = useStore((s) => s.rodadaFocoData);
  const rodadaFocoTab = useStore((s) => s.rodadaFocoTab);
  const clearRodadaFoco = useStore((s) => s.clearRodadaFoco);
  const ensureRodadasLoaded = useStore((s) => s.ensureRodadasLoaded);

  const [ready, setReady] = useState(false);
  useViewReady(ready);
  useEffect(() => {
    ensureRodadasLoaded().catch(() => undefined).finally(() => setReady(true));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [tab, setTab] = useState<'calendario' | 'lista'>('calendario');
  const [currentMonth, setCurrentMonth] = useState(() => (rodadaFocoData ? parseDateKeyLocal(rodadaFocoData) : new Date()));
  const [dayPanelKey, setDayPanelKey] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editingRodada, setEditingRodada] = useState<Rodada | null>(null);
  const [viewingResumo, setViewingResumo] = useState<RodadaResumo | null>(null);
  const [prefillDate, setPrefillDate] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState('');
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState('');
  // Modal do recado da Diretoria: mesmo formulário para recusar e para pedir correção.
  const [motivoModal, setMotivoModal] = useState<{ id: string; modo: ModoMotivo } | null>(null);
  const [filtroStatus, setFiltroStatus] = useState<FiltroStatus>('todas');

  useEffect(() => {
    if (rodadaFocoData) {
      setCurrentMonth(parseDateKeyLocal(rodadaFocoData));
      const targetTab = rodadaFocoTab ?? 'calendario';
      setTab(targetTab);
      // A Lista já mostra qualquer status visível pro usuário — o painel do dia é só pro
      // calendário (que só mostra rodada aprovada).
      if (targetTab === 'calendario') setDayPanelKey(rodadaFocoData);
      clearRodadaFoco();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rodadaFocoData]);

  // O CALENDÁRIO (grade e painel do dia) só mostra rodada já aprovada pela Diretoria — mesmo
  // pra quem aprova. Pendente/recusada só aparece na aba Lista (ver rodadasOrdenadas), onde dá
  // pra revisar/aprovar/recusar.
  const rodadasAprovadas = useMemo(() => rodadas.filter((r) => statusDe(r) === 'aprovada'), [rodadas]);

  const rodadasByDay = useMemo(() => {
    const map = new Map<string, (Rodada | RodadaResumo)[]>();
    for (const rodada of rodadasAprovadas) {
      for (const key of eachDateKeyInRange(rodada.dataInicio, rodada.dataFim)) {
        const list = map.get(key) ?? [];
        list.push(rodada);
        map.set(key, list);
      }
    }
    return map;
  }, [rodadasAprovadas]);

  const rodadasDoMes = useMemo(() => {
    // Overlap de intervalos: pega também rodadas que atravessam o mês (começam antes e/ou terminam depois dele).
    const inicioMes = format(startOfMonth(currentMonth), 'yyyy-MM-dd');
    const fimMes = format(endOfMonth(currentMonth), 'yyyy-MM-dd');
    return rodadasAprovadas.filter((r) => r.dataInicio <= fimMes && r.dataFim >= inicioMes);
  }, [rodadasAprovadas, currentMonth]);

  const rodadasPendentes = useMemo(() => rodadas.filter((r) => statusDe(r) === 'pendente'), [rodadas]);

  /** Quantas rodadas o usuário enxerga em cada status — alimenta os chips de filtro da Lista. */
  const contagemPorStatus = useMemo(() => {
    const base: Record<FiltroStatus, number> = {
      todas: rodadas.length, pendente: 0, correcao_solicitada: 0, aprovada: 0, recusada: 0,
    };
    for (const r of rodadas) base[statusDe(r)] += 1;
    return base;
  }, [rodadas]);

  /**
   * Quem acompanha o andamento das próprias rodadas (a GR) precisa ver de relance o que voltou
   * para ela. A Diretoria tem o atalho de pendentes; aqui é o outro lado do fluxo.
   */
  const minhasAguardandoCorrecao = useMemo(
    () => rodadas.filter((r) => statusDe(r) === 'correcao_solicitada' && isRodadaCompleta(r) && r.criadoPorId === currentUser?.id),
    [rodadas, currentUser]
  );

  const days = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const gridStart = startOfWeek(monthStart, { weekStartsOn: 0 });
    const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
    return eachDayOfInterval({ start: gridStart, end: gridEnd });
  }, [currentMonth]);

  const rodadasOrdenadas = useMemo(
    () => [...rodadas]
      .filter((r) => filtroStatus === 'todas' || statusDe(r) === filtroStatus)
      .sort((a, b) => b.dataInicio.localeCompare(a.dataInicio)),
    [rodadas, filtroStatus]
  );

  function openNewForm(dataKey?: string) {
    setEditingRodada(null);
    setPrefillDate(dataKey ?? null);
    setFormOpen(true);
  }

  // Diretoria abre o formulário completo; os demais perfis (a API já entregou só o resumo)
  // abrem um modal de consulta com só os 4 campos permitidos.
  function openRodada(rodada: Rodada | RodadaResumo) {
    if (canSeeFull && isRodadaCompleta(rodada)) {
      setEditingRodada(rodada);
      setPrefillDate(null);
      setFormOpen(true);
    } else {
      setViewingResumo(rodada);
    }
    setDayPanelKey(null);
  }

  async function handleDelete(id: string) {
    if (!window.confirm('Excluir esta rodada? Essa ação não pode ser desfeita.')) return;
    setDeletingId(id);
    setDeleteError('');
    try {
      await removeRodada(id);
      setDayPanelKey(null);
    } catch (err) {
      setDeleteError(err instanceof ApiError ? err.message : 'Não foi possível excluir a rodada.');
    } finally {
      setDeletingId(null);
    }
  }

  async function handleApprove(id: string) {
    setApprovingId(id);
    setActionError('');
    try {
      await approveRodada(id);
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : 'Não foi possível aprovar a rodada.');
    } finally {
      setApprovingId(null);
    }
  }

  const dayPanelRodadas = dayPanelKey ? rodadasByDay.get(dayPanelKey) ?? [] : [];

  if (!canViewRodadas(currentUser)) {
    return (
      <div className="h-full flex items-center justify-center text-sm text-gray-400">
        Seu perfil não tem acesso ao calendário de rodadas.
      </div>
    );
  }

  if (!ready) return <ViewLoader />;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="bg-white border-b px-4 md:px-6 py-4 flex-shrink-0" style={{ borderColor: '#e5e7eb' }}>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 md:gap-4">
          <div>
            <h1 className="font-questrial text-xl text-gray-800">Calendário de Rodadas</h1>
            <p className="text-sm text-gray-500 mt-0.5">{rodadasDoMes.length} rodada(s) aprovada(s) neste mês</p>
          </div>
          <div className="flex items-center gap-3">
            {!canApprove && minhasAguardandoCorrecao.length > 0 && (
              <button
                onClick={() => { setTab('lista'); setFiltroStatus('correcao_solicitada'); }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors"
                style={{ backgroundColor: '#ffedd5', color: '#c2410c' }}
                title="Ver as rodadas que a Diretoria devolveu para você corrigir"
              >
                <PencilLine size={13} /> {minhasAguardandoCorrecao.length} aguardando correção
              </button>
            )}
            {canApprove && rodadasPendentes.length > 0 && (
              <button
                onClick={() => { setTab('lista'); setFiltroStatus('pendente'); }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors"
                style={{ backgroundColor: '#fef9c3', color: '#854d0e' }}
                title="Ver rodadas aguardando sua aprovação"
              >
                <AlertCircle size={13} /> {rodadasPendentes.length} pendente{rodadasPendentes.length !== 1 ? 's' : ''} de aprovação
              </button>
            )}
            <div className="flex items-center p-1 rounded-lg" style={{ backgroundColor: '#f1f5f9' }}>
              <button
                onClick={() => setTab('calendario')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors"
                style={tab === 'calendario' ? { backgroundColor: '#fff', color: '#d55006', boxShadow: '0 1px 2px rgba(0,0,0,0.1)' } : { color: '#6b7280' }}
              >
                <LayoutGrid size={13} /> Calendário
              </button>
              <button
                onClick={() => setTab('lista')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors"
                style={tab === 'lista' ? { backgroundColor: '#fff', color: '#d55006', boxShadow: '0 1px 2px rgba(0,0,0,0.1)' } : { color: '#6b7280' }}
              >
                <ListIcon size={13} /> Lista
              </button>
            </div>
            {!isReadOnly && (
              <button
                onClick={() => openNewForm()}
                className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white rounded-lg hover:opacity-90 flex-shrink-0"
                style={{ backgroundColor: '#d55006' }}
              >
                <Plus size={16} />
                <span className="hidden sm:inline">Nova Rodada</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {tab === 'calendario' ? (
        <div className="flex-1 overflow-auto p-4 md:p-6">
          {/* Month navigator */}
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => setCurrentMonth((m) => subMonths(m, 1))}
              className="w-9 h-9 rounded-lg flex items-center justify-center text-gray-500 hover:bg-gray-100 transition-colors border"
              style={{ borderColor: '#e5e7eb' }}
            >
              <ChevronLeft size={16} />
            </button>
            <div className="flex items-center gap-3">
              <h2 className="font-questrial text-lg text-gray-800 capitalize">{format(currentMonth, 'MMMM yyyy', { locale: ptBR })}</h2>
              <button
                onClick={() => setCurrentMonth(new Date())}
                className="text-xs font-semibold px-2.5 py-1 rounded-lg hover:bg-gray-100 transition-colors"
                style={{ color: '#d55006' }}
              >
                Hoje
              </button>
            </div>
            <button
              onClick={() => setCurrentMonth((m) => addMonths(m, 1))}
              className="w-9 h-9 rounded-lg flex items-center justify-center text-gray-500 hover:bg-gray-100 transition-colors border"
              style={{ borderColor: '#e5e7eb' }}
            >
              <ChevronRight size={16} />
            </button>
          </div>

          {/* Grid */}
          <div className="bg-white rounded-2xl border overflow-hidden" style={{ borderColor: '#e5e7eb' }}>
            <div className="grid grid-cols-7 border-b" style={{ borderColor: '#e5e7eb' }}>
              {WEEKDAYS.map((wd) => (
                <div key={wd} className="px-2 py-2.5 text-center text-xs font-bold uppercase tracking-wider text-gray-400">
                  {wd}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7">
              {days.map((day) => {
                const key = format(day, 'yyyy-MM-dd');
                const dayRodadas = rodadasByDay.get(key) ?? [];
                const inMonth = isSameMonth(day, currentMonth);
                return (
                  <button
                    key={key}
                    onClick={() => setDayPanelKey(key)}
                    className="min-h-[84px] p-2 border-b border-r text-left flex flex-col gap-1 hover:bg-gray-50 transition-colors"
                    style={{ borderColor: '#f3f4f6', opacity: inMonth ? 1 : 0.4 }}
                  >
                    <span
                      className="text-xs font-semibold w-5 h-5 flex items-center justify-center rounded-full"
                      style={isToday(day) ? { backgroundColor: '#d55006', color: '#fff' } : { color: '#6b7280' }}
                    >
                      {format(day, 'd')}
                    </span>
                    {dayRodadas.length > 0 && (
                      <span
                        className="text-[11px] font-bold px-1.5 py-0.5 rounded-full self-start truncate max-w-full"
                        style={{ backgroundColor: '#fff7ed', color: '#d55006' }}
                      >
                        {dayRodadas.length === 1 ? dayRodadas[0].cidade : `${dayRodadas.length} rodadas`}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-auto bg-white">
          {/* Filtro por situação: antes, rodada recusada ou devolvida para correção só era
              alcançável clicando na notificação do sino — passada a notificação, sumia. */}
          {canSeeFull && (
            <div className="flex flex-wrap items-center gap-2 px-4 py-3 border-b" style={{ borderColor: '#f3f4f6' }}>
              {FILTROS_STATUS.map((f) => {
                const cfg = f === 'todas' ? null : STATUS_APROVACAO_CONFIG[f];
                const ativo = filtroStatus === f;
                return (
                  <button
                    key={f}
                    onClick={() => setFiltroStatus(f)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border transition-colors"
                    style={ativo
                      ? { backgroundColor: cfg?.bg ?? '#292929', color: cfg?.text ?? '#fff', borderColor: 'transparent' }
                      : { backgroundColor: '#fff', color: '#6b7280', borderColor: '#e5e7eb' }}
                  >
                    {cfg ? <cfg.icon size={12} /> : null}
                    {cfg?.label ?? 'Todas'}
                    <span style={{ opacity: 0.65 }}>{contagemPorStatus[f]}</span>
                  </button>
                );
              })}
            </div>
          )}
          {actionError && <p className="text-xs text-red-500 px-4 pt-3">{actionError}</p>}
          <table className="w-full text-sm min-w-[880px]">
            <thead className="sticky top-0 bg-white border-b" style={{ borderColor: '#e5e7eb' }}>
              <tr>
                <Th>Período</Th>
                {canSeeFull ? <Th>Tipo de ação</Th> : <Th>Corretor parceiro</Th>}
                <Th>Cidade</Th>
                <Th>Imobiliária</Th>
                {canSeeFull && <Th>Custo</Th>}
                {canSeeFull && <Th>Cadastrado por</Th>}
                {canSeeFull && <Th>Status</Th>}
                <Th>Ações</Th>
              </tr>
            </thead>
            <tbody>
              {rodadasOrdenadas.map((r) => {
                const status = statusDe(r);
                const statusConfig = STATUS_APROVACAO_CONFIG[status];
                const StatusIcon = statusConfig.icon;
                return (
                <tr
                  key={r.id}
                  onClick={() => openRodada(r)}
                  className="border-b bg-white hover:bg-gray-50 transition-colors cursor-pointer"
                  style={{ borderColor: '#f9fafb' }}
                >
                  <td className="px-4 py-3 text-gray-800 whitespace-nowrap">
                    {formatDateKeyBR(r.dataInicio)} {r.dataInicio !== r.dataFim && <>– {formatDateKeyBR(r.dataFim)}</>}
                  </td>
                  {isRodadaCompleta(r) ? (
                    <td className="px-4 py-3 text-gray-800">{TIPO_ACAO_LABELS[r.tipoAcao]}</td>
                  ) : (
                    <td className="px-4 py-3 text-gray-800">{r.responsavelImobiliaria || '—'}</td>
                  )}
                  <td className="px-4 py-3 text-gray-600">{r.cidade}</td>
                  <td className="px-4 py-3 text-gray-600">{r.imobiliaria}</td>
                  {isRodadaCompleta(r) && (
                    <td className="px-4 py-3 font-semibold" style={{ color: '#d55006' }}>{formatCurrency(r.custoRodada)}</td>
                  )}
                  {isRodadaCompleta(r) && (
                    <td className="px-4 py-3 text-xs text-gray-400">{r.criadoPorNome}</td>
                  )}
                  {canSeeFull && (
                    <td className="px-4 py-3">
                      <span
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold"
                        style={{ backgroundColor: statusConfig.bg, color: statusConfig.text }}
                      >
                        <StatusIcon size={11} /> {statusConfig.label}
                      </span>
                      {/* O recado da Diretoria fica na linha, não só no tooltip: é o que a
                          pessoa precisa ler para saber o que ajustar. */}
                      {isRodadaCompleta(r) && r.motivoRecusa && (status === 'recusada' || status === 'correcao_solicitada') && (
                        <p className="text-xs text-gray-500 mt-1 max-w-[260px] whitespace-normal" title={r.motivoRecusa}>
                          {r.motivoRecusa}
                        </p>
                      )}
                    </td>
                  )}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      {canApprove && (status === 'pendente' || status === 'correcao_solicitada') && (
                        <>
                          <button
                            onClick={(ev) => { ev.stopPropagation(); handleApprove(r.id); }}
                            disabled={approvingId === r.id}
                            className="w-7 h-7 rounded flex items-center justify-center text-emerald-600 hover:bg-emerald-50 disabled:opacity-50"
                            title="Aprovar"
                          >
                            <Check size={14} />
                          </button>
                          <button
                            onClick={(ev) => { ev.stopPropagation(); setMotivoModal({ id: r.id, modo: 'correcao' }); }}
                            className="w-7 h-7 rounded flex items-center justify-center hover:bg-orange-50"
                            style={{ color: '#c2410c' }}
                            title="Solicitar correção"
                          >
                            <PencilLine size={14} />
                          </button>
                          <button
                            onClick={(ev) => { ev.stopPropagation(); setMotivoModal({ id: r.id, modo: 'recusa' }); }}
                            className="w-7 h-7 rounded flex items-center justify-center text-red-500 hover:bg-red-50"
                            title="Recusar"
                          >
                            <XCircle size={14} />
                          </button>
                        </>
                      )}
                      <span className="w-7 h-7 rounded flex items-center justify-center text-gray-400" title={isReadOnly ? 'Visualizar' : 'Editar'}>
                        <Pencil size={13} />
                      </span>
                      {canDelete && (
                        <button
                          onClick={(ev) => { ev.stopPropagation(); handleDelete(r.id); }}
                          disabled={deletingId === r.id}
                          className="w-7 h-7 rounded flex items-center justify-center text-gray-400 hover:text-red-500 disabled:opacity-50"
                          title="Excluir"
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
                );
              })}
              {rodadasOrdenadas.length === 0 && (
                <tr>
                  <td colSpan={canSeeFull ? 8 : 5} className="py-16 text-center text-gray-400 text-sm">
                    {filtroStatus === 'todas'
                      ? 'Nenhuma rodada cadastrada'
                      : `Nenhuma rodada com a situação "${STATUS_APROVACAO_CONFIG[filtroStatus].label}".`}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Day panel */}
      {dayPanelKey && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center modal-backdrop"
          style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
          onClick={(e) => { if (e.target === e.currentTarget) setDayPanelKey(null); }}
        >
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-2 sm:mx-4 flex flex-col" style={{ maxHeight: '85vh' }}>
            <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: '#e5e7eb' }}>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: '#fff7ed' }}>
                  <CalendarDays size={18} style={{ color: '#d55006' }} />
                </div>
                <h2 className="font-questrial font-bold text-base text-gray-900">{formatDateKeyBR(dayPanelKey)}</h2>
              </div>
              <button onClick={() => setDayPanelKey(null)} className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-100 transition-colors">
                <X size={16} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
              {deleteError && <p className="text-xs text-red-500">{deleteError}</p>}
              {dayPanelRodadas.length === 0 && (
                <p className="text-sm text-gray-400 text-center py-6">Nenhuma rodada cadastrada neste dia.</p>
              )}
              {dayPanelRodadas.map((r) => (
                <button
                  key={r.id}
                  onClick={() => openRodada(r)}
                  className="w-full text-left p-3.5 rounded-xl border hover:border-orange-300 transition-colors"
                  style={{ borderColor: '#e5e7eb', backgroundColor: '#fafafa' }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-900 flex items-center gap-1.5">
                        <User size={13} style={{ color: '#d55006' }} />
                        {isRodadaCompleta(r) ? TIPO_ACAO_LABELS[r.tipoAcao] : r.responsavelImobiliaria || 'Rodada'} — {r.imobiliaria}
                      </p>
                      <p className="text-xs text-gray-500 mt-1 flex items-center gap-1.5">
                        <MapPin size={12} /> {r.cidade}{r.uf ? ` - ${r.uf}` : ''}
                      </p>
                      {isRodadaCompleta(r) && (
                        <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1.5">
                          <Wallet size={12} /> {formatCurrency(r.custoRodada)}
                        </p>
                      )}
                      <p className="text-xs text-gray-400 mt-1.5">
                        {formatDateKeyBR(r.dataInicio)} {r.dataInicio !== r.dataFim && <>a {formatDateKeyBR(r.dataFim)}</>}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <span className="w-7 h-7 rounded flex items-center justify-center text-gray-400" title={isReadOnly ? 'Visualizar' : 'Editar'}>
                        <Pencil size={13} />
                      </span>
                      {canDelete && (
                        <span
                          role="button"
                          onClick={(ev) => { ev.stopPropagation(); handleDelete(r.id); }}
                          className="w-7 h-7 rounded flex items-center justify-center text-gray-400 hover:text-red-500"
                          style={{ opacity: deletingId === r.id ? 0.5 : 1 }}
                          title="Excluir"
                        >
                          <Trash2 size={13} />
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>

            {!isReadOnly && (
              <div className="px-5 py-4 border-t bg-gray-50 rounded-b-2xl" style={{ borderColor: '#e5e7eb' }}>
                <button
                  onClick={() => openNewForm(dayPanelKey)}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold text-white transition-colors hover:opacity-90"
                  style={{ backgroundColor: '#d55006' }}
                >
                  <Plus size={16} /> Nova rodada neste dia
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {formOpen && (
        <RodadaFormModal
          rodada={editingRodada}
          dataInicial={prefillDate}
          onClose={() => setFormOpen(false)}
        />
      )}

      {viewingResumo && (
        <RodadaResumoModal rodada={viewingResumo} onClose={() => setViewingResumo(null)} />
      )}

      {motivoModal && (
        <RodadaMotivoModal
          rodadaId={motivoModal.id}
          modo={motivoModal.modo}
          onClose={() => setMotivoModal(null)}
        />
      )}
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="px-4 py-3 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">
      {children}
    </th>
  );
}
