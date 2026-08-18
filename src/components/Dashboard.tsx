import { useEffect, useState } from 'react';
import {
  TrendingUp, Users, Trophy, Clock, Target, BarChart3,
  Flame, Thermometer, Phone, MessageSquare, CalendarCheck,
  Handshake, FileText, CheckCircle2,
} from 'lucide-react';
import { useStore } from '../store';
import { STAGES } from '../data';
import { formatCurrency, formatRelativeTime } from '../utils';
import { dashboardApi, type AtividadeRecente } from '../api/endpoints';
import type { Corretor } from '../types';

type DashTab = 'geral' | 'sdr' | 'gr' | 'gv';

export function Dashboard() {
  const corretores = useStore((s) => s.corretores);
  const currentUser = useStore((s) => s.currentUser);
  const setSelectedCorretor = useStore((s) => s.setSelectedCorretor);
  const setView = useStore((s) => s.setView);

  const cargo = currentUser?.cargo ?? 'Diretora';
  const defaultTab: DashTab =
    cargo === 'SDR' ? 'sdr' :
    cargo === 'GR' ? 'gr' :
    cargo === 'GV' ? 'gv' : 'geral';

  const [dashTab, setDashTab] = useState<DashTab>(defaultTab);

  const allTabs: { id: DashTab; label: string; visible: boolean; cor: string }[] = [
    { id: 'geral', label: 'Visão Geral', visible: cargo === 'Diretora', cor: '#d55006' },
    { id: 'sdr', label: 'Funil SDR', visible: cargo === 'Diretora' || cargo === 'SDR', cor: '#8b5cf6' },
    { id: 'gr', label: 'Funil GR', visible: cargo === 'Diretora' || cargo === 'GR', cor: '#0d9488' },
    { id: 'gv', label: 'Funil GV', visible: cargo === 'Diretora' || cargo === 'GV', cor: '#d55006' },
  ];
  const tabs = allTabs.filter((t) => t.visible);

  function navigate(corretor: Corretor) {
    setView('pipeline');
    setSelectedCorretor(corretor.id);
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="bg-white border-b flex-shrink-0" style={{ borderColor: '#e5e7eb' }}>
        <div className="px-4 md:px-6 py-4 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h1 className="font-questrial text-xl text-gray-800">Dashboard</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {currentUser ? `Olá, ${currentUser.nome} — ${currentUser.cargo}` : 'Visão geral do pipeline comercial'}
            </p>
          </div>
          <span
            className="text-xs px-3 py-1.5 rounded-full font-semibold flex-shrink-0"
            style={{ backgroundColor: '#fff7ed', color: '#d55006', border: '1px solid #fed7aa' }}
          >
            {currentUser?.cargo ?? 'Diretora'}
          </span>
        </div>

        {tabs.length > 1 && (
          <div className="flex px-4 md:px-6 gap-1 overflow-x-auto">
            {tabs.map((t) => (
              <button
                key={t.id}
                onClick={() => setDashTab(t.id)}
                className="px-4 py-3 text-xs font-semibold whitespace-nowrap border-b-2 transition-all"
                style={{
                  borderColor: dashTab === t.id ? t.cor : 'transparent',
                  color: dashTab === t.id ? t.cor : '#6b7280',
                }}
              >
                {t.label}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 md:p-6" style={{ backgroundColor: '#e6e3de' }}>
        {dashTab === 'geral' && <DashGeral corretores={corretores} onNavigate={navigate} />}
        {dashTab === 'sdr' && <DashSDR corretores={corretores} currentUser={currentUser?.nome} onNavigate={navigate} />}
        {dashTab === 'gr' && <DashGR corretores={corretores} currentUser={currentUser?.nome} onNavigate={navigate} />}
        {dashTab === 'gv' && <DashGV corretores={corretores} currentUser={currentUser?.nome} onNavigate={navigate} />}
      </div>
    </div>
  );
}

// ─── Visão Geral (Diretora) ───────────────────────────────────────────────────

function DashGeral({ corretores, onNavigate }: { corretores: Corretor[]; onNavigate: (l: Corretor) => void }) {
  const active = corretores.filter((l) => l.status === 'ativo' || l.status === 'nutricao');
  const won = corretores.filter((l) => l.status === 'ganho');
  const lost = corretores.filter((l) => l.status === 'perdido' || l.status === 'arquivado');
  const totalWonValue = won.reduce((acc, l) => acc + (l.valorFechamento ?? 0), 0);
  const conversion = corretores.length > 0 ? Math.round((won.length / corretores.length) * 100) : 0;

  const quente = active.filter((l) => l.temperatura === 'quente').length;
  const morno = active.filter((l) => l.temperatura === 'morno').length;
  const frio = active.filter((l) => l.temperatura === 'frio').length;

  const byStage = STAGES.map((s) => ({
    ...s,
    count: active.filter((l) => l.etapa === s.id).length,
  }));

  const recentWon = [...won]
    .sort((a, b) => new Date(b.dataFechamento ?? b.dataUltimaInteracao).getTime() - new Date(a.dataFechamento ?? a.dataUltimaInteracao).getTime())
    .slice(0, 5);

  const hotCorretores = active
    .filter((l) => l.temperatura === 'quente')
    .sort((a, b) => new Date(b.dataUltimaInteracao).getTime() - new Date(a.dataUltimaInteracao).getTime())
    .slice(0, 5);

  // Summary by funnel
  const funnelSummary = [
    { label: 'Pré-atendimento', cor: '#8b5cf6', stages: [1, 2, 3, 4, 5], icon: <Phone size={14} /> },
    { label: 'Treinamento', cor: '#0d9488', stages: [6], icon: <CalendarCheck size={14} /> },
    { label: 'Venda', cor: '#d55006', stages: [7, 8, 9], icon: <Handshake size={14} /> },
    { label: 'Pós-venda', cor: '#6366f1', stages: [10], icon: <CheckCircle2 size={14} /> },
  ].map((f) => ({
    ...f,
    count: active.filter((l) => f.stages.includes(l.etapa)).length,
  }));

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <KpiCard icon={<Users size={20} />} label="Corretores ativos" value={active.length} sub="no pipeline" color="#3b82f6" />
        <KpiCard icon={<Trophy size={20} />} label="Fechamentos" value={won.length} sub="vendas ganhas" color="#059669" />
        <KpiCard icon={<TrendingUp size={20} />} label="Volume fechado" value={formatCurrency(totalWonValue)} sub="valor total" color="#d55006" large />
        <KpiCard icon={<Target size={20} />} label="Conversão" value={`${conversion}%`} sub={`${lost.length} arquivados`} color="#8b5cf6" />
      </div>

      {/* Funnel summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {funnelSummary.map((f) => (
          <div key={f.label} className="bg-white rounded-2xl border p-4" style={{ borderColor: '#e5e7eb' }}>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white" style={{ backgroundColor: f.cor }}>
                {f.icon}
              </div>
              <span className="text-xs font-semibold text-gray-600">{f.label}</span>
            </div>
            <p className="text-3xl font-bold" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', color: f.cor }}>{f.count}</p>
            <p className="text-xs text-gray-400 mt-0.5">corretores ativos</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pipeline chart */}
        <div className="lg:col-span-2 bg-white rounded-2xl border p-5" style={{ borderColor: '#e5e7eb' }}>
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 size={16} style={{ color: '#d55006' }} />
            <h2 className="font-questrial font-bold text-base text-gray-800">Funil do Pipeline</h2>
          </div>
          <div className="space-y-2">
            {byStage.map((s) => {
              const maxCount = Math.max(...byStage.map((b) => b.count), 1);
              const pct = (s.count / maxCount) * 100;
              return (
                <div key={s.id} className="flex items-center gap-3">
                  <div className="flex-shrink-0 text-xs font-semibold text-gray-400 w-5 text-right">{s.id}</div>
                  <div className="w-28 text-xs text-gray-600 truncate font-medium">{s.nomeAbrev}</div>
                  <div className="flex-1 bg-gray-100 rounded-full h-5 overflow-hidden">
                    <div className="h-full rounded-full flex items-center px-2 transition-all duration-500" style={{ width: `${pct || 2}%`, backgroundColor: s.cor, minWidth: s.count > 0 ? 32 : 0 }}>
                      {s.count > 0 && <span className="text-white font-bold" style={{ fontSize: '10px' }}>{s.count}</span>}
                    </div>
                  </div>
                  <div className="text-xs font-bold w-6 text-right" style={{ color: s.count > 0 ? s.cor : '#d1d5db' }}>{s.count}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Temperature */}
        <div className="bg-white rounded-2xl border p-5" style={{ borderColor: '#e5e7eb' }}>
          <div className="flex items-center gap-2 mb-4">
            <Thermometer size={16} style={{ color: '#d55006' }} />
            <h2 className="font-questrial font-bold text-base text-gray-800">Temperatura</h2>
          </div>
          <div className="space-y-3">
            <TempBar label="🔥 Quente" count={quente} total={active.length} bg="#fee2e2" fill="#ef4444" text="#b91c1c" />
            <TempBar label="🌤 Morno" count={morno} total={active.length} bg="#fef9c3" fill="#eab308" text="#854d0e" />
            <TempBar label="❄️ Frio" count={frio} total={active.length} bg="#dbeafe" fill="#3b82f6" text="#1e40af" />
          </div>

          <div className="mt-5 pt-4 border-t" style={{ borderColor: '#f1f5f9' }}>
            <div className="flex items-center gap-2 mb-3">
              <Flame size={14} style={{ color: '#d55006' }} />
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Corretores quentes</h3>
            </div>
            <div className="space-y-2">
              {hotCorretores.length === 0 ? (
                <p className="text-xs text-gray-400">Nenhum corretor quente</p>
              ) : (
                hotCorretores.map((l) => (
                  <button key={l.id} onClick={() => onNavigate(l)} className="w-full text-left flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50 transition-colors">
                    <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0" style={{ backgroundColor: '#ef4444', fontSize: '9px' }}>
                      {l.nomeCorretor[0]}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-gray-800 truncate">{l.nomeCorretor}</p>
                      <p className="text-xs text-gray-400 truncate">{l.imobiliaria || 'Sem imobiliária'}</p>
                    </div>
                    <div className="w-5 h-5 rounded flex items-center justify-center text-white text-xs font-bold flex-shrink-0" style={{ backgroundColor: STAGES.find((s) => s.id === l.etapa)?.cor ?? '#333' }}>
                      {l.etapa}
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {recentWon.length > 0 && (
        <div className="bg-white rounded-2xl border p-5" style={{ borderColor: '#e5e7eb' }}>
          <div className="flex items-center gap-2 mb-4">
            <Trophy size={16} style={{ color: '#059669' }} />
            <h2 className="font-questrial font-bold text-base text-gray-800">Últimos Fechamentos</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b" style={{ borderColor: '#f1f5f9' }}>
                  <th className="pb-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">Corretor</th>
                  <th className="pb-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">Imobiliária</th>
                  <th className="pb-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">Valor</th>
                  <th className="pb-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">GV</th>
                  <th className="pb-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">Data</th>
                </tr>
              </thead>
              <tbody>
                {recentWon.map((l) => (
                  <tr key={l.id} className="border-b cursor-pointer hover:bg-gray-50 transition-colors" style={{ borderColor: '#f9fafb' }} onClick={() => onNavigate(l)}>
                    <td className="py-2.5 font-semibold text-gray-800">{l.nomeCorretor}</td>
                    <td className="py-2.5 text-gray-500">{l.imobiliaria || '—'}</td>
                    <td className="py-2.5 font-bold" style={{ color: '#d55006' }}>{l.valorFechamento ? formatCurrency(l.valorFechamento) : '—'}</td>
                    <td className="py-2.5 text-gray-500">{l.responsavelGV || '—'}</td>
                    <td className="py-2.5 text-gray-400 text-xs">{formatRelativeTime(l.dataFechamento ?? l.dataUltimaInteracao)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Dashboard SDR (Pré-atendimento) ─────────────────────────────────────────

function DashSDR({ corretores, currentUser, onNavigate }: { corretores: Corretor[]; currentUser?: string; onNavigate: (l: Corretor) => void }) {
  const meusCorretores = currentUser
    ? corretores.filter((l) => l.responsavelSDR === currentUser)
    : corretores;

  const stages15 = meusCorretores.filter((l) => l.etapa >= 1 && l.etapa <= 5 && (l.status === 'ativo' || l.status === 'nutricao'));
  const novo = stages15.filter((l) => l.etapa === 1).length;
  const contato = stages15.filter((l) => l.etapa === 2).length;
  const qualif = stages15.filter((l) => l.etapa === 3).length;
  const nutricao = stages15.filter((l) => l.etapa === 4).length;
  const distrib = stages15.filter((l) => l.etapa === 5).length;

  const totalMeu = stages15.length;
  const totalDistrib = meusCorretores.filter((l) => Boolean(l.etapaTimestamps['5'])).length;
  const totalContato = meusCorretores.filter((l) => Boolean(l.etapaTimestamps['2'])).length;
  const taxaContato = meusCorretores.length > 0 ? Math.round((totalContato / meusCorretores.length) * 100) : 0;
  const taxaDistrib = meusCorretores.length > 0 ? Math.round((totalDistrib / meusCorretores.length) * 100) : 0;

  // Avg response time (stage 1→2 in hours)
  const responseTimes: number[] = [];
  for (const l of meusCorretores) {
    const t1 = l.etapaTimestamps['1'];
    const t2 = l.etapaTimestamps['2'];
    if (t1 && t2) {
      const hrs = (new Date(t2).getTime() - new Date(t1).getTime()) / (1000 * 60 * 60);
      responseTimes.push(hrs);
    }
  }
  const avgResponse = responseTimes.length > 0
    ? Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length * 10) / 10
    : null;

  const treinamentoAgendados = meusCorretores.filter((l) => l.treinamento && l.dataAgendamentoTreinamento).length;
  const treinamentoRealizados = meusCorretores.filter((l) => l.treinamento && l.dataRealizacaoTreinamento).length;

  const urgentCorretores = stages15
    .filter((l) => l.etapa <= 2)
    .sort((a, b) => new Date(a.dataUltimaInteracao).getTime() - new Date(b.dataUltimaInteracao).getTime())
    .slice(0, 6);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <KpiCard icon={<Users size={20} />} label="Meus corretores ativos" value={totalMeu} sub="Etapas 1–5" color="#8b5cf6" />
        <KpiCard icon={<Phone size={20} />} label="Taxa de contato" value={`${taxaContato}%`} sub={`Meta: >85%`} color={taxaContato >= 85 ? '#059669' : '#dc2626'} />
        <KpiCard icon={<TrendingUp size={20} />} label="Taxa de repasse" value={`${taxaDistrib}%`} sub={`${totalDistrib} distribuídos`} color={taxaDistrib >= 40 ? '#059669' : '#dc2626'} />
        <KpiCard
          icon={<Clock size={20} />}
          label="Tempo médio 1º contato"
          value={avgResponse !== null ? `${avgResponse}h` : '—'}
          sub="Meta: <2h"
          color={avgResponse !== null && avgResponse <= 2 ? '#059669' : '#dc2626'}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Funil SDR */}
        <div className="bg-white rounded-2xl border p-5" style={{ borderColor: '#e5e7eb' }}>
          <h3 className="font-questrial font-bold text-sm text-gray-800 mb-4">Distribuição — Funil Pré-atendimento</h3>
          <div className="space-y-3">
            {[
              { label: '1. Novo Corretor', count: novo, cor: '#64748b' },
              { label: '2. Tentativa de Contato', count: contato, cor: '#3b82f6' },
              { label: '3. Qualificação', count: qualif, cor: '#10b981' },
              { label: '4. Nutrição / Cadência', count: nutricao, cor: '#f59e0b' },
              { label: '5. Distribuição GR + GV', count: distrib, cor: '#8b5cf6' },
            ].map((s) => {
              const max = Math.max(novo, contato, qualif, nutricao, distrib, 1);
              return (
                <div key={s.label} className="flex items-center gap-3">
                  <div className="w-36 text-xs text-gray-600 truncate font-medium">{s.label}</div>
                  <div className="flex-1 bg-gray-100 rounded-full h-5 overflow-hidden">
                    <div className="h-full rounded-full flex items-center px-2" style={{ width: `${(s.count / max) * 100 || 2}%`, backgroundColor: s.cor, minWidth: s.count > 0 ? 28 : 0 }}>
                      {s.count > 0 && <span className="text-white font-bold" style={{ fontSize: '10px' }}>{s.count}</span>}
                    </div>
                  </div>
                  <span className="text-xs font-bold w-4 text-right" style={{ color: s.cor }}>{s.count}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Treinamento */}
        <div className="bg-white rounded-2xl border p-5 space-y-4" style={{ borderColor: '#e5e7eb' }}>
          <h3 className="font-questrial font-bold text-sm text-gray-800">Controle de Treinamentos</h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="p-4 rounded-xl text-center" style={{ backgroundColor: '#f0fdfa' }}>
              <p className="text-3xl font-bold" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', color: '#0d9488' }}>{treinamentoAgendados}</p>
              <p className="text-xs text-gray-500 mt-1">Agendados</p>
            </div>
            <div className="p-4 rounded-xl text-center" style={{ backgroundColor: '#dcfce7' }}>
              <p className="text-3xl font-bold" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', color: '#059669' }}>{treinamentoRealizados}</p>
              <p className="text-xs text-gray-500 mt-1">Realizados</p>
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wider">Corretores prioritários</p>
            <div className="space-y-1.5">
              {urgentCorretores.length === 0 ? (
                <p className="text-xs text-gray-400">Nenhum corretor urgente</p>
              ) : urgentCorretores.map((l) => (
                <button key={l.id} onClick={() => onNavigate(l)} className="w-full flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50 text-left transition-colors">
                  <div className="w-5 h-5 rounded flex items-center justify-center text-white text-xs font-bold flex-shrink-0" style={{ backgroundColor: STAGES.find((s) => s.id === l.etapa)?.cor ?? '#333' }}>
                    {l.etapa}
                  </div>
                  <span className="text-xs font-medium text-gray-700 truncate flex-1">{l.nomeCorretor}</span>
                  <span className="text-xs text-gray-400">{formatRelativeTime(l.dataUltimaInteracao)}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Dashboard GR (Treinamento / Relacionamento) ───────────────────────────

function DashGR({ corretores, currentUser, onNavigate }: { corretores: Corretor[]; currentUser?: string; onNavigate: (l: Corretor) => void }) {
  const meusCorretores = currentUser
    ? corretores.filter((l) => l.responsavelGR === currentUser)
    : corretores;

  const stage6 = meusCorretores.filter((l) => l.etapa === 6 && (l.status === 'ativo' || l.status === 'nutricao'));
  const totalMeu = stage6.length;
  const comTreinamento = meusCorretores.filter((l) => l.treinamento).length;
  const treinAgendado = meusCorretores.filter((l) => l.treinamento && l.dataAgendamentoTreinamento).length;
  const treinRealizado = meusCorretores.filter((l) => l.treinamento && l.dataRealizacaoTreinamento).length;

  // A listagem de corretores não traz mais interacoes completas (ver corretorListInclude no
  // backend) — essas contagens/feed vêm de um endpoint agregado, escopado ao usuário logado.
  const [atividades, setAtividades] = useState<{ visitasRealizadas: number; whatsappEnviados: number; recentActivities: AtividadeRecente[] } | null>(null);
  useEffect(() => {
    dashboardApi.atividadesGr().then(setAtividades).catch(() => undefined);
  }, []);
  const visitasRealizadas = atividades?.visitasRealizadas ?? 0;
  const whatsappEnviados = atividades?.whatsappEnviados ?? 0;
  const recentActivities = atividades?.recentActivities ?? [];

  const hotCorretores = stage6
    .filter((l) => l.temperatura === 'quente')
    .slice(0, 5);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <KpiCard icon={<Users size={20} />} label="Em relacionamento" value={totalMeu} sub="Etapa 6 ativos" color="#0d9488" />
        <KpiCard icon={<CalendarCheck size={20} />} label="Treinamentos agendados" value={treinAgendado} sub={`${treinRealizado} realizados`} color="#10b981" />
        <KpiCard icon={<Handshake size={20} />} label="Visitas / Reuniões" value={visitasRealizadas} sub="total registradas" color="#0891b2" />
        <KpiCard icon={<MessageSquare size={20} />} label="WhatsApp enviados" value={whatsappEnviados} sub="total registrados" color="#8b5cf6" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Treinamento tracking */}
        <div className="bg-white rounded-2xl border p-5" style={{ borderColor: '#e5e7eb' }}>
          <h3 className="font-questrial font-bold text-sm text-gray-800 mb-4">Controle de Treinamentos</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-xl" style={{ backgroundColor: '#f0fdfa' }}>
              <span className="text-xs font-semibold text-gray-600">Interessados em treinamento</span>
              <span className="font-bold text-lg" style={{ color: '#0d9488', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{comTreinamento}</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl" style={{ backgroundColor: '#fffbeb' }}>
              <span className="text-xs font-semibold text-gray-600">Treinamento agendado</span>
              <span className="font-bold text-lg" style={{ color: '#d97706', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{treinAgendado}</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl" style={{ backgroundColor: '#dcfce7' }}>
              <span className="text-xs font-semibold text-gray-600">Treinamento realizado</span>
              <span className="font-bold text-lg" style={{ color: '#059669', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{treinRealizado}</span>
            </div>
            {comTreinamento > 0 && (
              <div>
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>Taxa de conclusão</span>
                  <span className="font-semibold">{Math.round((treinRealizado / comTreinamento) * 100)}%</span>
                </div>
                <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: '#f0f9ff' }}>
                  <div className="h-full rounded-full" style={{ width: `${(treinRealizado / comTreinamento) * 100}%`, backgroundColor: '#0d9488' }} />
                </div>
              </div>
            )}
          </div>

          <div className="mt-4 pt-4 border-t" style={{ borderColor: '#e5e7eb' }}>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Corretores quentes no relacionamento</p>
            <div className="space-y-1.5">
              {hotCorretores.length === 0 ? (
                <p className="text-xs text-gray-400">Nenhum corretor quente na etapa 6</p>
              ) : hotCorretores.map((l) => (
                <button key={l.id} onClick={() => onNavigate(l)} className="w-full flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50 text-left transition-colors">
                  <span className="text-sm">🔥</span>
                  <span className="text-xs font-medium text-gray-700 truncate flex-1">{l.nomeCorretor}</span>
                  <span className="text-xs text-gray-400">{l.clientesFinais.length} clientes</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Atividades recentes */}
        <div className="bg-white rounded-2xl border p-5" style={{ borderColor: '#e5e7eb' }}>
          <h3 className="font-questrial font-bold text-sm text-gray-800 mb-4">Atividades Recentes</h3>
          <div className="space-y-2">
            {recentActivities.length === 0 ? (
              <p className="text-xs text-gray-400">Nenhuma atividade registrada</p>
            ) : recentActivities.map((a) => {
              const tipoEmoji: Record<string, string> = {
                ligacao: '📞', whatsapp: '💬', email: '📧',
                visita: '🏢', reuniao: '🤝', nota: '📝', proposta: '📄',
              };
              return (
                <div key={a.id} className="flex items-start gap-2 p-2 rounded-lg" style={{ backgroundColor: '#f8f9fa' }}>
                  <span className="text-base flex-shrink-0">{tipoEmoji[a.tipo] ?? '📝'}</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-gray-700 truncate">{a.corretorNome}</p>
                    <p className="text-xs text-gray-500 truncate">{a.resumo}</p>
                  </div>
                  <span className="text-xs text-gray-400 flex-shrink-0">{formatRelativeTime(a.data)}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Dashboard GV (Vendas) ────────────────────────────────────────────────────

function DashGV({ corretores, currentUser, onNavigate }: { corretores: Corretor[]; currentUser?: string; onNavigate: (l: Corretor) => void }) {
  const meusCorretores = currentUser
    ? corretores.filter((l) => l.responsavelGV === currentUser)
    : corretores;

  const pipeline = meusCorretores.filter((l) => l.etapa >= 7 && l.etapa <= 9 && (l.status === 'ativo' || l.status === 'nutricao'));
  const negociacao = pipeline.filter((l) => l.etapa === 8).length;
  const fechamento = pipeline.filter((l) => l.etapa === 9).length;
  const monitoramento = pipeline.filter((l) => l.etapa === 7).length;

  // A listagem de corretores não traz mais propostas completas (ver corretorListInclude no
  // backend) — essas contagens vêm de um endpoint agregado, escopado ao usuário logado.
  // `primeiraPropostaPorCorretor` guarda a proposta mais ANTIGA de cada corretor (não a mais
  // recente) — replica o comportamento original desta tela, que é assim mesmo hoje.
  const [atividades, setAtividades] = useState<{ propostasPendentes: number; propostasAceitas: number; primeiraPropostaPorCorretor: Record<string, { valor: number }> } | null>(null);
  useEffect(() => {
    dashboardApi.atividadesGv().then(setAtividades).catch(() => undefined);
  }, []);
  const propostasPendentes = atividades?.propostasPendentes ?? 0;
  const propostasAceitas = atividades?.propostasAceitas ?? 0;
  const primeiraPropostaPorCorretor = atividades?.primeiraPropostaPorCorretor ?? {};

  const won = meusCorretores.filter((l) => l.status === 'ganho');
  const totalWonValue = won.reduce((acc, l) => acc + (l.valorFechamento ?? 0), 0);

  const pipelineValue = pipeline.reduce((acc, l) => acc + (primeiraPropostaPorCorretor[l.id]?.valor ?? 0), 0);

  const closingCorretores = pipeline
    .filter((l) => l.etapa >= 8)
    .sort((a, b) => new Date(b.dataUltimaInteracao).getTime() - new Date(a.dataUltimaInteracao).getTime())
    .slice(0, 6);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <KpiCard icon={<Users size={20} />} label="Em negociação" value={pipeline.length} sub="Etapas 7–9" color="#d55006" />
        <KpiCard icon={<FileText size={20} />} label="Propostas enviadas" value={propostasPendentes} sub={`${propostasAceitas} aceitas`} color="#0891b2" />
        <KpiCard icon={<TrendingUp size={20} />} label="Valor em pipeline" value={formatCurrency(pipelineValue)} sub="Negócios abertos" color="#8b5cf6" large />
        <KpiCard icon={<Trophy size={20} />} label="Volume fechado" value={formatCurrency(totalWonValue)} sub={`${won.length} fechamentos`} color="#059669" large />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pipeline GV */}
        <div className="bg-white rounded-2xl border p-5" style={{ borderColor: '#e5e7eb' }}>
          <h3 className="font-questrial font-bold text-sm text-gray-800 mb-4">Funil de Vendas</h3>
          <div className="space-y-3">
            {[
              { label: '7. Monitoramento GV', count: monitoramento, cor: '#0891b2' },
              { label: '8. Negociação', count: negociacao, cor: '#d55006' },
              { label: '9. Fechamento', count: fechamento, cor: '#059669' },
            ].map((s) => {
              const max = Math.max(monitoramento, negociacao, fechamento, 1);
              return (
                <div key={s.label} className="flex items-center gap-3">
                  <div className="w-40 text-xs text-gray-600 truncate font-medium">{s.label}</div>
                  <div className="flex-1 bg-gray-100 rounded-full h-6 overflow-hidden">
                    <div className="h-full rounded-full flex items-center px-2" style={{ width: `${(s.count / max) * 100 || 2}%`, backgroundColor: s.cor, minWidth: s.count > 0 ? 28 : 0 }}>
                      {s.count > 0 && <span className="text-white font-bold" style={{ fontSize: '10px' }}>{s.count}</span>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2">
            {[
              { label: 'Propostas pendentes', value: propostasPendentes, cor: '#f59e0b' },
              { label: 'Propostas aceitas', value: propostasAceitas, cor: '#059669' },
              { label: 'Fechamentos', value: won.length, cor: '#d55006' },
            ].map((item) => (
              <div key={item.label} className="p-3 rounded-xl text-center" style={{ backgroundColor: '#f8f9fa' }}>
                <p className="text-xl font-bold" style={{ color: item.cor, fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{item.value}</p>
                <p className="text-xs text-gray-400 mt-0.5 leading-tight">{item.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Corretores em fechamento */}
        <div className="bg-white rounded-2xl border p-5" style={{ borderColor: '#e5e7eb' }}>
          <h3 className="font-questrial font-bold text-sm text-gray-800 mb-4">Corretores em Negociação / Fechamento</h3>
          <div className="space-y-2">
            {closingCorretores.length === 0 ? (
              <p className="text-xs text-gray-400">Nenhum corretor em negociação</p>
            ) : closingCorretores.map((l) => {
              const primeiraProposta = primeiraPropostaPorCorretor[l.id];
              const stage = STAGES.find((s) => s.id === l.etapa);
              return (
                <button key={l.id} onClick={() => onNavigate(l)} className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 text-left transition-colors border" style={{ borderColor: '#f1f5f9' }}>
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0" style={{ backgroundColor: stage?.cor ?? '#333' }}>
                    {l.etapa}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-gray-800 truncate">{l.clienteFinalNome ?? l.nomeCorretor}</p>
                    <p className="text-xs text-gray-500 truncate">{l.imobiliaria}</p>
                  </div>
                  {primeiraProposta && (
                    <span className="text-xs font-bold flex-shrink-0" style={{ color: '#d55006' }}>
                      {formatCurrency(primeiraProposta.valor)}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Shared components ────────────────────────────────────────────────────────

function KpiCard({ icon, label, value, sub, color, large }: {
  icon: React.ReactNode; label: string; value: string | number; sub: string; color: string; large?: boolean;
}) {
  return (
    <div className="bg-white rounded-2xl border p-4 sm:p-5" style={{ borderColor: '#e5e7eb' }}>
      <div className="flex items-start justify-between mb-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${color}18`, color }}>
          {icon}
        </div>
      </div>
      <p className={`font-questrial font-bold ${large ? 'text-lg sm:text-xl' : 'text-2xl sm:text-3xl'} text-gray-900`}>{value}</p>
      <p className="text-xs font-semibold text-gray-500 mt-0.5">{label}</p>
      <p className="text-xs text-gray-400 mt-0.5">{sub}</p>
    </div>
  );
}

function TempBar({ label, count, total, bg, fill, text }: {
  label: string; count: number; total: number; bg: string; fill: string; text: string;
}) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-semibold" style={{ color: text }}>{label}</span>
        <span className="text-xs font-bold" style={{ color: text }}>{count} ({pct}%)</span>
      </div>
      <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: bg }}>
        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: fill }} />
      </div>
    </div>
  );
}
