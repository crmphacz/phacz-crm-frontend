import { useEffect, useState, lazy, Suspense } from 'react';
import { Building2, Menu } from 'lucide-react';
import { useStore } from './store';
import { Sidebar } from './components/Sidebar';
import { PipelineView } from './components/PipelineView';
import { CorretorDetailPanel } from './components/CorretorDetailPanel';
import { NewCorretorModal } from './components/NewCorretorModal';
import { Dashboard } from './components/Dashboard';
import { CorretoresListView } from './components/CorretoresListView';
import { ClientesView } from './components/ClientesView';
import { UsersSettingsView } from './components/UsersSettingsView';
import { CompanyProfileView } from './components/CompanyProfileView';
import { PipelineRulesView } from './components/PipelineRulesView';
import { IndicadoresView } from './components/IndicadoresView';
import { LoginScreen } from './components/LoginScreen';
import { ChangePasswordScreen } from './components/ChangePasswordScreen';
import { ResetPasswordScreen } from './components/ResetPasswordScreen';
import { PrivacyPolicyModal } from './components/PrivacyPolicyModal';
import { EmailMarketingView } from './components/EmailMarketingView';
import { PhaczIAView } from './components/PhaczIAView';
import { RodadasCalendarView } from './components/RodadasCalendarView';
import { AgendaView } from './components/AgendaView';
import { EmpreendimentosListView } from './components/EmpreendimentosListView';
import { HistoricoAcoesView } from './components/HistoricoAcoesView';
import { ToastContainer } from './components/ToastContainer';
import { ViewLoader } from './components/ViewLoader';

// Carrega sob demanda: puxa a biblioteca de planilha (fortune-sheet), pesada.
const TabelasEmpreendimentosView = lazy(() =>
  import('./components/TabelasEmpreendimentosView').then((m) => ({ default: m.TabelasEmpreendimentosView }))
);

export default function App() {
  const view = useStore((s) => s.view);
  const selectedCorretorId = useStore((s) => s.selectedCorretorId);
  const showNewCorretorModal = useStore((s) => s.showNewCorretorModal);
  const isLoggedIn = useStore((s) => s.isLoggedIn);
  const isBootstrapping = useStore((s) => s.isBootstrapping);
  const mustChangePassword = useStore((s) => s.mustChangePassword);
  const showPrivacyPolicy = useStore((s) => s.showPrivacyPolicy);
  const setShowPrivacyPolicy = useStore((s) => s.setShowPrivacyPolicy);
  const initFromToken = useStore((s) => s.initFromToken);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    setMobileNavOpen(false);
  }, [view]);

  useEffect(() => {
    initFromToken();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // A política de privacidade precisa renderizar por cima de QUALQUER tela (inclusive antes
  // do login), então fica fora do if/else abaixo em vez de duplicada em cada branch.
  const privacyModal = showPrivacyPolicy && <PrivacyPolicyModal onClose={() => setShowPrivacyPolicy(false)} />;

  // Link do e-mail de "esqueci minha senha" (ver resetLink em auth/routes.ts). App não usa
  // roteador nenhum — isso é a única "rota" própria do front, tratada manualmente aqui, fora
  // de todo o fluxo normal de login/app porque quem chega por esse link não está logado.
  const resetPasswordToken = window.location.pathname === '/redefinir-senha'
    ? new URLSearchParams(window.location.search).get('token')
    : null;
  if (resetPasswordToken) {
    return <ResetPasswordScreen token={resetPasswordToken} />;
  }

  if (isBootstrapping) {
    return (
      <div className="h-screen flex flex-col items-center justify-center gap-3" style={{ backgroundColor: '#1e1e1e' }}>
        <div
          className="w-12 h-12 rounded-2xl flex items-center justify-center animate-pulse"
          style={{ backgroundColor: '#d55006' }}
        >
          <Building2 size={22} color="#fff" />
        </div>
        <p className="text-sm" style={{ color: '#9ca3af' }}>Carregando PHACZ CRM...</p>
      </div>
    );
  }

  if (!isLoggedIn) {
    return <>
      <LoginScreen />
      {privacyModal}
    </>;
  }

  if (mustChangePassword) {
    return <>
      <ChangePasswordScreen />
      {privacyModal}
    </>;
  }

  return (
    <div className="flex h-screen overflow-hidden relative" style={{ backgroundColor: '#e6e3de' }}>
      {/* Mobile drawer backdrop */}
      {mobileNavOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setMobileNavOpen(false)}
        />
      )}

      {/* Sidebar: off-canvas drawer on mobile, static column on desktop */}
      <div
        className={`fixed inset-y-0 left-0 z-50 transition-transform duration-200 ease-out md:static md:z-auto md:translate-x-0 ${
          mobileNavOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <Sidebar />
      </div>

      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Mobile top bar */}
        <div
          className="md:hidden flex items-center gap-3 px-4 py-3 border-b flex-shrink-0"
          style={{ backgroundColor: '#1e1e1e', borderColor: '#292929' }}
        >
          <button
            onClick={() => setMobileNavOpen(true)}
            className="w-9 h-9 rounded-lg flex items-center justify-center text-white flex-shrink-0"
            style={{ backgroundColor: '#292929' }}
          >
            <Menu size={18} />
          </button>
          <div
            className="text-white text-base tracking-widest"
            style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}
          >
            PHACZ
          </div>
        </div>

        <main className="flex-1 flex flex-col overflow-hidden min-w-0">
          {view === 'pipeline' && <PipelineView />}
          {view === 'dashboard' && <Dashboard />}
          {view === 'corretores' && <CorretoresListView />}
          {view === 'clientes' && <ClientesView />}
          {view === 'config-usuarios' && <UsersSettingsView />}
          {view === 'config-empresa' && <CompanyProfileView />}
          {view === 'config-regras' && <PipelineRulesView />}
          {view === 'indicadores' && <IndicadoresView />}
          {view === 'email-marketing' && <EmailMarketingView />}
          {view === 'phacz-ia' && <PhaczIAView />}
          {view === 'rodadas' && <RodadasCalendarView />}
          {view === 'agenda' && <AgendaView />}
          {view === 'tabelas-empreendimentos' && (
            <Suspense fallback={<ViewLoader label="Carregando editor…" />}>
              <TabelasEmpreendimentosView />
            </Suspense>
          )}
          {view === 'empreendimentos' && <EmpreendimentosListView />}
          {view === 'historico-acoes' && <HistoricoAcoesView />}
        </main>
      </div>

      {selectedCorretorId && <CorretorDetailPanel />}
      {showNewCorretorModal && <NewCorretorModal />}
      {privacyModal}
      <ToastContainer />
    </div>
  );
}
