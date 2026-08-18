import { useEffect, useState } from 'react';
import { differenceInDays, differenceInHours } from 'date-fns';
import {
  Phone, Users, ArrowRightLeft, Clock, TrendingUp,
  CalendarDays, RefreshCw, Target, Award, CalendarCheck,
  Handshake, Timer, FileDown,
} from 'lucide-react';
import { useStore } from '../store';
import type { Corretor } from '../types';
import { STAGES } from '../data';
import { formatCurrency } from '../utils';
import { exportsApi, dashboardApi } from '../api/endpoints';
import { ApiError } from '../api/client';

type FunnelTab = 'completo' | 'sdr' | 'gr' | 'gv';

const FUNNEL_TABS: { id: FunnelTab; label: string; cor: string; desc: string }[] = [
  { id: 'completo', label: 'Pipeline Completo', cor: '#64748b', desc: 'Todos os indicadores' },
  { id: 'sdr', label: 'Pré-Atendimento', cor: '#8b5cf6', desc: 'SDR — Etapas 1–5' },
  { id: 'gr', label: 'Relacionamento', cor: '#0d9488', desc: 'GR — Etapa 6' },
  { id: 'gv', label: 'Vendas', cor: '#d55006', desc: 'GV — Etapas 7–9' },
];

function calcAvgHours(corretores: Corretor[], fromStage: number, toStage: number): number {
  const values: number[] = [];
  for (const l of corretores) {
    const from = l.etapaTimestamps[fromStage];
    const to = l.etapaTimestamps[toStage];
    if (from && to) values.push(differenceInHours(new Date(to), new Date(from)));
  }
  return values.length === 0 ? 0 : Math.round(values.reduce((a, b) => a + b, 0) / values.length);
}

function calcAvgDays(corretores: Corretor[], fromStage: number, toStage: number): number {
  const values: number[] = [];
  for (const l of corretores) {
    const from = l.etapaTimestamps[fromStage];
    const to = l.etapaTimestamps[toStage];
    if (from && to) values.push(differenceInDays(new Date(to), new Date(from)));
  }
  return values.length === 0 ? 0 : Math.round(values.reduce((a, b) => a + b, 0) / values.length);
}

function calcAvgDaysToScheduleTraining(corretores: Corretor[]): number {
  const values: number[] = [];
  for (const l of corretores) {
    const t3 = l.etapaTimestamps['3'];
    if (!t3 || !l.dataAgendamentoTreinamento) continue;
    const days = differenceInDays(new Date(l.dataAgendamentoTreinamento), new Date(t3));
    if (days >= 0) values.push(days);
  }
  return values.length === 0 ? 0 : Math.round(values.reduce((a, b) => a + b, 0) / values.length);
}

