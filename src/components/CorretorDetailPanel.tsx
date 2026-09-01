import { useEffect, useState } from 'react';
import { differenceInDays } from 'date-fns';
import {
  X, ChevronRight, ChevronLeft, Mail, Building2,
  Users, Clock, Tag, MessageSquare, FileText, Banknote,
  Plus, ExternalLink, CheckCircle2, XCircle, AlertCircle,
  Trash2, ArrowUpRight, Archive, Trophy, Link, Phone,
  Edit3, CalendarClock, CheckCheck, Paperclip, Download,
} from 'lucide-react';
import { useStore, useSelectedCorretor } from '../store';
import { STAGES, CADENCIAS } from '../data';
import {
  formatRelativeTime, formatCurrency, TEMPERATURA_CONFIG,
  TIPO_INTERACAO_CONFIG, getInitials,
  validateForStageMove, formatCurrencyBRL, maskCurrencyBRLInput, parseCurrencyBRL, maskCPF, maskPhone,
} from '../utils';
import { ApiError } from '../api/client';
import { empreendimentosApi } from '../api/endpoints';
import { Combobox } from './Combobox';
import { NewClienteModal } from './NewClienteModal';
import { UF_OPTIONS, useCidadesPorUf } from '../lib/ibge';
import { canWriteCorretor, canDeleteLeadClienteOuCard, canWhatsappCorretor } from '../permissions';
import { WhatsappSendModal } from './WhatsappSendModal';
import type { TipoInteracao, Temperatura, TipoInteresse, CanalOrigem, Corretor, Unidade } from '../types';

function alertError(err: unknown, fallback: string) {
  alert(err instanceof ApiError ? err.message : fallback);
}

type TabId = 'geral' | 'clientes' | 'atividades' | 'propostas' | 'cadencia';

