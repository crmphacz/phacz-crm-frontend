import { useState } from 'react';
import {
  LayoutDashboard,
  KanbanSquare,
  Users,
  UserCheck,
  Settings,
  Building2,
  LogOut,
  BarChart2,
  Mail,
  Bot,
  Bell,
  BellOff,
  CalendarDays,
  CalendarClock,
  History,
  Table2,
} from 'lucide-react';
import { useStore, type ViewMode } from '../store';
import { getInitials, getFirstName } from '../utils';
import { NotificationBell } from './NotificationBell';
import { MyProfileModal } from './MyProfileModal';
import { canAccessView } from '../permissions';
import logo from '../images/logo-dark@2x.png';

const NAV_MAIN: { id: ViewMode; icon: React.ElementType; label: string }[] = [
  { id: 'pipeline', icon: KanbanSquare, label: 'Pipeline' },
  { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { id: 'corretores', icon: Users, label: 'Corretores' },
  { id: 'clientes', icon: UserCheck, label: 'Clientes Finais' },
  { id: 'empreendimentos', icon: Building2, label: 'Empreendimentos' },
  { id: 'rodadas', icon: CalendarDays, label: 'Calendário de Rodadas' },
  { id: 'agenda', icon: CalendarClock, label: 'Agenda' },
];

const NAV_MARKETING: { id: ViewMode; icon: React.ElementType; label: string }[] = [
  { id: 'email-marketing', icon: Mail, label: 'Email Marketing' },
];

const NAV_SECONDARY: { id: ViewMode; icon: React.ElementType; label: string }[] = [
  { id: 'indicadores', icon: BarChart2, label: 'Indicadores' },
  { id: 'tabelas-empreendimentos', icon: Table2, label: 'Tabelas de Custos' },
  { id: 'historico-acoes', icon: History, label: 'Histórico de Ações' },
];

const NAV_CONFIG: { id: ViewMode; icon: React.ElementType; label: string; diretoraOnly?: boolean }[] = [
  { id: 'config-usuarios', icon: Users, label: 'Usuários', diretoraOnly: true },
  { id: 'config-empresa', icon: Building2, label: 'Perfil da Empresa' },
  { id: 'config-regras', icon: Settings, label: 'Regras' },
];

const NAV_IA: { id: ViewMode; icon: React.ElementType; label: string }[] = [
  { id: 'phacz-ia', icon: Bot, label: 'PHACZ IA' },
];

export function Sidebar() {
  const view = useStore((s) => s.view);
  const setView = useStore((s) => s.setView);
  const logout = useStore((s) => s.logout);
  const corretores = useStore((s) => s.corretores);
  const currentUser = useStore((s) => s.currentUser);
  const pushSupported = useStore((s) => s.pushSupported);
  const pushSubscribed = useStore((s) => s.pushSubscribed);
  const enablePush = useStore((s) => s.enablePush);
  const disablePush = useStore((s) => s.disablePush);
  const [pushLoading, setPushLoading] = useState(false);
  const [pushError, setPushError] = useState('');
  const [showProfileModal, setShowProfileModal] = useState(false);

  const activeCorretores = corretores.filter((l) => l.status === 'ativo' || l.status === 'nutricao').length;
  const wonCorretores = corretores.filter((l) => l.status === 'ganho').length;

  const visibleConfigItems = NAV_CONFIG.filter((item) => !item.diretoraOnly || currentUser?.cargo === 'Diretora');
  const visibleMainItems = NAV_MAIN.filter((item) => canAccessView(currentUser, item.id));
  const visibleSecondaryItems = NAV_SECONDARY.filter((item) => canAccessView(currentUser, item.id));
  const visibleMarketingItems = NAV_MARKETING.filter((item) => canAccessView(currentUser, item.id));

  async function togglePush() {
    setPushError('');
    setPushLoading(true);
    try {
      if (pushSubscribed) {
        await disablePush();
      } else {
        await enablePush();
      }
    } catch (err) {
      setPushError(err instanceof Error ? err.message : 'Não foi possível atualizar as notificações.');
    } finally {
      setPushLoading(false);
    }
  }

  return (
    <aside className="w-64 flex-shrink-0 flex flex-col h-full" style={{ backgroundColor: '#1e1e1e' }}>
      {/* Logo */}
      <div className="px-5 py-5 border-b" style={{ borderColor: '#292929' }}>
        <div className="flex items-center justify-between gap-3">
          <img src={logo} alt="PHACZ Empreendimentos" className="h-12 w-auto flex-shrink-0" />
          <NotificationBell />
        </div>
      </div>

      {/* Quick stats */}
      <div className="px-4 py-4 border-b" style={{ borderColor: '#292929' }}>
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-xl p-3" style={{ backgroundColor: '#292929' }}>
            <div
              className="text-2xl font-bold text-white"
              style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}
            >
              {activeCorretores}
            </div>
            <div className="text-xs mt-0.5" style={{ color: '#6b7280' }}>
              Corretores ativos
            </div>
          </div>
          <div className="rounded-xl p-3" style={{ backgroundColor: '#292929' }}>
            <div
              className="text-2xl font-bold"
              style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', color: '#d55006' }}
            >
              {wonCorretores}
            </div>
            <div className="text-xs mt-0.5" style={{ color: '#6b7280' }}>
              Fechamentos
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto">
        <p
          className="text-xs font-semibold uppercase tracking-widest mb-2 px-3"
          style={{ color: '#4b5563' }}
        >
          Principal
        </p>
        <ul className="space-y-0.5 mb-6">
          {visibleMainItems.map(({ id, icon: Icon, label }) => {
            const isActive = view === id;
            return (
              <li key={id}>
                <button
                  onClick={() => setView(id)}
                  className="sidebar-item w-full min-w-0 flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all"
                  style={
                    isActive
                      ? { backgroundColor: '#d55006', color: '#fff' }
                      : {}
                  }
                >
                  <Icon size={17} className="flex-shrink-0" />
                  <span className="truncate">{label}</span>
                  {id === 'pipeline' && activeCorretores > 0 && !isActive && (
                    <span
                      className="ml-auto text-xs px-1.5 py-0.5 rounded-full font-bold"
                      style={{ backgroundColor: '#292929', color: '#d55006' }}
                    >
                      {activeCorretores}
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>

        {visibleMarketingItems.length > 0 && (
          <>
            <p
              className="text-xs font-semibold uppercase tracking-widest mb-2 px-3"
              style={{ color: '#4b5563' }}
            >
              Marketing
            </p>
            <ul className="space-y-0.5 mb-6">
              {visibleMarketingItems.map(({ id, icon: Icon, label }) => {
                const isActive = view === id;
                return (
                  <li key={id}>
                    <button
                      onClick={() => setView(id)}
                      className="sidebar-item w-full min-w-0 flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all"
                      style={
                        isActive
                          ? { backgroundColor: '#d55006', color: '#fff' }
                          : { color: '#9ca3af' }
                      }
                    >
                      <Icon size={17} className="flex-shrink-0" />
                      <span className="truncate">{label}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </>
        )}

        <p
          className="text-xs font-semibold uppercase tracking-widest mb-2 px-3"
          style={{ color: '#4b5563' }}
        >
          Análise
        </p>
        <ul className="space-y-0.5 mb-6">
          {visibleSecondaryItems.map(({ id, icon: Icon, label }) => {
            const isActive = view === id;
            return (
              <li key={id}>
                <button
                  onClick={() => setView(id)}
                  className="sidebar-item w-full min-w-0 flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all"
                  style={
                    isActive
                      ? { backgroundColor: '#d55006', color: '#fff' }
                      : {}
                  }
                >
                  <Icon size={17} className="flex-shrink-0" />
                  <span className="truncate">{label}</span>
                </button>
              </li>
            );
          })}
        </ul>

        <p
          className="text-xs font-semibold uppercase tracking-widest mb-2 px-3"
          style={{ color: '#4b5563' }}
        >
          Configuração
        </p>
        <ul className="space-y-0.5 mb-6">
          {visibleConfigItems.map(({ id, icon: Icon, label }) => {
            const isActive = view === id;
            return (
              <li key={id}>
                <button
                  onClick={() => setView(id)}
                  className="sidebar-item w-full min-w-0 flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all"
                  style={
                    isActive
                      ? { backgroundColor: '#d55006', color: '#fff' }
                      : {}
                  }
                >
                  <Icon size={17} className="flex-shrink-0" />
                  <span className="truncate">{label}</span>
                </button>
              </li>
            );
          })}
        </ul>

        <p
          className="text-xs font-semibold uppercase tracking-widest mb-2 px-3"
          style={{ color: '#4b5563' }}
        >
          Inteligência
        </p>
        <ul className="space-y-0.5">
          {NAV_IA.map(({ id, icon: Icon, label }) => {
            const isActive = view === id;
            return (
              <li key={id}>
                <button
                  onClick={() => setView(id)}
                  className="sidebar-item w-full min-w-0 flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all"
                  style={
                    isActive
                      ? { backgroundColor: '#d55006', color: '#fff' }
                      : {}
                  }
                >
                  <Icon size={17} className="flex-shrink-0" />
                  <span className="truncate">{label}</span>
                  {!isActive && (
                    <span
                      className="ml-auto text-xs px-1.5 py-0.5 rounded-full font-bold"
                      style={{ backgroundColor: '#292929', color: '#d55006' }}
                    >
                      Beta
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* User / Logout */}
      <div className="px-4 py-4 border-t" style={{ borderColor: '#292929' }}>
        <div className="flex items-center gap-1.5 mb-3">
          <button
            type="button"
            onClick={() => setShowProfileModal(true)}
            title="Ver meu perfil"
            aria-label="Abrir meu perfil"
            className="group flex items-center gap-3 flex-1 min-w-0 rounded-xl px-2 py-1.5 -ml-1 cursor-pointer transition-colors hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/30"
          >
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 text-white text-sm font-bold"
              style={{ backgroundColor: currentUser?.cor ?? '#d55006', fontFamily: 'Plus Jakarta Sans, sans-serif' }}
            >
              {currentUser ? getInitials(currentUser.nome) : '?'}
            </div>
            <div className="min-w-0 flex-1 text-left">
              <div className="text-sm font-semibold text-white truncate group-hover:underline underline-offset-2 decoration-white/40">
                {currentUser ? getFirstName(currentUser.nome) : '—'}
              </div>
              <div className="text-xs truncate" style={{ color: '#6b7280' }}>
                {currentUser?.cargo ?? ''}
              </div>
            </div>
          </button>
          {pushSupported && (
            <button
              onClick={togglePush}
              disabled={pushLoading}
              title={pushSubscribed ? 'Notificações push ativadas — clique para desativar' : 'Ativar notificações push no navegador'}
              className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors disabled:opacity-50 flex-shrink-0"
              style={
                pushSubscribed
                  ? { color: '#d55006', backgroundColor: 'rgba(213,80,6,0.15)' }
                  : { color: '#6b7280' }
              }
            >
              {pushSubscribed ? <Bell size={15} /> : <BellOff size={15} />}
            </button>
          )}
          <button
            onClick={logout}
            title="Sair"
            className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-500 hover:text-red-400 hover:bg-red-900/20 transition-colors flex-shrink-0"
          >
            <LogOut size={15} />
          </button>
        </div>
        {pushError && (
          <p className="text-xs mb-1" style={{ color: '#f87171' }}>{pushError}</p>
        )}
      </div>

      {showProfileModal && <MyProfileModal onClose={() => setShowProfileModal(false)} />}
    </aside>
  );
}