export function IndicadoresView() {
  const corretores = useStore((s) => s.corretores);
  const [funnelTab, setFunnelTab] = useState<FunnelTab>('completo');
  const [periodoPdf, setPeriodoPdf] = useState(() => new Date().toISOString().slice(0, 7));
  const [gerandoPdf, setGerandoPdf] = useState(false);
  const [pdfError, setPdfError] = useState('');

  // A listagem de corretores não traz mais interacoes completas (ver corretorListInclude no
  // backend) — esse KPI (company-wide, não escopado a um usuário) vem de um endpoint agregado.
  const [avgAtendimentoAposRepasseHrs, setAvgAtendimentoAposRepasseHrs] = useState(0);
  useEffect(() => {
    dashboardApi.tempoPrimeiroContatoGrGv().then((r) => setAvgAtendimentoAposRepasseHrs(r.avgHoras)).catch(() => undefined);
  }, []);

  async function handleDownloadKpisPdf() {
    setPdfError('');
    setGerandoPdf(true);
    try {
      await exportsApi.kpisPdf(periodoPdf);
    } catch (err) {
      setPdfError(err instanceof ApiError ? err.message : 'Não foi possível gerar o relatório.');
    } finally {
      setGerandoPdf(false);
    }
  }

  const total = corretores.length;
  const won = corretores.filter((l) => l.status === 'ganho');
  const archived = corretores.filter((l) => l.status === 'arquivado' || l.status === 'perdido');

  const reachedStage = (stageId: number) => corretores.filter((l) => Boolean(l.etapaTimestamps[stageId])).length;

  const contacted = reachedStage(2);
  const qualified = reachedStage(3);
  const distributed = reachedStage(5);

  const taxaContato = total > 0 ? Math.round((contacted / total) * 100) : 0;
  const taxaQualificacao = contacted > 0 ? Math.round((qualified / contacted) * 100) : 0;
  const taxaDistribuicao = total > 0 ? Math.round((distributed / total) * 100) : 0;
  const taxaConversao = total > 0 ? Math.round((won.length / total) * 100) : 0;
  const avgSdrResponseHrs = calcAvgHours(corretores, 1, 2);
  const avgSaleCycleDays = calcAvgDays(corretores, 1, 9);
  const valorTotalFechado = won.reduce((acc, l) => acc + (l.valorFechamento ?? 0), 0);
  const ticketMedioFechamento = won.length > 0 ? Math.round(valorTotalFechado / won.length) : 0;

  // New time KPIs
  const avgRepasseHrs = calcAvgHours(corretores, 3, 5);
  const avgDaysToScheduleTraining = calcAvgDaysToScheduleTraining(corretores);
  const treinamentosAgendados = corretores.filter((l) => l.treinamento && l.dataAgendamentoTreinamento).length;
  const treinamentosRealizados = corretores.filter((l) => l.treinamento && l.dataRealizacaoTreinamento).length;
  const interessadosEmTreinamento = corretores.filter((l) => l.treinamento).length;
  const taxaAgendamentoTreinamento = interessadosEmTreinamento > 0
    ? Math.round((treinamentosAgendados / interessadosEmTreinamento) * 100)
    : 0;

  const funnelData = STAGES.map((stage) => ({
    stage,
    count: corretores.filter((l) => l.etapa === stage.id && (l.status === 'ativo' || l.status === 'nutricao' || l.status === 'ganho')).length,
    passed: corretores.filter((l) => Boolean(l.etapaTimestamps[stage.id])).length,
  }));
  const maxFunnel = Math.max(...funnelData.map((d) => d.passed), 1);

  const teamMembers = [...new Set([
    ...corretores.map((l) => l.responsavelSDR),
    ...corretores.map((l) => l.responsavelGV),
    ...corretores.map((l) => l.responsavelGR),
  ].filter(Boolean))];

  const teamCorretores = (name: string) => corretores.filter((l) =>
    l.responsavelSDR === name || l.responsavelGV === name || l.responsavelGR === name
  );

  return (
    <div className="h-full overflow-y-auto" style={{ backgroundColor: '#e6e3de' }}>
      <div className="max-w-6xl mx-auto px-4 md:px-6 py-6 md:py-8 space-y-8">

        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
              Indicadores de Performance
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              KPIs do pipeline comercial PHACZ — calculados em tempo real.
            </p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className="flex items-center gap-2">
              <div className="text-xs px-3 py-1.5 rounded-full font-semibold flex-shrink-0" style={{ backgroundColor: '#fff7ed', color: '#d55006', border: '1px solid #fed7aa' }}>
                {total} corretores analisados
              </div>
              <input
                type="month"
                value={periodoPdf}
                onChange={(e) => setPeriodoPdf(e.target.value)}
                className="text-xs px-2.5 py-1.5 rounded-full border font-medium"
                style={{ borderColor: '#e5e7eb', color: '#374151' }}
              />
              <button
                onClick={handleDownloadKpisPdf}
                disabled={gerandoPdf}
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full font-semibold text-white transition-all hover:opacity-90 disabled:opacity-60 flex-shrink-0"
                style={{ backgroundColor: '#d55006' }}
              >
                <FileDown size={13} />
                {gerandoPdf ? 'Gerando...' : 'Relatório PDF'}
              </button>
            </div>
            {pdfError && <p className="text-xs text-right" style={{ color: '#dc2626' }}>{pdfError}</p>}
          </div>
        </div>

        {/* Funnel tabs */}
        <div className="bg-white rounded-2xl border" style={{ borderColor: '#e5e7eb' }}>
          <div className="flex border-b overflow-x-auto" style={{ borderColor: '#e5e7eb' }}>
            {FUNNEL_TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => setFunnelTab(t.id)}
                className="flex items-center gap-2 px-5 py-3.5 text-xs font-semibold whitespace-nowrap border-b-2 transition-all"
                style={{
                  borderColor: funnelTab === t.id ? t.cor : 'transparent',
                  color: funnelTab === t.id ? t.cor : '#6b7280',
                }}
              >
                {t.label}
                <span className="text-xs text-gray-400 font-normal hidden sm:block">— {t.desc}</span>
              </button>
            ))}
          </div>

          <div className="p-4 md:p-6">
            {funnelTab === 'completo' && (
              <div className="space-y-6">
                {/* Row 1 */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <KpiCard icon={<Phone size={18} />} color="#3b82f6" title="Taxa de Contato" value={`${taxaContato}%`} subtitle={`${contacted} de ${total} contatados`} meta="Meta: >85%" ok={taxaContato >= 85} description="Corretores que receberam tentativa de contato (etapa 2)" />
                  <KpiCard icon={<Target size={18} />} color="#10b981" title="Taxa de Qualificação" value={`${taxaQualificacao}%`} subtitle={`${qualified} de ${contacted}`} meta="Meta: >60%" ok={taxaQualificacao >= 60} description="Corretores contatados que avançaram para qualificação" />
                  <KpiCard icon={<ArrowRightLeft size={18} />} color="#8b5cf6" title="Taxa de Distribuição" value={`${taxaDistribuicao}%`} subtitle={`${distributed} chegaram à distribuição`} meta="Meta: >40%" ok={taxaDistribuicao >= 40} description="Corretores que chegaram à distribuição GR+GV" />
                  <KpiCard icon={<TrendingUp size={18} />} color="#d55006" title="Taxa de Conversão" value={`${taxaConversao}%`} subtitle={`${won.length} fechamentos`} meta="Meta: >10%" ok={taxaConversao >= 10} description="Corretores totais que chegaram ao fechamento" />
                </div>
                {/* Row 2 */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <KpiCard icon={<Clock size={18} />} color={avgSdrResponseHrs > 0 && avgSdrResponseHrs <= 2 ? '#059669' : '#dc2626'} title="Resp. Média SDR" value={avgSdrResponseHrs > 0 ? `${avgSdrResponseHrs}h` : '—'} subtitle="Tempo de 1º contato" meta="Meta: <2h" ok={avgSdrResponseHrs > 0 && avgSdrResponseHrs <= 2} description="Tempo médio entre entrada do corretor e primeiro contato" />
                  <KpiCard icon={<CalendarDays size={18} />} color="#0891b2" title="Ciclo Médio de Venda" value={avgSaleCycleDays > 0 ? `${avgSaleCycleDays}d` : '—'} subtitle="Etapa 1 → Fechamento" meta="Referência do setor" ok={null} description="Dias médios entre entrada e fechamento" />
                  <KpiCard icon={<Award size={18} />} color="#d97706" title="Ticket Médio" value={ticketMedioFechamento > 0 ? formatCurrency(ticketMedioFechamento) : '—'} subtitle={`${won.length} negócio${won.length !== 1 ? 's' : ''} fechado${won.length !== 1 ? 's' : ''}`} meta="Valor por fechamento" ok={null} description="Valor médio dos fechamentos registrados" />
                  <KpiCard icon={<RefreshCw size={18} />} color="#64748b" title="Arquivados" value={archived.length.toString()} subtitle="Não convertidos" meta={`${total > 0 ? Math.round((archived.length / total) * 100) : 0}% do total`} ok={null} description="Corretores arquivados ou perdidos" />
                </div>
              </div>
            )}

            {funnelTab === 'sdr' && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <KpiCard icon={<Clock size={18} />} color={avgSdrResponseHrs > 0 && avgSdrResponseHrs <= 2 ? '#059669' : '#dc2626'} title="Tempo 1º Atendimento" value={avgSdrResponseHrs > 0 ? `${avgSdrResponseHrs}h` : '—'} subtitle="Etapa 1 → 2" meta="Meta: <2h" ok={avgSdrResponseHrs > 0 && avgSdrResponseHrs <= 2} description="Tempo médio entre entrada e primeiro contato do SDR" />
                  <KpiCard icon={<ArrowRightLeft size={18} />} color={avgRepasseHrs > 0 && avgRepasseHrs <= 48 ? '#059669' : '#dc2626'} title="Tempo de Repasse" value={avgRepasseHrs > 0 ? `${avgRepasseHrs}h` : '—'} subtitle="Qualif. → Distribuição" meta="Meta: <48h" ok={avgRepasseHrs > 0 && avgRepasseHrs <= 48} description="Tempo médio entre qualificação e repasse ao GR+GV" />
                  <KpiCard icon={<Phone size={18} />} color="#3b82f6" title="Taxa de Contato" value={`${taxaContato}%`} subtitle={`${contacted} corretores contatados`} meta="Meta: >85%" ok={taxaContato >= 85} description="Corretores que receberam primeiro contato do SDR" />
                  <KpiCard icon={<Target size={18} />} color="#10b981" title="Taxa de Qualificação" value={`${taxaQualificacao}%`} subtitle={`${qualified} qualificados`} meta="Meta: >60%" ok={taxaQualificacao >= 60} description="Taxa de avanço de contato para qualificação" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <KpiCard icon={<CalendarCheck size={18} />} color={taxaAgendamentoTreinamento >= 60 ? '#059669' : '#dc2626'} title="Taxa de Agendamento de Treinamento" value={`${taxaAgendamentoTreinamento}%`} subtitle={`${treinamentosAgendados} de ${interessadosEmTreinamento} agendados`} meta="Meta: >60%" ok={taxaAgendamentoTreinamento >= 60} description="Percentual de interessados que tiveram treinamento agendado" />
                  <KpiCard icon={<Timer size={18} />} color={avgDaysToScheduleTraining > 0 && avgDaysToScheduleTraining <= 3 ? '#059669' : '#f59e0b'} title="Tempo para Agendar Treinamento" value={avgDaysToScheduleTraining > 0 ? `${avgDaysToScheduleTraining}d` : '—'} subtitle="Etapa 3 → agendamento" meta="Meta: <3 dias" ok={avgDaysToScheduleTraining > 0 && avgDaysToScheduleTraining <= 3} description="Dias médios entre qualificação e agendamento do treinamento" />
                </div>
              </div>
            )}

            {funnelTab === 'gr' && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <KpiCard icon={<Timer size={18} />} color={avgAtendimentoAposRepasseHrs > 0 && avgAtendimentoAposRepasseHrs <= 4 ? '#059669' : '#dc2626'} title="Tempo 1º Atend. após Repasse" value={avgAtendimentoAposRepasseHrs > 0 ? `${avgAtendimentoAposRepasseHrs}h` : '—'} subtitle="Distribuição → 1ª interação GR/GV" meta="Meta: <4h" ok={avgAtendimentoAposRepasseHrs > 0 && avgAtendimentoAposRepasseHrs <= 4} description="Tempo médio entre o repasse e o primeiro atendimento real" />
                  <KpiCard icon={<CalendarCheck size={18} />} color={taxaAgendamentoTreinamento >= 60 ? '#059669' : '#dc2626'} title="Taxa de Agend. de Treinamento" value={`${taxaAgendamentoTreinamento}%`} subtitle={`${treinamentosAgendados} agendados`} meta="Meta: >60%" ok={taxaAgendamentoTreinamento >= 60} description="Percentual de interessados com treinamento agendado" />
                  <KpiCard icon={<Users size={18} />} color="#0d9488" title="Treinamentos Realizados" value={treinamentosRealizados.toString()} subtitle={`de ${interessadosEmTreinamento} interessados`} meta="Quanto maior, melhor" ok={null} description="Total de treinamentos efetivamente realizados" />
                  <KpiCard icon={<TrendingUp size={18} />} color="#d55006" title="Taxa de Distribuição" value={`${taxaDistribuicao}%`} subtitle={`${distributed} chegaram ao repasse`} meta="Meta: >40%" ok={taxaDistribuicao >= 40} description="Corretores que chegaram à etapa 5 (Distribuição)" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <KpiCard icon={<Timer size={18} />} color={avgDaysToScheduleTraining > 0 && avgDaysToScheduleTraining <= 3 ? '#059669' : '#f59e0b'} title="Tempo para Agendar Treinamento" value={avgDaysToScheduleTraining > 0 ? `${avgDaysToScheduleTraining}d` : '—'} subtitle="Qualificação → agendamento" meta="Meta: <3 dias" ok={avgDaysToScheduleTraining > 0 && avgDaysToScheduleTraining <= 3} description="Dias médios entre qualificação e agendamento do treinamento" />
                  <KpiCard icon={<Handshake size={18} />} color="#0891b2" title="Repasse Médio (Qualif. → Distrib.)" value={avgRepasseHrs > 0 ? `${avgRepasseHrs}h` : '—'} subtitle="Etapa 3 → Etapa 5" meta="Meta: <48h" ok={avgRepasseHrs > 0 && avgRepasseHrs <= 48} description="Tempo médio entre qualificação e repasse ao GR+GV" />
                </div>
              </div>
            )}

            {funnelTab === 'gv' && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <KpiCard icon={<TrendingUp size={18} />} color="#d55006" title="Taxa de Conversão Final" value={`${taxaConversao}%`} subtitle={`${won.length} fechamentos`} meta="Meta: >10%" ok={taxaConversao >= 10} description="Percentual de corretores totais que chegaram ao fechamento" />
                  <KpiCard icon={<Timer size={18} />} color={avgAtendimentoAposRepasseHrs > 0 && avgAtendimentoAposRepasseHrs <= 4 ? '#059669' : '#dc2626'} title="1º Atend. GV após Repasse" value={avgAtendimentoAposRepasseHrs > 0 ? `${avgAtendimentoAposRepasseHrs}h` : '—'} subtitle="Distribuição → 1ª interação GV" meta="Meta: <4h" ok={avgAtendimentoAposRepasseHrs > 0 && avgAtendimentoAposRepasseHrs <= 4} description="Tempo médio entre o repasse e o primeiro atendimento do GV" />
                  <KpiCard icon={<CalendarDays size={18} />} color="#0891b2" title="Ciclo Médio de Venda" value={avgSaleCycleDays > 0 ? `${avgSaleCycleDays}d` : '—'} subtitle="Etapa 1 → Fechamento" meta="Referência do setor" ok={null} description="Dias médios entre entrada no pipeline e fechamento" />
                  <KpiCard icon={<Award size={18} />} color="#d97706" title="Ticket Médio" value={ticketMedioFechamento > 0 ? formatCurrency(ticketMedioFechamento) : '—'} subtitle={`${won.length} fechamentos`} meta="Acima de R$ 800k" ok={ticketMedioFechamento >= 800000 || ticketMedioFechamento === 0 ? null : false} description="Valor médio dos fechamentos registrados" />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Funnel chart */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white rounded-2xl p-6" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: '#fff7ed' }}>
                <Users size={18} style={{ color: '#d55006' }} />
              </div>
              <div>
                <h3 className="font-bold text-gray-900" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>Funil por etapa</h3>
                <p className="text-xs text-gray-400">Corretores que passaram por cada etapa do pipeline</p>
              </div>
            </div>
            <div className="space-y-2">
              {funnelData.map(({ stage, count, passed }) => (
                <div key={stage.id} className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0" style={{ backgroundColor: stage.cor, fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
                    {stage.id}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-semibold text-gray-700">{stage.nomeAbrev}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-gray-400">{passed} passaram</span>
                        <span className="text-xs font-bold" style={{ color: stage.cor, minWidth: 28, textAlign: 'right' }}>{count} ativos</span>
                      </div>
                    </div>
                    <div className="h-5 rounded-full overflow-hidden" style={{ backgroundColor: '#f1f5f9' }}>
                      <div className="h-full rounded-full transition-all" style={{ width: `${Math.max((passed / maxFunnel) * 100, 2)}%`, backgroundColor: stage.cor, opacity: 0.85 }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Team performance */}
          <div className="bg-white rounded-2xl p-6" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: '#fff7ed' }}>
                <Users size={18} style={{ color: '#d55006' }} />
              </div>
              <div>
                <h3 className="font-bold text-gray-900" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>Equipe</h3>
                <p className="text-xs text-gray-400">Corretores por responsável</p>
              </div>
            </div>
            <div className="space-y-3">
              {teamMembers.map((name) => {
                const memberCorretores = teamCorretores(name);
                const memberWon = memberCorretores.filter((l) => l.status === 'ganho').length;
                const memberActive = memberCorretores.filter((l) => l.status === 'ativo' || l.status === 'nutricao').length;
                const maxTeam = Math.max(...teamMembers.map((n) => teamCorretores(n).length), 1);
                return (
                  <div key={name} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0" style={{ backgroundColor: '#d55006', fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: '10px' }}>
                          {name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)}
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-gray-700">{name.split(' ')[0]}</p>
                          <p className="text-xs text-gray-400">{memberCorretores.length} corretores</p>
                        </div>
                      </div>
                      {memberWon > 0 && (
                        <span className="text-xs px-2 py-0.5 rounded-full font-bold" style={{ backgroundColor: '#dcfce7', color: '#166534' }}>
                          {memberWon} fechado{memberWon > 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                    <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: '#f1f5f9' }}>
                      <div className="h-full rounded-full" style={{ width: `${Math.max((memberCorretores.length / maxTeam) * 100, 4)}%`, backgroundColor: memberActive > 0 ? '#d55006' : '#94a3b8' }} />
                    </div>
                  </div>
                );
              })}
              {teamMembers.length === 0 && <p className="text-xs text-gray-400 py-8 text-center">Nenhum membro com corretores atribuídos.</p>}
            </div>
          </div>
        </div>

        {/* Summary table */}
        <div className="bg-white rounded-2xl p-6" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
          <div className="flex items-center gap-3 mb-5">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: '#fff7ed' }}>
              <TrendingUp size={18} style={{ color: '#d55006' }} />
            </div>
            <div>
              <h3 className="font-bold text-gray-900" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>Resumo dos indicadores-chave</h3>
              <p className="text-xs text-gray-400">Alinhado com o documento de parametrização do pipeline PHACZ</p>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px]">
              <thead>
                <tr style={{ borderBottom: '2px solid #e6e3de' }}>
                  <th className="text-left text-xs font-bold text-gray-500 uppercase tracking-wider pb-3">Indicador</th>
                  <th className="text-right text-xs font-bold text-gray-500 uppercase tracking-wider pb-3">Valor atual</th>
                  <th className="text-right text-xs font-bold text-gray-500 uppercase tracking-wider pb-3">Meta</th>
                  <th className="text-right text-xs font-bold text-gray-500 uppercase tracking-wider pb-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: '#e6e3de' }}>
                {[
                  { kpi: 'Tempo médio 1º contato SDR', valor: avgSdrResponseHrs > 0 ? `${avgSdrResponseHrs}h` : '—', meta: '< 2h', ok: avgSdrResponseHrs > 0 && avgSdrResponseHrs <= 2 },
                  { kpi: 'Tempo médio de repasse (Qualif. → Distrib.)', valor: avgRepasseHrs > 0 ? `${avgRepasseHrs}h` : '—', meta: '< 48h', ok: avgRepasseHrs > 0 && avgRepasseHrs <= 48 },
                  { kpi: 'Tempo 1º atendimento após repasse (GR/GV)', valor: avgAtendimentoAposRepasseHrs > 0 ? `${avgAtendimentoAposRepasseHrs}h` : '—', meta: '< 4h', ok: avgAtendimentoAposRepasseHrs > 0 && avgAtendimentoAposRepasseHrs <= 4 },
                  { kpi: 'Tempo para agendar treinamento', valor: avgDaysToScheduleTraining > 0 ? `${avgDaysToScheduleTraining}d` : '—', meta: '< 3 dias', ok: avgDaysToScheduleTraining > 0 && avgDaysToScheduleTraining <= 3 },
                  { kpi: 'Taxa de agendamento de treinamento', valor: `${taxaAgendamentoTreinamento}%`, meta: '> 60%', ok: taxaAgendamentoTreinamento >= 60 },
                  { kpi: 'Taxa de contato', valor: `${taxaContato}%`, meta: '> 85%', ok: taxaContato >= 85 },
                  { kpi: 'Taxa de qualificação', valor: `${taxaQualificacao}%`, meta: '> 60%', ok: taxaQualificacao >= 60 },
                  { kpi: 'Taxa de distribuição', valor: `${taxaDistribuicao}%`, meta: '> 40%', ok: taxaDistribuicao >= 40 },
                  { kpi: 'Taxa de conversão final', valor: `${taxaConversao}%`, meta: '> 10%', ok: taxaConversao >= 10 },
                  { kpi: 'Ciclo médio de venda', valor: avgSaleCycleDays > 0 ? `${avgSaleCycleDays} dias` : '—', meta: 'Referência do setor', ok: null },
                  { kpi: 'Ticket médio de fechamento', valor: ticketMedioFechamento > 0 ? formatCurrency(ticketMedioFechamento) : '—', meta: 'Acima de R$ 800k', ok: ticketMedioFechamento >= 800000 || ticketMedioFechamento === 0 ? null : false },
                ].map(({ kpi, valor, meta, ok }) => (
                  <tr key={kpi}>
                    <td className="py-3 text-sm text-gray-700">{kpi}</td>
                    <td className="py-3 text-sm font-bold text-right" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', color: '#1e1e1e' }}>{valor}</td>
                    <td className="py-3 text-xs text-right text-gray-400">{meta}</td>
                    <td className="py-3 text-right">
                      {ok === null ? (
                        <span className="text-xs px-2 py-1 rounded-full font-medium" style={{ backgroundColor: '#f1f5f9', color: '#64748b' }}>— Referência</span>
                      ) : ok ? (
                        <span className="text-xs px-2 py-1 rounded-full font-medium" style={{ backgroundColor: '#dcfce7', color: '#166534' }}>✓ Dentro da meta</span>
                      ) : (
                        <span className="text-xs px-2 py-1 rounded-full font-medium" style={{ backgroundColor: '#fee2e2', color: '#b91c1c' }}>✗ Abaixo da meta</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-4 p-3 rounded-xl" style={{ backgroundColor: '#f8f9fa', border: '1px solid #e9ecef' }}>
            <p className="text-xs text-gray-400">
              ℹ️ Indicadores calculados automaticamente com base nos corretores e timestamps registrados no sistema.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function KpiCard({ icon, color, title, value, subtitle, meta, ok, description }: {
  icon: React.ReactNode; color: string; title: string; value: string;
  subtitle: string; meta: string; ok: boolean | null; description: string;
}) {
  const statusStyles = ok === null
    ? { bg: '#f1f5f9', text: '#64748b', dot: '#94a3b8' }
    : ok
    ? { bg: '#dcfce7', text: '#166534', dot: '#34d399' }
    : { bg: '#fee2e2', text: '#b91c1c', dot: '#f87171' };

  return (
    <div className="bg-white rounded-2xl p-4 sm:p-5 flex flex-col gap-3" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }} title={description}>
      <div className="flex items-center justify-between">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white flex-shrink-0" style={{ backgroundColor: color }}>
          {icon}
        </div>
        <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: statusStyles.dot }} />
      </div>
      <div>
        <div className="text-2xl font-bold" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', color: '#1e1e1e' }}>{value}</div>
        <div className="text-xs font-semibold text-gray-600 mt-0.5">{title}</div>
        <div className="text-xs text-gray-400 mt-0.5">{subtitle}</div>
      </div>
      <div className="text-xs font-medium px-2 py-1 rounded-lg" style={{ backgroundColor: statusStyles.bg, color: statusStyles.text }}>
        {meta}
      </div>
    </div>
  );
}