export function CorretorDetailPanel() {
  const corretorOrNull = useSelectedCorretor();
  const corretor = corretorOrNull!;

  // Aba Geral: os campos abrem TRAVADOS (só leitura). Clicando em "Editar dados" eles
  // liberam, as mudanças ficam num rascunho local (`draft`) e só vão pra API quando o
  // usuário clica em "Salvar" — antes cada tecla disparava um PATCH + re-render da base
  // inteira de corretores, o que deixava o painel lento.
  const [editingGeral, setEditingGeral] = useState(false);
  const [draft, setDraft] = useState<Partial<Corretor>>({});
  const ufAtual = ((editingGeral && 'uf' in draft ? (draft.uf as string | undefined) : corretor?.uf) ?? '');
  const cidadesOptions = useCidadesPorUf(ufAtual);

  const setSelectedCorretor = useStore((s) => s.setSelectedCorretor);
  const currentUser = useStore((s) => s.currentUser);
  // "Somente leitura" agora segue a posse do card: Diretoria sempre edita; SDR/GV/GR só no
  // próprio kanban; Marketing/Administrativo/Recepção nunca escrevem em corretores.
  const isReadOnly = !canWriteCorretor(currentUser, corretor);
  const canDelete = canDeleteLeadClienteOuCard(currentUser);
  const canaisOrigem = useStore((s) => s.canaisOrigem);
  const imobiliariasOptions = useStore((s) => s.imobiliariasOptions);
  const tiposInteresseOptions = useStore((s) => s.tiposInteresseOptions);
  const condicoesPagamentoOptions = useStore((s) => s.condicoesPagamentoOptions);
  const updateCorretor = useStore((s) => s.updateCorretor);
  const moveCorretor = useStore((s) => s.moveCorretor);
  const addInteracao = useStore((s) => s.addInteracao);
  const removeClienteFinal = useStore((s) => s.removeClienteFinal);
  const addProposta = useStore((s) => s.addProposta);
  const updateProposta = useStore((s) => s.updateProposta);
  const downloadPropostaAnexo = useStore((s) => s.downloadPropostaAnexo);
  const gerarNegocio = useStore((s) => s.gerarNegocio);
  const archiveCorretor = useStore((s) => s.archiveCorretor);
  const markAsWon = useStore((s) => s.markAsWon);
  const corretores = useStore((s) => s.corretores);
  const users = useStore((s) => s.users);
  const hydrateCorretorDetail = useStore((s) => s.hydrateCorretorDetail);
  const empreendimentos = useStore((s) => s.empreendimentos);
  const ensureEmpreendimentosLoaded = useStore((s) => s.ensureEmpreendimentosLoaded);

  // A listagem não traz mais interacoes/propostas completos (ver corretorListInclude no
  // backend) — ao abrir o painel de um corretor, busca o registro completo e substitui a
  // entrada leve no store, igual ao que addInteracao/addProposta já fazem depois de escrever.
  useEffect(() => {
    if (corretorOrNull?.id) hydrateCorretorDetail(corretorOrNull.id).catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [corretorOrNull?.id]);

  // Ao trocar de corretor, sai do modo edição e joga fora qualquer rascunho não salvo.
  useEffect(() => {
    setEditingGeral(false);
    setDraft({});
  }, [corretorOrNull?.id]);

  const sdrNames = users.filter((u) => u.cargo === 'SDR' && u.ativo).map((u) => u.nome);
  const grNames = users.filter((u) => u.cargo === 'GR' && u.ativo).map((u) => u.nome);
  const gvNames = users.filter((u) => u.cargo === 'GV' && u.ativo).map((u) => u.nome);

  /** Valor exibido de um campo da aba Geral: o do rascunho se já foi mexido, senão o salvo. */
  function shown<K extends keyof Corretor>(key: K): Corretor[K] {
    return (key in draft ? draft[key] : corretor[key]) as Corretor[K];
  }
  function patchDraft(updates: Partial<Corretor>) {
    setDraft((d) => ({ ...d, ...updates }));
  }
  async function handleSaveGeral() {
    if (Object.keys(draft).length === 0) {
      setEditingGeral(false);
      return;
    }
    try {
      await updateCorretor(corretor.id, draft);
      setDraft({});
      setEditingGeral(false);
    } catch (err) {
      alertError(err, 'Não foi possível salvar as alterações.');
    }
  }
  function handleCancelGeral() {
    setDraft({});
    setEditingGeral(false);
  }

  const [tab, setTab] = useState<TabId>('geral');
  const [stageError, setStageError] = useState<string[]>([]);
  const [showArchiveConfirm, setShowArchiveConfirm] = useState(false);
  const [showWonConfirm, setShowWonConfirm] = useState(false);
  const [wonValue, setWonValue] = useState('');
  const [archiveReason, setArchiveReason] = useState('');

  // Atividade form — "Quem realizou" é um select dos usuários do sistema e sempre abre já
  // apontando pra quem está logado criando o registro.
  const [showActivityForm, setShowActivityForm] = useState(false);
  const [actType, setActType] = useState<TipoInteracao>('nota');
  const [actResumo, setActResumo] = useState('');
  const [actResponsavel, setActResponsavel] = useState(currentUser?.nome ?? '');
  useEffect(() => {
    if (showActivityForm) setActResponsavel(currentUser?.nome ?? '');
  }, [showActivityForm, currentUser?.nome]);

  // Cliente — usa o mesmo modal da tela de Clientes (NewClienteModal), já com este corretor
  // pré-selecionado como responsável.
  const [showClienteModal, setShowClienteModal] = useState(false);
  const [showWhatsappModal, setShowWhatsappModal] = useState(false);

  // Proposta form
  const [showPropostaForm, setShowPropostaForm] = useState(false);
  const [pEmp, setPEmp] = useState('');
  const [pUnidade, setPUnidade] = useState('');
  const [pValor, setPValor] = useState('');
  const [pCondicoes, setPCondicoes] = useState('');
  const [pClienteNome, setPClienteNome] = useState('');
  const [pClienteId, setPClienteId] = useState('');
  const [pArquivo, setPArquivo] = useState<File | null>(null);
  const [pSubmitting, setPSubmitting] = useState(false);
  // Empreendimento (id do selecionado) + unidades carregadas sob demanda desse empreendimento.
  const [pEmpId, setPEmpId] = useState('');
  const [pUnidades, setPUnidades] = useState<Unidade[]>([]);
  const [pUnidadesLoading, setPUnidadesLoading] = useState(false);
  const pUnidadesDisponiveis = pUnidades.filter((u) => u.status === 'disponivel');

  // Ao abrir o formulário de proposta, garante a lista de empreendimentos carregada.
  useEffect(() => {
    if (showPropostaForm) ensureEmpreendimentosLoaded().catch(() => undefined);
  }, [showPropostaForm, ensureEmpreendimentosLoaded]);

  // Ao escolher um empreendimento, busca as unidades dele (o dropdown de unidade só habilita depois disso).
  useEffect(() => {
    if (!pEmpId) {
      setPUnidades([]);
      return;
    }
    let cancelled = false;
    setPUnidadesLoading(true);
    empreendimentosApi
      .get(pEmpId)
      .then((detail) => { if (!cancelled) setPUnidades(detail.unidades); })
      .catch(() => { if (!cancelled) setPUnidades([]); })
      .finally(() => { if (!cancelled) setPUnidadesLoading(false); });
    return () => { cancelled = true; };
  }, [pEmpId]);

  const [ticketMedioInput, setTicketMedioInput] = useState('');
  useEffect(() => {
    // Ressincroniza também ao sair do modo edição (Cancelar), pra descartar o que foi digitado.
    setTicketMedioInput(corretorOrNull?.ticketMedio ? formatCurrencyBRL(corretorOrNull.ticketMedio) : '');
  }, [corretorOrNull?.id, corretorOrNull?.ticketMedio, editingGeral]);

  if (!corretorOrNull) return null;

  const stage = STAGES.find((s) => s.id === corretor.etapa)!;
  const prevStage = STAGES.find((s) => s.id === corretor.etapa - 1);
  const nextStage = STAGES.find((s) => s.id === corretor.etapa + 1);
  const isNegocio = Boolean(corretor.parentCorretorId);
  const parentCorretor = corretor.parentCorretorId ? corretores.find((l) => l.id === corretor.parentCorretorId) : null;
  const tempConfig = TEMPERATURA_CONFIG[corretor.temperatura];

  async function handleMoveStage(direction: 'next' | 'prev') {
    const targetEtapa = direction === 'next' ? corretor.etapa + 1 : corretor.etapa - 1;
    if (targetEtapa < 1 || targetEtapa > 10) return;
    const errors = validateForStageMove(corretor, targetEtapa);
    if (errors.length > 0) { setStageError(errors); return; }
    setStageError([]);
    try {
      await moveCorretor(corretor.id, targetEtapa);
      await addInteracao(corretor.id, {
        data: new Date().toISOString(),
        tipo: 'nota',
        resumo: `Avançou para etapa ${targetEtapa}: ${STAGES.find((s) => s.id === targetEtapa)?.nome}`,
        responsavel: 'Sistema',
        etapa: corretor.etapa,
      });
    } catch (err) {
      alertError(err, 'Não foi possível mover o corretor de etapa.');
    }
  }

  async function handleMoveToStage(targetEtapa: number) {
    if (targetEtapa === corretor.etapa) return;
    setStageError([]);
    try {
      await moveCorretor(corretor.id, targetEtapa);
      await addInteracao(corretor.id, {
        data: new Date().toISOString(),
        tipo: 'nota',
        resumo: `Movido para etapa ${targetEtapa}: ${STAGES.find((s) => s.id === targetEtapa)?.nome}`,
        responsavel: 'Sistema',
        etapa: corretor.etapa,
      });
    } catch (err) {
      alertError(err, 'Não foi possível mover o corretor de etapa.');
    }
  }

  async function handleSaveActivity() {
    if (!actResumo.trim()) return;
    try {
      await addInteracao(corretor.id, {
        data: new Date().toISOString(),
        tipo: actType,
        resumo: actResumo.trim(),
        responsavel: actResponsavel || 'Não informado',
        etapa: corretor.etapa,
      });
      setActResumo(''); setActType('nota'); setActResponsavel(currentUser?.nome ?? '');
      setShowActivityForm(false);
    } catch (err) {
      alertError(err, 'Não foi possível registrar a atividade.');
    }
  }

  async function handleSaveProposta() {
    if (!pEmp.trim() || !pUnidade.trim() || !pValor.trim()) return;
    setPSubmitting(true);
    try {
      await addProposta(corretor.id, {
        clienteFinalId: pClienteId || undefined,
        clienteFinalNome: pClienteNome || undefined,
        data: new Date().toISOString(),
        empreendimento: pEmp.trim(),
        unidade: pUnidade.trim(),
        valor: parseCurrencyBRL(pValor) ?? 0,
        condicoes: pCondicoes.trim(),
        status: 'pendente',
      }, pArquivo ?? undefined);
      await addInteracao(corretor.id, {
        data: new Date().toISOString(),
        tipo: 'proposta',
        resumo: `Proposta enviada: ${pEmp} — ${pUnidade} — ${pValor}`,
        responsavel: corretor.responsavelGV || 'GV',
        etapa: corretor.etapa,
      });
      setPEmp(''); setPEmpId(''); setPUnidades([]); setPUnidade(''); setPValor(''); setPCondicoes(''); setPClienteNome(''); setPClienteId(''); setPArquivo(null);
      setShowPropostaForm(false);
    } catch (err) {
      alertError(err, 'Não foi possível registrar a proposta.');
    } finally {
      setPSubmitting(false);
    }
  }

  async function handleGerarNegocio(cfId: string) {
    try {
      const newId = await gerarNegocio(corretor.id, cfId);
      setSelectedCorretor(newId);
    } catch (err) {
      alertError(err, 'Não foi possível gerar o negócio.');
    }
  }

  async function handleWon() {
    const v = parseCurrencyBRL(wonValue) ?? 0;
    try {
      await markAsWon(corretor.id, v);
      setShowWonConfirm(false);
      setSelectedCorretor(null);
    } catch (err) {
      alertError(err, 'Não foi possível marcar o corretor como ganho.');
    }
  }

  async function handleArchive() {
    if (!archiveReason.trim()) return;
    try {
      await archiveCorretor(corretor.id, archiveReason.trim());
      setShowArchiveConfirm(false);
      setSelectedCorretor(null);
    } catch (err) {
      alertError(err, 'Não foi possível arquivar o corretor.');
    }
  }

  function toggleInteresse(id: TipoInteresse) {
    const current = shown('tiposInteresse');
    const updated = current.includes(id) ? current.filter((i) => i !== id) : [...current, id];
    patchDraft({ tiposInteresse: updated });
  }

  const tabs: { id: TabId; label: string; icon: React.ElementType; count?: number }[] = [
    { id: 'geral', label: 'Geral', icon: Tag },
    { id: 'clientes', label: 'Clientes', icon: Users, count: corretor.clientesFinais.length },
    { id: 'atividades', label: 'Atividades', icon: MessageSquare, count: corretor.interacoes.length },
    { id: 'propostas', label: 'Propostas', icon: FileText, count: corretor.propostas.length },
    { id: 'cadencia', label: 'Cadência', icon: CalendarClock },
  ];

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 z-30 modal-backdrop"
        style={{ backgroundColor: 'rgba(0,0,0,0.25)' }}
        onClick={() => { setSelectedCorretor(null); setStageError([]); }}
      />

      {/* Panel */}
      <div
        className="fixed right-0 top-0 bottom-0 z-40 flex flex-col bg-white detail-panel w-full sm:w-[520px]"
        style={{ boxShadow: '-4px 0 32px rgba(0,0,0,0.15)' }}
      >
        {/* Panel Header */}
        <div className="flex-shrink-0 border-b" style={{ borderColor: '#e5e7eb' }}>
          {/* Top bar */}
          <div className="flex items-center justify-between px-5 pt-5 pb-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 text-white text-sm font-bold"
                style={{ backgroundColor: stage.cor, fontFamily: 'Plus Jakarta Sans, sans-serif' }}
              >
                {corretor.etapa}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  {isNegocio && <Link size={12} style={{ color: stage.cor }} />}
                  <h2
                    className="font-bold text-base text-gray-900 truncate"
                    style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}
                  >
                    {isNegocio && corretor.clienteFinalNome ? corretor.clienteFinalNome : corretor.nomeCorretor}
                  </h2>
                </div>
                {isNegocio && parentCorretor && (
                  <p className="text-xs text-gray-400 truncate">
                    via {parentCorretor.nomeCorretor} · {parentCorretor.imobiliaria}
                  </p>
                )}
                {!isNegocio && (
                  <p className="text-xs text-gray-400 truncate">{corretor.imobiliaria || 'Sem imobiliária'}</p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              {canWhatsappCorretor(currentUser, corretor) && (
                <button
                  onClick={() => setShowWhatsappModal(true)}
                  title="Enviar WhatsApp"
                  className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
                  style={{ color: '#059669', backgroundColor: '#ecfdf5' }}
                >
                  <MessageSquare size={15} />
                </button>
              )}
              <span
                className="text-xs px-2.5 py-1 rounded-full font-semibold"
                style={{ backgroundColor: tempConfig.bg, color: tempConfig.text }}
              >
                {tempConfig.label}
              </span>
              <button
                onClick={() => { setSelectedCorretor(null); setStageError([]); }}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Stage navigator */}
          <fieldset disabled={isReadOnly} className="border-0 m-0 min-w-0 pt-0 px-5 pb-3">
            <div className="flex items-center gap-2 p-2 rounded-xl" style={{ backgroundColor: '#f8f9fa' }}>
              <button
                onClick={() => handleMoveStage('prev')}
                disabled={!prevStage}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-500 hover:bg-white hover:shadow-sm disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >
                <ChevronLeft size={16} />
              </button>
              <div className="flex-1 text-center">
                <div className="flex items-center justify-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: stage.cor }} />
                  <span className="text-sm font-semibold" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', color: '#1e1e1e' }}>
                    {corretor.etapa}. {stage.nome}
                  </span>
                </div>
                <p className="text-xs text-gray-400 mt-0.5">SLA: {stage.slaLabel}</p>
              </div>
              <button
                onClick={() => handleMoveStage('next')}
                disabled={!nextStage || corretor.etapa === 10}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-500 hover:bg-white hover:shadow-sm disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >
                <ChevronRight size={16} />
              </button>
            </div>

            {/* Quick stage jump */}
            <div className="mt-2 flex gap-1 flex-wrap">
              {STAGES.filter((s) => s.id !== corretor.etapa).map((s) => (
                <button
                  key={s.id}
                  onClick={() => handleMoveToStage(s.id)}
                  className="text-xs px-2 py-1 rounded-lg font-medium transition-all hover:opacity-80"
                  style={{ backgroundColor: `${s.cor}15`, color: s.cor, border: `1px solid ${s.cor}30` }}
                  title={`Mover para ${s.nome}`}
                >
                  {s.id}. {s.nomeAbrev}
                </button>
              ))}
            </div>

            {stageError.length > 0 && (
              <div className="mt-2 p-2.5 rounded-xl flex gap-2" style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca' }}>
                <AlertCircle size={14} className="text-red-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-semibold text-red-700">Campos obrigatórios antes de avançar:</p>
                  <ul className="text-xs text-red-600 mt-0.5 space-y-0.5">
                    {stageError.map((e) => <li key={e}>• {e}</li>)}
                  </ul>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2 mt-2">
              {corretor.etapa >= 9 && corretor.status !== 'ganho' && (
                <button
                  onClick={() => setShowWonConfirm(true)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold text-white transition-colors"
                  style={{ backgroundColor: '#059669' }}
                >
                  <Trophy size={13} />
                  Marcar como Ganho
                </button>
              )}
              <button
                onClick={() => setShowArchiveConfirm(true)}
                className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-gray-600 hover:bg-gray-100 border transition-colors"
                style={{ borderColor: '#e5e7eb' }}
              >
                <Archive size={13} />
                Arquivar
              </button>
            </div>
          </fieldset>

          {/* Tabs */}
          <div className="flex border-t px-4 overflow-x-auto" style={{ borderColor: '#e5e7eb' }}>
            {tabs.map(({ id, label, icon: Icon, count }) => (
              <button
                key={id}
                onClick={() => setTab(id)}
                className={`flex items-center gap-1.5 px-3 py-3 text-xs font-semibold transition-colors flex-shrink-0 whitespace-nowrap ${
                  tab === id
                    ? 'tab-active'
                    : 'text-gray-400 hover:text-gray-600 border-b-2 border-transparent'
                }`}
              >
                <Icon size={13} />
                {label}
                {count !== undefined && count > 0 && (
                  <span
                    className="px-1.5 py-0.5 rounded-full text-white leading-none"
                    style={{ backgroundColor: tab === id ? '#d55006' : '#9ca3af', fontSize: '10px' }}
                  >
                    {count}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Panel Body */}
        <div className="flex-1 overflow-y-auto">

          {/* ─── GERAL TAB — só edita depois de clicar em "Editar dados" ─── */}
          {tab === 'geral' && (
            <>
              {!isReadOnly && (
                <div className="flex items-center justify-end gap-2 px-5 pt-4">
                  {editingGeral ? (
                    <>
                      <button
                        onClick={handleCancelGeral}
                        className="px-3 py-1.5 rounded-xl text-xs font-semibold text-gray-500 hover:bg-gray-100 transition-colors"
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={handleSaveGeral}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-white transition-colors"
                        style={{ backgroundColor: '#d55006' }}
                      >
                        <CheckCheck size={13} />
                        Salvar alterações
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => setEditingGeral(true)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors hover:bg-gray-50"
                      style={{ borderColor: '#e5e7eb', color: '#374151' }}
                    >
                      <Edit3 size={13} />
                      Editar dados
                    </button>
                  )}
                </div>
              )}

              <fieldset disabled={isReadOnly || !editingGeral} className="border-0 m-0 min-w-0 px-5 pb-5 pt-3 space-y-5">
              {/* Corretor */}
              <Section title="Dados do Corretor" icon={<Building2 size={14} style={{ color: '#d55006' }} />}>
                <div className="space-y-3">
                  <EditField
                    label="Nome completo"
                    value={shown('nomeCorretor')}
                    onChange={(v) => patchDraft({ nomeCorretor: v })}
                    placeholder="Nome do corretor"
                    disabled={isReadOnly || !editingGeral}
                  />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <EditFieldLink
                      label="Telefone"
                      value={maskPhone(shown('telefoneCorretor'))}
                      onChange={(v) => patchDraft({ telefoneCorretor: maskPhone(v) })}
                      href={`tel:${corretor.telefoneCorretor.replace(/\D/g, '')}`}
                      icon={<Phone size={11} />}
                      placeholder="(11) 99999-9999"
                      disabled={isReadOnly || !editingGeral}
                    />
                    <EditFieldLink
                      label="WhatsApp"
                      value={maskPhone(shown('whatsappCorretor'))}
                      onChange={(v) => patchDraft({ whatsappCorretor: maskPhone(v) })}
                      href={`https://wa.me/55${corretor.whatsappCorretor.replace(/\D/g, '')}`}
                      icon={<ExternalLink size={11} />}
                      placeholder="(11) 99999-9999"
                      disabled={isReadOnly || !editingGeral}
                    />
                  </div>
                  <EditFieldLink
                    label="E-mail"
                    value={shown('emailCorretor')}
                    onChange={(v) => patchDraft({ emailCorretor: v })}
                    href={`mailto:${corretor.emailCorretor}`}
                    icon={<Mail size={11} />}
                    placeholder="email@imobiliaria.com"
                    type="email"
                    disabled={isReadOnly || !editingGeral}
                  />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <p className="text-xs text-gray-400 mb-1">Imobiliária</p>
                      <select
                        className="form-input text-sm"
                        value={shown('imobiliaria')}
                        onChange={(e) => patchDraft({ imobiliaria: e.target.value })}
                      >
                        <option value="">Selecionar...</option>
                        {imobiliariasOptions.filter((i) => i.ativo).map((i) => (
                          <option key={i.id} value={i.nome}>{i.nome}</option>
                        ))}
                        {shown('imobiliaria') && !imobiliariasOptions.some((i) => i.nome === shown('imobiliaria')) && (
                          <option value={shown('imobiliaria')}>{shown('imobiliaria')}</option>
                        )}
                      </select>
                    </div>
                    <EditField
                      label="Ticket médio"
                      value={ticketMedioInput}
                      onChange={(v) => {
                        const masked = maskCurrencyBRLInput(v);
                        setTicketMedioInput(masked);
                        patchDraft({ ticketMedio: parseCurrencyBRL(masked) });
                      }}
                      placeholder="R$ 0,00"
                      disabled={isReadOnly || !editingGeral}
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <EditField
                      label="CPF"
                      value={shown('cpf') ?? ''}
                      onChange={(v) => patchDraft({ cpf: maskCPF(v) })}
                      placeholder="000.000.000-00"
                      disabled={isReadOnly || !editingGeral}
                    />
                    <EditField
                      label="CRECI"
                      value={shown('creci') ?? ''}
                      onChange={(v) => patchDraft({ creci: v })}
                      placeholder="Ex: 123456-F"
                      disabled={isReadOnly || !editingGeral}
                    />
                  </div>
                  <EditField
                    label="Data de nascimento"
                    type="date"
                    value={(shown('dataNascimento') ?? '').substring(0, 10)}
                    onChange={(v) => patchDraft({ dataNascimento: v ? new Date(v).toISOString() : undefined })}
                    disabled={isReadOnly || !editingGeral}
                  />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <p className="text-xs text-gray-400 mb-1">Estado</p>
                      <select
                        className="form-input text-sm"
                        value={shown('uf') ?? ''}
                        onChange={(e) => patchDraft({ uf: e.target.value, cidade: '' })}
                      >
                        <option value="">Selecionar...</option>
                        {UF_OPTIONS.map((u) => <option key={u.sigla} value={u.sigla}>{u.nome}</option>)}
                      </select>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 mb-1">Cidade</p>
                      <Combobox
                        value={shown('cidade') ?? ''}
                        onChange={(v) => patchDraft({ cidade: v })}
                        options={cidadesOptions.map((c) => ({ id: c, label: c }))}
                        placeholder={ufAtual ? 'Buscar cidade...' : 'Selecione o estado primeiro'}
                        disabled={isReadOnly || !editingGeral || !ufAtual}
                        className="w-full text-sm font-medium rounded-lg px-2.5 py-1.5 border transition-colors focus:outline-none disabled:opacity-60 disabled:cursor-not-allowed"
                      />
                    </div>
                  </div>
                </div>
              </Section>

              {/* Qualificação */}
              <Section title="Perfil de Qualificação" icon={<Tag size={14} style={{ color: '#d55006' }} />}>
                <div className="space-y-3">
                  <div>
                    <p className="text-xs text-gray-400 mb-2">Tipo de interesse</p>
                    <div className="flex flex-wrap gap-1.5">
                      {[
                        ...tiposInteresseOptions.filter((t) => t.ativo).map((t) => t.nome),
                        ...shown('tiposInteresse').filter((nome) => !tiposInteresseOptions.some((t) => t.nome === nome)),
                      ].map((nome) => {
                        const active = shown('tiposInteresse').includes(nome);
                        return (
                          <button
                            key={nome}
                            onClick={() => toggleInteresse(nome)}
                            className="text-xs px-3 py-1.5 rounded-full font-semibold border-2 transition-all disabled:opacity-60"
                            style={
                              active
                                ? { backgroundColor: '#d55006', color: '#fff', borderColor: '#d55006' }
                                : { backgroundColor: '#fff', color: '#9ca3af', borderColor: '#e5e7eb' }
                            }
                          >
                            {nome}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { field: 'possuiInvestidores' as const, label: 'Tem investidores' },
                      { field: 'potencialParceria' as const, label: '+2.5M potencial' },
                      { field: 'treinamento' as const, label: 'No treinamento' },
                    ].map(({ field, label }) => {
                      const active = Boolean(shown(field));
                      return (
                        <button
                          key={field}
                          onClick={() => patchDraft({ [field]: !active } as Partial<Corretor>)}
                          className="flex items-center gap-1.5 px-2.5 py-2 rounded-xl text-xs font-semibold border-2 transition-all disabled:opacity-60"
                          style={
                            active
                              ? { backgroundColor: '#ecfdf5', color: '#059669', borderColor: '#6ee7b7' }
                              : { backgroundColor: '#f9fafb', color: '#9ca3af', borderColor: '#e5e7eb' }
                          }
                        >
                          {active ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                          {label}
                        </button>
                      );
                    })}
                  </div>

                  {shown('treinamento') && (
                    <div>
                      <p className="text-xs text-gray-400 mb-2">Datas do treinamento</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <p className="text-xs text-gray-400 mb-1">Agendamento</p>
                          <input
                            type="date"
                            className="form-input text-sm"
                            value={(shown('dataAgendamentoTreinamento') ?? '').substring(0, 10)}
                            onChange={(e) => patchDraft({ dataAgendamentoTreinamento: e.target.value ? new Date(e.target.value).toISOString() : undefined })}
                          />
                        </div>
                        <div>
                          <p className="text-xs text-gray-400 mb-1">Realização</p>
                          <input
                            type="date"
                            className="form-input text-sm"
                            value={(shown('dataRealizacaoTreinamento') ?? '').substring(0, 10)}
                            onChange={(e) => patchDraft({ dataRealizacaoTreinamento: e.target.value ? new Date(e.target.value).toISOString() : undefined })}
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </Section>

              {/* Pipeline */}
              <Section title="Pipeline & Origem" icon={<Clock size={14} style={{ color: '#d55006' }} />}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-gray-400 mb-1">Canal de origem</p>
                    <select
                      className="form-input text-sm"
                      value={shown('canalOrigem')}
                      onChange={(e) => patchDraft({ canalOrigem: e.target.value as CanalOrigem })}
                    >
                      {canaisOrigem.map((c) => <option key={c.id} value={c.nome}>{c.nome}</option>)}
                      {!canaisOrigem.some((c) => c.nome === shown('canalOrigem')) && (
                        <option value={shown('canalOrigem')}>{shown('canalOrigem')}</option>
                      )}
                    </select>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 mb-1">Temperatura</p>
                    <select
                      className="form-input text-sm font-semibold"
                      value={shown('temperatura')}
                      onChange={(e) => patchDraft({ temperatura: e.target.value as Temperatura })}
                      style={{ color: TEMPERATURA_CONFIG[shown('temperatura')].text }}
                    >
                      <option value="quente">🔥 Quente (&lt;30 dias)</option>
                      <option value="morno">🌤 Morno (até 2 meses)</option>
                      <option value="frio">❄️ Frio (&gt;3 meses)</option>
                    </select>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 mb-0.5">Entrada no pipeline</p>
                    <p className="text-sm font-medium text-gray-800">{formatRelativeTime(corretor.dataEntrada)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 mb-0.5">Última interação</p>
                    <p className="text-sm font-medium text-gray-800">{formatRelativeTime(corretor.dataUltimaInteracao)}</p>
                  </div>
                </div>
              </Section>

              {/* Equipe */}
              <Section title="Equipe Responsável" icon={<Users size={14} style={{ color: '#d55006' }} />}>
                <div className="space-y-1">
                  <TeamSelect
                    role="SDR"
                    color="#64748b"
                    value={shown('responsavelSDR')}
                    options={sdrNames}
                    onUpdate={(v) => patchDraft({ responsavelSDR: v })}
                    description="Qualificação e nutrição (etapas 1–5)"
                  />
                  <TeamSelect
                    role="GR — Gerente de Relacionamento"
                    color="#0d9488"
                    value={shown('responsavelGR')}
                    options={grNames}
                    onUpdate={(v) => patchDraft({ responsavelGR: v })}
                    description="Relacionamento ativo e vínculo emocional (etapas 6, 8)"
                  />
                  <TeamSelect
                    role="GV — Gerente de Vendas"
                    color="#d55006"
                    value={shown('responsavelGV')}
                    options={gvNames}
                    onUpdate={(v) => patchDraft({ responsavelGV: v })}
                    description="Proposta, negociação e fechamento (etapas 7–9)"
                  />
                </div>
              </Section>

              {/* Observações */}
              <Section title="Observações" icon={<Edit3 size={14} style={{ color: '#d55006' }} />}>
                <textarea
                  className="w-full text-sm p-3 rounded-xl border resize-none transition-colors focus:outline-none disabled:opacity-60 disabled:bg-gray-50"
                  style={{ borderColor: '#e5e7eb', minHeight: 90 }}
                  onFocus={(e) => (e.target.style.borderColor = '#d55006')}
                  onBlur={(e) => (e.target.style.borderColor = '#e5e7eb')}
                  value={shown('observacoes')}
                  placeholder="Adicione observações, pontos de atenção, contexto do corretor..."
                  onChange={(e) => patchDraft({ observacoes: e.target.value })}
                />
              </Section>
              </fieldset>
            </>
          )}

          {/* ─── CLIENTES FINAIS TAB ─── */}
          {tab === 'clientes' && (
            <fieldset disabled={isReadOnly} className="border-0 m-0 min-w-0 p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-gray-700">
                    {isNegocio ? 'Negócio individual' : `${corretor.clientesFinais.length} cliente${corretor.clientesFinais.length !== 1 ? 's' : ''} cadastrado${corretor.clientesFinais.length !== 1 ? 's' : ''}`}
                  </p>
                  {!isNegocio && (
                    <p className="text-xs text-gray-400 mt-0.5">
                      Clique em "Gerar Negócio" (disponível a partir da etapa 5) para criar um card de negociação por cliente.
                    </p>
                  )}
                </div>
                {!isNegocio && (
                  <button
                    onClick={() => setShowClienteModal(true)}
                    className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl text-white"
                    style={{ backgroundColor: '#d55006' }}
                  >
                    <Plus size={13} />
                    Adicionar
                  </button>
                )}
              </div>

              {!isNegocio && corretor.clientesFinais.length === 0 && (
                <EmptyState icon={<Users size={28} />} title="Nenhum cliente final" description="Adicione os compradores que esse corretor está representando no pipeline." />
              )}

              {!isNegocio && corretor.clientesFinais.map((cf) => (
                <div
                  key={cf.id}
                  className="rounded-xl p-4 border"
                  style={{
                    borderColor: cf.negocioGerado ? '#bbf7d0' : '#e5e7eb',
                    backgroundColor: cf.negocioGerado ? '#f0fdf4' : '#fafafa',
                  }}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
                      style={{ backgroundColor: cf.negocioGerado ? '#059669' : '#64748b', fontFamily: 'Plus Jakarta Sans, sans-serif' }}
                    >
                      {cf.nome[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm text-gray-900" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
                          {cf.nome}
                        </span>
                        {cf.negocioGerado && (
                          <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ backgroundColor: '#dcfce7', color: '#166534' }}>
                            ✓ Negócio gerado
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1 mt-1 text-xs text-gray-500">
                        <Phone size={10} />
                        {cf.telefone}
                      </div>
                      {cf.interesse && <p className="text-xs text-gray-600 mt-1">{cf.interesse}</p>}
                      {cf.orcamento && (
                        <p className="text-xs font-bold mt-1" style={{ color: '#d55006' }}>
                          {formatCurrency(cf.orcamento)}
                        </p>
                      )}
                      {cf.observacoes && <p className="text-xs text-gray-400 mt-1 italic">{cf.observacoes}</p>}
                    </div>
                    <div className="flex flex-col gap-1.5 flex-shrink-0">
                      {!cf.negocioGerado && corretor.etapa >= 5 && (
                        <button
                          onClick={() => handleGerarNegocio(cf.id)}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl text-white"
                          style={{ backgroundColor: '#d55006' }}
                        >
                          <ArrowUpRight size={12} />
                          Gerar Negócio
                        </button>
                      )}
                      {corretor.etapa < 5 && !cf.negocioGerado && (
                        <span className="text-xs px-2 py-1 rounded-lg text-gray-400" style={{ backgroundColor: '#f1f5f9' }}>
                          Disponível na etapa 5+
                        </span>
                      )}
                      {cf.negocioGerado && cf.negocioCorretorId && (
                        <button
                          onClick={() => setSelectedCorretor(cf.negocioCorretorId!)}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl"
                          style={{ backgroundColor: '#dcfce7', color: '#166534' }}
                        >
                          <ExternalLink size={12} />
                          Ver negócio
                        </button>
                      )}
                      {canDelete && (
                        <button
                          onClick={() => removeClienteFinal(corretor.id, cf.id).catch((err) => alertError(err, 'Não foi possível remover o cliente.'))}
                          className="flex items-center gap-1 px-2 py-1.5 text-xs rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors"
                          title="Excluir cliente"
                        >
                          <Trash2 size={11} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </fieldset>
          )}

          {/* ─── ATIVIDADES TAB ─── */}
          {tab === 'atividades' && (
            <fieldset disabled={isReadOnly} className="border-0 m-0 min-w-0 p-5 space-y-4">
              <button
                onClick={() => setShowActivityForm(!showActivityForm)}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold border-2 border-dashed transition-colors"
                style={{
                  borderColor: showActivityForm ? '#d55006' : '#e5e7eb',
                  color: showActivityForm ? '#d55006' : '#9ca3af',
                }}
              >
                <Plus size={15} />
                Registrar atividade
              </button>

              {showActivityForm && (
                <div className="rounded-xl p-4 border space-y-3" style={{ borderColor: '#e5e7eb', backgroundColor: '#fafafa' }}>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-gray-500 block mb-1">Tipo de interação</label>
                      <select
                        className="form-input text-sm"
                        value={actType}
                        onChange={(e) => setActType(e.target.value as TipoInteracao)}
                      >
                        {Object.entries(TIPO_INTERACAO_CONFIG).map(([k, v]) => (
                          <option key={k} value={k}>{v.icon} {v.label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-gray-500 block mb-1">Quem realizou</label>
                      <select
                        className="form-input text-sm"
                        value={actResponsavel}
                        onChange={(e) => setActResponsavel(e.target.value)}
                      >
                        {actResponsavel && !users.some((u) => u.ativo && u.nome === actResponsavel) && (
                          <option value={actResponsavel}>{actResponsavel}</option>
                        )}
                        {users
                          .filter((u) => u.ativo)
                          .slice()
                          .sort((a, b) => a.nome.localeCompare(b.nome))
                          .map((u) => (
                            <option key={u.id} value={u.nome}>{u.nome}</option>
                          ))}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-500 block mb-1">Resumo *</label>
                    <textarea
                      className="form-input resize-none"
                      style={{ minHeight: 80 }}
                      placeholder="Descreva o que aconteceu nessa interação..."
                      value={actResumo}
                      onChange={(e) => setActResumo(e.target.value)}
                    />
                  </div>
                  <div className="flex gap-2">
                    <button onClick={handleSaveActivity} className="px-4 py-2 rounded-xl text-sm font-bold text-white" style={{ backgroundColor: '#d55006' }}>
                      Salvar
                    </button>
                    <button onClick={() => setShowActivityForm(false)} className="px-4 py-2 rounded-xl text-sm text-gray-500 hover:bg-gray-100 transition-colors">
                      Cancelar
                    </button>
                  </div>
                </div>
              )}

              {corretor.interacoes.length === 0 && !showActivityForm && (
                <EmptyState icon={<MessageSquare size={28} />} title="Nenhuma atividade registrada" description="Registre ligações, visitas, mensagens e notas para manter o histórico completo." />
              )}

              <div className="space-y-3">
                {corretor.interacoes.map((inter) => {
                  const config = TIPO_INTERACAO_CONFIG[inter.tipo];
                  const stageInfo = STAGES.find((s) => s.id === inter.etapa);
                  return (
                    <div key={inter.id} className="flex gap-3 p-3 rounded-xl" style={{ backgroundColor: '#f8f9fa' }}>
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 text-base" style={{ backgroundColor: '#fff' }}>
                        {config.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-bold text-gray-700">{config.label}</span>
                          {stageInfo && (
                            <span className="text-xs px-1.5 py-0.5 rounded-md font-medium" style={{ backgroundColor: stageInfo.corBg, color: stageInfo.cor }}>
                              E{stageInfo.id}
                            </span>
                          )}
                          <span className="text-xs text-gray-400 ml-auto">{formatRelativeTime(inter.data)}</span>
                        </div>
                        <p className="text-sm text-gray-700 mt-0.5 leading-relaxed">{inter.resumo}</p>
                        <p className="text-xs text-gray-400 mt-0.5">por {inter.responsavel}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </fieldset>
          )}

          {/* ─── PROPOSTAS TAB ─── */}
          {tab === 'propostas' && (
            <fieldset disabled={isReadOnly} className="border-0 m-0 min-w-0 p-5 space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-500">{corretor.propostas.length} proposta{corretor.propostas.length !== 1 ? 's' : ''}</p>
                <button
                  onClick={() => setShowPropostaForm(true)}
                  className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl text-white"
                  style={{ backgroundColor: '#d55006' }}
                >
                  <Plus size={13} />
                  Nova proposta
                </button>
              </div>

              {showPropostaForm && (
                <div className="rounded-xl p-4 border space-y-3" style={{ borderColor: '#e5e7eb', backgroundColor: '#fafafa' }}>
                  <h4 className="text-sm font-bold text-gray-800" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>Registrar proposta</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="sm:col-span-2">
                      <label className="text-xs font-semibold text-gray-500 block mb-1">Cliente final</label>
                      <select
                        className="form-input text-sm"
                        value={pClienteId}
                        disabled={corretor.clientesFinais.length === 0}
                        onChange={(e) => {
                          const cf = corretor.clientesFinais.find((c) => c.id === e.target.value);
                          setPClienteId(cf?.id ?? '');
                          setPClienteNome(cf?.nome ?? '');
                        }}
                      >
                        <option value="">
                          {corretor.clientesFinais.length === 0
                            ? 'Nenhum cliente cadastrado na aba Clientes'
                            : 'Selecionar cliente...'}
                        </option>
                        {corretor.clientesFinais.map((cf) => (
                          <option key={cf.id} value={cf.id}>
                            {cf.nome}{cf.telefone ? ` — ${cf.telefone}` : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-gray-500 block mb-1">Empreendimento *</label>
                      <select
                        className="form-input text-sm"
                        value={pEmpId}
                        onChange={(e) => {
                          const emp = empreendimentos.find((x) => x.id === e.target.value);
                          setPEmpId(emp?.id ?? '');
                          setPEmp(emp?.nome ?? '');
                          setPUnidade('');
                        }}
                      >
                        <option value="">
                          {empreendimentos.length === 0 ? 'Nenhum empreendimento cadastrado' : 'Selecionar empreendimento...'}
                        </option>
                        {empreendimentos.map((emp) => (
                          <option key={emp.id} value={emp.id}>{emp.nome}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-gray-500 block mb-1">Unidade *</label>
                      <select
                        className="form-input text-sm"
                        value={pUnidade}
                        disabled={!pEmpId || pUnidadesLoading}
                        onChange={(e) => setPUnidade(e.target.value)}
                      >
                        <option value="">
                          {!pEmpId
                            ? 'Selecione o empreendimento primeiro'
                            : pUnidadesLoading
                              ? 'Carregando unidades...'
                              : pUnidadesDisponiveis.length === 0
                                ? 'Nenhuma unidade disponível'
                                : 'Selecionar unidade...'}
                        </option>
                        {pUnidadesDisponiveis.map((u) => (
                          <option key={u.id} value={u.numero}>
                            {u.numero}{u.tipo ? ` — ${u.tipo}` : ''}{u.metragemPrivativa ? ` · ${u.metragemPrivativa} m²` : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-gray-500 block mb-1">Valor *</label>
                      <input className="form-input text-sm" placeholder="R$ 0,00" value={pValor} onChange={(e) => setPValor(maskCurrencyBRLInput(e.target.value))} />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-gray-500 block mb-1">Condições de pagamento</label>
                      <Combobox
                        className="form-input text-sm"
                        placeholder="Buscar ou digitar condição..."
                        value={pCondicoes}
                        onChange={setPCondicoes}
                        options={condicoesPagamentoOptions.filter((c) => c.ativo).map((c) => ({ id: c.id, label: c.nome }))}
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="text-xs font-semibold text-gray-500 block mb-1">Arquivo da proposta</label>
                      {pArquivo ? (
                        <div className="flex items-center gap-2 text-sm px-3 py-2 rounded-lg border" style={{ borderColor: '#e5e7eb' }}>
                          <Paperclip size={13} className="flex-shrink-0 text-gray-400" />
                          <span className="truncate flex-1">{pArquivo.name}</span>
                          <button type="button" onClick={() => setPArquivo(null)} className="text-gray-400 hover:text-red-500 flex-shrink-0">
                            <X size={14} />
                          </button>
                        </div>
                      ) : (
                        <label className="flex items-center gap-2 text-sm px-3 py-2 rounded-lg border cursor-pointer text-gray-500 hover:bg-gray-100 transition-colors" style={{ borderColor: '#e5e7eb' }}>
                          <Paperclip size={13} className="flex-shrink-0" />
                          Anexar arquivo (PDF, Word, Excel ou imagem)
                          <input
                            type="file"
                            className="hidden"
                            accept=".pdf,.doc,.docx,.xls,.xlsx,image/jpeg,image/png"
                            onChange={(e) => setPArquivo(e.target.files?.[0] ?? null)}
                          />
                        </label>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={handleSaveProposta} disabled={pSubmitting} className="px-4 py-2 rounded-xl text-sm font-bold text-white disabled:opacity-60" style={{ backgroundColor: '#d55006' }}>
                      {pSubmitting ? 'Salvando...' : 'Salvar'}
                    </button>
                    <button onClick={() => setShowPropostaForm(false)} className="px-4 py-2 rounded-xl text-sm text-gray-500 hover:bg-gray-100">Cancelar</button>
                  </div>
                </div>
              )}

              {corretor.propostas.length === 0 && !showPropostaForm && (
                <EmptyState icon={<Banknote size={28} />} title="Sem propostas" description="Registre as propostas formais apresentadas ao corretor e ao cliente." />
              )}

              {corretor.propostas.map((p) => {
                const statusMap = {
                  pendente: { icon: <Clock size={13} />, bg: '#fef9c3', text: '#854d0e', label: 'Aguardando retorno' },
                  aceita: { icon: <CheckCircle2 size={13} />, bg: '#dcfce7', text: '#166534', label: 'Aceita' },
                  recusada: { icon: <XCircle size={13} />, bg: '#fee2e2', text: '#b91c1c', label: 'Recusada' },
                };
                const st = statusMap[p.status];
                return (
                  <div key={p.id} className="rounded-xl p-4 border" style={{ borderColor: '#e5e7eb' }}>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        {p.clienteFinalNome && (
                          <div className="flex items-center gap-1.5 mb-2">
                            <Users size={11} className="text-gray-400" />
                            <span className="text-xs text-gray-500">{p.clienteFinalNome}</span>
                          </div>
                        )}
                        <p className="font-bold text-sm text-gray-900" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
                          {p.empreendimento} — {p.unidade}
                        </p>
                        <p className="text-xl font-bold mt-1" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', color: '#d55006' }}>
                          {formatCurrency(p.valor)}
                        </p>
                        {p.condicoes && <p className="text-xs text-gray-500 mt-1">{p.condicoes}</p>}
                        <p className="text-xs text-gray-400 mt-1">{formatRelativeTime(p.data)}</p>
                        {p.anexoNome && (
                          <button
                            onClick={() => downloadPropostaAnexo(corretor.id, p.id, p.anexoNome!).catch((err) => alertError(err, 'Não foi possível baixar o anexo.'))}
                            className="flex items-center gap-1 text-xs mt-1.5 hover:underline"
                            style={{ color: '#d55006' }}
                          >
                            <Download size={11} />
                            {p.anexoNome}
                          </button>
                        )}
                      </div>
                      <div className="flex flex-col gap-2 flex-shrink-0">
                        <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold" style={{ backgroundColor: st.bg, color: st.text }}>
                          {st.icon} {st.label}
                        </span>
                        {p.status === 'pendente' && (
                          <div className="flex gap-1">
                            <button onClick={() => updateProposta(corretor.id, p.id, { status: 'aceita' }).catch((err) => alertError(err, 'Não foi possível atualizar a proposta.'))} className="flex-1 px-2 py-1.5 text-xs rounded-lg font-bold text-white" style={{ backgroundColor: '#059669' }}>Aceitar</button>
                            <button onClick={() => updateProposta(corretor.id, p.id, { status: 'recusada' }).catch((err) => alertError(err, 'Não foi possível atualizar a proposta.'))} className="flex-1 px-2 py-1.5 text-xs rounded-lg font-bold text-white" style={{ backgroundColor: '#dc2626' }}>Recusar</button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </fieldset>
          )}

          {/* ─── CADÊNCIA TAB ─── */}
          {tab === 'cadencia' && (
            <div className="p-5 space-y-4">
              {(() => {
                const cadenceRole =
                  corretor.etapa <= 5 ? 'SDR' as const :
                  corretor.etapa === 6 ? 'GR' as const :
                  corretor.etapa <= 9 ? 'GV' as const :
                  null;

                if (!cadenceRole) {
                  return (
                    <div className="py-12 text-center text-gray-400">
                      <CalendarClock size={32} className="mx-auto mb-3 opacity-30" />
                      <p className="text-sm font-medium">Sem cadência padrão</p>
                      <p className="text-xs mt-1">Corretores em Pós-venda (etapa 10) seguem acompanhamento personalizado.</p>
                    </div>
                  );
                }

                const items = CADENCIAS[cadenceRole];
                const stageEnteredAt = corretor.etapaTimestamps?.[corretor.etapa]
                  ? new Date(corretor.etapaTimestamps[corretor.etapa])
                  : new Date(corretor.dataEntrada);
                const now = new Date();
                const daysSinceEntry = differenceInDays(now, stageEnteredAt);
                const roleColors: Record<'SDR' | 'GR' | 'GV', string> = { SDR: '#8b5cf6', GR: '#0d9488', GV: '#3b82f6' };
                const roleColor = roleColors[cadenceRole];

                return (
                  <>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-bold text-gray-700" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
                          Cadência {cadenceRole}
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          Dia {daysSinceEntry} nesta etapa · Entrou {stageEnteredAt.toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                      <span className="text-xs px-2.5 py-1 rounded-full font-bold text-white" style={{ backgroundColor: roleColor }}>
                        {cadenceRole}
                      </span>
                    </div>

                    <div className="space-y-2">
                      {items.map((item, idx) => {
                        const hasInteraction = corretor.interacoes.some(
                          (i) => i.tipo === item.tipo && new Date(i.data) >= stageEnteredAt
                        );
                        const isLate = !hasInteraction && item.dia <= daysSinceEntry;
                        const status = hasInteraction ? 'done' : isLate ? 'late' : 'upcoming';
                        const tipoConfig = TIPO_INTERACAO_CONFIG[item.tipo];
                        const dueDate = new Date(stageEnteredAt.getTime() + item.dia * 86400000);

                        return (
                          <div
                            key={idx}
                            className="flex gap-3 p-3 rounded-xl border"
                            style={{
                              borderColor: status === 'done' ? '#6ee7b7' : status === 'late' ? '#fca5a5' : '#e5e7eb',
                              backgroundColor: status === 'done' ? '#f0fdf4' : status === 'late' ? '#fff1f2' : '#fafafa',
                            }}
                          >
                            <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#fff' }}>
                              {status === 'done' ? <CheckCheck size={14} color="#059669" /> :
                               status === 'late' ? <AlertCircle size={14} color="#dc2626" /> :
                               <Clock size={14} color="#9ca3af" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold" style={{ color: status === 'done' ? '#059669' : status === 'late' ? '#dc2626' : '#374151' }}>
                                  Dia {item.dia} — {item.label}
                                </span>
                                <span className="text-xs ml-auto" style={{ color: status === 'done' ? '#059669' : status === 'late' ? '#dc2626' : '#9ca3af' }}>
                                  {status === 'done' ? 'Realizado' : status === 'late' ? 'Atrasado' : dueDate.toLocaleDateString('pt-BR')}
                                </span>
                              </div>
                              <p className="text-xs text-gray-500 mt-0.5">{item.descricao}</p>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-xs">{tipoConfig.icon}</span>
                                <span className="text-xs text-gray-400">{tipoConfig.label}</span>
                                <span className="text-xs px-1.5 py-0.5 rounded font-medium" style={{ backgroundColor: roleColor + '20', color: roleColor }}>
                                  {item.responsavel}
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </>
                );
              })()}
            </div>
          )}
        </div>
      </div>

      {/* Novo cliente final — mesmo modal da tela de Clientes, já com este corretor como responsável */}
      {showClienteModal && (
        <NewClienteModal
          corretorId={corretor.id}
          onClose={() => setShowClienteModal(false)}
        />
      )}

      {showWhatsappModal && (
        <WhatsappSendModal
          alvo={{ corretorId: corretor.id }}
          nomeDestinatario={corretor.nomeCorretor}
          telefone={corretor.whatsappCorretor || corretor.telefoneCorretor}
          onClose={() => setShowWhatsappModal(false)}
          onSent={() => hydrateCorretorDetail(corretor.id).catch(() => undefined)}
        />
      )}

      {/* Confirm modals */}
      {showArchiveConfirm && (
        <ConfirmModal
          title="Arquivar corretor?"
          description="O corretor será arquivado mas não excluído. Poderá ser reativado manualmente."
          confirmLabel="Arquivar"
          confirmColor="#dc2626"
          onConfirm={handleArchive}
          onCancel={() => setShowArchiveConfirm(false)}
        >
          <textarea
            className="form-input resize-none mt-3"
            style={{ minHeight: 80 }}
            placeholder="Motivo do arquivamento (obrigatório)..."
            value={archiveReason}
            onChange={(e) => setArchiveReason(e.target.value)}
          />
        </ConfirmModal>
      )}

      {showWonConfirm && (
        <ConfirmModal
          title="🏆 Marcar como Ganho!"
          description="Confirme o valor da venda para registrar o fechamento e notificar a Diretoria."
          confirmLabel="Confirmar Ganho"
          confirmColor="#059669"
          onConfirm={handleWon}
          onCancel={() => setShowWonConfirm(false)}
        >
          <input
            className="form-input mt-3"
            placeholder="R$ 0,00"
            value={wonValue}
            onChange={(e) => setWonValue(maskCurrencyBRLInput(e.target.value))}
          />
        </ConfirmModal>
      )}
    </>
  );
}

// ── Sub-components ──

function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        {icon}
        <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400">{title}</h3>
      </div>
      <div className="p-4 rounded-xl border space-y-3" style={{ borderColor: '#e6e3de', backgroundColor: '#fafafa' }}>
        {children}
      </div>
    </div>
  );
}

function EditField({
  label, value, onChange, placeholder, type = 'text', disabled,
}: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string; disabled?: boolean }) {
  return (
    <div>
      <p className="text-xs text-gray-400 mb-1">{label}</p>
      <input
        type={type}
        className="w-full text-sm font-medium rounded-lg px-2.5 py-1.5 border transition-colors focus:outline-none disabled:opacity-60 disabled:cursor-not-allowed"
        style={{ borderColor: '#e5e7eb', backgroundColor: '#fff' }}
        onFocus={(e) => (e.target.style.borderColor = '#d55006')}
        onBlur={(e) => (e.target.style.borderColor = '#e5e7eb')}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
      />
    </div>
  );
}

function EditFieldLink({
  label, value, onChange, href, icon, placeholder, type = 'text', disabled,
}: { label: string; value: string; onChange: (v: string) => void; href: string; icon: React.ReactNode; placeholder?: string; type?: string; disabled?: boolean }) {
  return (
    <div>
      <p className="text-xs text-gray-400 mb-1">{label}</p>
      <div className="relative">
        <input
          type={type}
          className="w-full text-sm font-medium rounded-lg px-2.5 py-1.5 border transition-colors focus:outline-none disabled:opacity-60 disabled:cursor-not-allowed"
          style={{ borderColor: '#e5e7eb', backgroundColor: '#fff', paddingRight: value ? 30 : undefined }}
          onFocus={(e) => (e.target.style.borderColor = '#d55006')}
          onBlur={(e) => (e.target.style.borderColor = '#e5e7eb')}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
        />
        {value && (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="absolute right-2.5 top-1/2 -translate-y-1/2 flex-shrink-0"
            style={{ color: '#d55006' }}
          >
            {icon}
          </a>
        )}
      </div>
    </div>
  );
}

function TeamSelect({ role, color, value, options, onUpdate, description }: {
  role: string; color: string; value: string; options: string[];
  onUpdate: (v: string) => void; description: string;
}) {
  return (
    <div className="flex items-center gap-3 py-2.5 border-b last:border-0" style={{ borderColor: '#e6e3de' }}>
      <div className="w-8 h-8 rounded-xl flex items-center justify-center text-white text-xs font-bold flex-shrink-0" style={{ backgroundColor: color, fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
        {role.split(' ')[0][0]}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-gray-700">{role}</p>
        <p className="text-xs text-gray-400">{description}</p>
        <select
          className="mt-1 text-sm text-gray-800 bg-transparent border-none p-0 cursor-pointer w-full focus:outline-none font-medium"
          value={value || ''}
          onChange={(e) => onUpdate(e.target.value)}
          style={{ color: value ? color : '#9ca3af' }}
        >
          <option value="">— Não atribuído —</option>
          {options.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
      </div>
      {value && (
        <div className="w-7 h-7 rounded-full flex items-center justify-center text-white flex-shrink-0" style={{ backgroundColor: color, fontSize: '10px', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
          {getInitials(value)}
        </div>
      )}
    </div>
  );
}

function EmptyState({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="py-12 flex flex-col items-center text-center">
      <div style={{ color: '#d1d5db' }}>{icon}</div>
      <p className="mt-3 text-sm font-semibold text-gray-500">{title}</p>
      <p className="text-xs text-gray-400 mt-1 max-w-52 leading-relaxed">{description}</p>
    </div>
  );
}

function ConfirmModal({ title, description, confirmLabel, confirmColor, onConfirm, onCancel, children }: {
  title: string; description: string; confirmLabel: string; confirmColor: string;
  onConfirm: () => void; onCancel: () => void; children?: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center modal-backdrop" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div className="bg-white rounded-2xl p-6 w-96 shadow-2xl">
        <h3 className="font-bold text-lg text-gray-900 mb-1" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{title}</h3>
        <p className="text-sm text-gray-500">{description}</p>
        {children}
        <div className="flex gap-2 mt-5">
          <button onClick={onConfirm} className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white" style={{ backgroundColor: confirmColor }}>
            {confirmLabel}
          </button>
          <button onClick={onCancel} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-100 border transition-colors" style={{ borderColor: '#e5e7eb' }}>
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}

