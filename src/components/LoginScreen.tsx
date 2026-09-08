import { useState } from 'react';
import { LogIn, Eye, EyeOff, Mail, Lock } from 'lucide-react';
import { useStore } from '../store';
import { ForgotPasswordModal } from './ForgotPasswordModal';
import logo from '../images/logo-dark@2x.png';

export function LoginScreen() {
  const login = useStore((s) => s.login);
  const authError = useStore((s) => s.authError);
  const setShowPrivacyPolicy = useStore((s) => s.setShowPrivacyPolicy);

  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [showSenha, setShowSenha] = useState(false);
  const [loading, setLoading] = useState(false);
  const [validationError, setValidationError] = useState('');
  const [showForgotPassword, setShowForgotPassword] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setValidationError('');
    if (!email.trim() || !senha.trim()) {
      setValidationError('Preencha e-mail e senha para continuar.');
      return;
    }
    setLoading(true);
    await login(email.trim(), senha);
    setLoading(false);
  }

  const error = validationError || authError;

  return (
    <div
      className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden px-4 py-12"
      style={{ backgroundColor: '#1e1e1e', fontFamily: 'Inter, sans-serif' }}
    >
      {/* Decorative background glow */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div
          className="absolute -top-32 -left-32 w-72 h-72 sm:w-96 sm:h-96 rounded-full blur-3xl opacity-25"
          style={{ backgroundColor: '#d55006' }}
        />
        <div
          className="absolute -bottom-40 -right-24 w-72 h-72 sm:w-[28rem] sm:h-[28rem] rounded-full blur-3xl opacity-20"
          style={{ backgroundColor: '#3b2a1f' }}
        />
      </div>

      {/* Branding */}
      <div className="relative z-10 flex flex-col items-center text-center mb-8">
        <img src={logo} alt="PHACZ Empreendimentos" className="h-16 sm:h-24 w-auto mb-4" />
        <h2
          className="text-lg sm:text-2xl text-white"
          style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}
        >
          Sistema de Gestão Comercial
        </h2>
      </div>

      {/* Login form */}
      <div className="relative z-10 w-full max-w-md">
        <div
          className="login-card w-full bg-white rounded-2xl sm:rounded-3xl p-6 sm:p-8"
          style={{ boxShadow: '0 25px 60px rgba(0,0,0,0.5)' }}
        >
          <div className="mb-7">
            <h3
              className="text-2xl font-bold text-gray-900"
              style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}
            >
              Bem-vindo de volta
            </h3>
            <p className="text-sm text-gray-400 mt-1">Acesse sua conta para continuar</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label htmlFor="login-email" className="text-xs font-semibold text-gray-600 block mb-1.5">
                E-mail
              </label>
              <div className="relative">
                <Mail
                  size={16}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                />
                <input
                  id="login-email"
                  type="email"
                  autoComplete="email"
                  className="form-input"
                  style={{ paddingLeft: '2.5rem' }}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com.br"
                />
              </div>
            </div>

            <div>
              <label htmlFor="login-senha" className="text-xs font-semibold text-gray-600 block mb-1.5">
                Senha
              </label>
              <div className="relative">
                <Lock
                  size={16}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                />
                <input
                  id="login-senha"
                  type={showSenha ? 'text' : 'password'}
                  autoComplete="current-password"
                  className="form-input"
                  style={{ paddingLeft: '2.5rem', paddingRight: '2.5rem' }}
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowSenha(!showSenha)}
                  aria-label={showSenha ? 'Ocultar senha' : 'Mostrar senha'}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showSenha ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              <div className="flex justify-end mt-1.5">
                <button
                  type="button"
                  onClick={() => setShowForgotPassword(true)}
                  className="text-xs font-semibold hover:underline transition-colors"
                  style={{ color: '#d55006' }}
                >
                  Esqueci minha senha
                </button>
              </div>
            </div>

            {error && (
              <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2 flex items-center gap-1.5">
                <span>⚠</span> {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2 transition-all hover:opacity-90 active:scale-[0.99] disabled:opacity-70"
              style={{ backgroundColor: '#d55006', boxShadow: '0 8px 20px rgba(213,80,6,0.35)' }}
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Entrando...
                </>
              ) : (
                <>
                  <LogIn size={16} />
                  Entrar no sistema
                </>
              )}
            </button>
          </form>

          <p className="text-center text-xs text-gray-300 mt-6">
            PHACZ CRM © {new Date().getFullYear()} — Empreendimentos
            {' · '}
            <button
              type="button"
              onClick={() => setShowPrivacyPolicy(true)}
              className="underline hover:text-gray-400 transition-colors"
            >
              Política de Privacidade
            </button>
          </p>
        </div>
      </div>

      {showForgotPassword && <ForgotPasswordModal onClose={() => setShowForgotPassword(false)} />}
    </div>
  );
}
