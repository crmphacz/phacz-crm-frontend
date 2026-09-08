import { useState } from 'react';
import { KeyRound, Eye, EyeOff, Lock, CheckCircle2, XCircle } from 'lucide-react';
import { authApi } from '../api/endpoints';
import { ApiError } from '../api/client';
import logo from '../images/logo-dark@2x.png';

/**
 * Página que o link do e-mail de "esqueci minha senha" abre (?token=... — ver
 * POST /forgot-password no backend). Fora do fluxo normal de login/app: não depende do store
 * de auth, porque quem chega aqui pode não estar (e normalmente não está) logado.
 */
export function ResetPasswordScreen({ token }: { token: string }) {
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [showSenhas, setShowSenhas] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (novaSenha.length < 6) return setError('A nova senha deve ter ao menos 6 caracteres.');
    if (novaSenha !== confirmarSenha) return setError('As senhas não coincidem.');

    setLoading(true);
    try {
      await authApi.resetPassword(token, novaSenha);
      setDone(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Não foi possível redefinir a senha. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }

  function goToLogin() {
    window.location.href = '/';
  }

  return (
    <div
      className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden px-4 py-12"
      style={{ backgroundColor: '#1e1e1e', fontFamily: 'Inter, sans-serif' }}
    >
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-32 -left-32 w-72 h-72 sm:w-96 sm:h-96 rounded-full blur-3xl opacity-25" style={{ backgroundColor: '#d55006' }} />
        <div className="absolute -bottom-40 -right-24 w-72 h-72 sm:w-[28rem] sm:h-[28rem] rounded-full blur-3xl opacity-20" style={{ backgroundColor: '#3b2a1f' }} />
      </div>

      <div className="relative z-10 flex flex-col items-center text-center mb-8">
        <img src={logo} alt="PHACZ Empreendimentos" className="h-16 sm:h-20 w-auto mb-4" />
        <h2 className="text-lg sm:text-2xl text-white" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
          Redefinir senha
        </h2>
      </div>

      <div className="relative z-10 w-full max-w-md">
        <div className="login-card w-full bg-white rounded-2xl sm:rounded-3xl p-6 sm:p-8" style={{ boxShadow: '0 25px 60px rgba(0,0,0,0.5)' }}>
          {done ? (
            <div className="text-center py-2">
              <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: '#dcfce7' }}>
                <CheckCircle2 size={28} style={{ color: '#059669' }} />
              </div>
              <h3 className="text-xl font-bold text-gray-900" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
                Senha redefinida
              </h3>
              <p className="text-sm text-gray-500 mt-2">Sua senha foi alterada com sucesso. Já pode entrar com a nova senha.</p>
              <button
                onClick={goToLogin}
                className="w-full mt-6 py-3 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90"
                style={{ backgroundColor: '#d55006', boxShadow: '0 8px 20px rgba(213,80,6,0.35)' }}
              >
                Ir para o login
              </button>
            </div>
          ) : error.includes('inválido') || error.includes('expirado') ? (
            <div className="text-center py-2">
              <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: '#fee2e2' }}>
                <XCircle size={28} style={{ color: '#dc2626' }} />
              </div>
              <h3 className="text-xl font-bold text-gray-900" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
                Link inválido ou expirado
              </h3>
              <p className="text-sm text-gray-500 mt-2">
                Esse link de redefinição não é mais válido — ele expira 1 hora após ser gerado. Solicite um novo em "Esqueci minha senha" na tela de login.
              </p>
              <button
                onClick={goToLogin}
                className="w-full mt-6 py-3 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90"
                style={{ backgroundColor: '#d55006', boxShadow: '0 8px 20px rgba(213,80,6,0.35)' }}
              >
                Voltar ao login
              </button>
            </div>
          ) : (
            <>
              <div className="mb-7 flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#fff7ed' }}>
                  <KeyRound size={18} style={{ color: '#d55006' }} />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
                    Escolha uma nova senha
                  </h3>
                  <p className="text-sm text-gray-400 mt-1">Isso encerra qualquer sessão aberta com a senha antiga.</p>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="nova-senha" className="text-xs font-semibold text-gray-600 block mb-1.5">
                    Nova senha
                  </label>
                  <div className="relative">
                    <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    <input
                      id="nova-senha"
                      type={showSenhas ? 'text' : 'password'}
                      autoComplete="new-password"
                      autoFocus
                      className="form-input"
                      style={{ paddingLeft: '2.5rem', paddingRight: '2.5rem' }}
                      value={novaSenha}
                      onChange={(e) => setNovaSenha(e.target.value)}
                      placeholder="Mínimo 6 caracteres"
                    />
                    <button
                      type="button"
                      onClick={() => setShowSenhas(!showSenhas)}
                      aria-label={showSenhas ? 'Ocultar senhas' : 'Mostrar senhas'}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      {showSenhas ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <div>
                  <label htmlFor="confirmar-senha" className="text-xs font-semibold text-gray-600 block mb-1.5">
                    Confirmar nova senha
                  </label>
                  <div className="relative">
                    <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    <input
                      id="confirmar-senha"
                      type={showSenhas ? 'text' : 'password'}
                      autoComplete="new-password"
                      className="form-input"
                      style={{ paddingLeft: '2.5rem' }}
                      value={confirmarSenha}
                      onChange={(e) => setConfirmarSenha(e.target.value)}
                      placeholder="Repita a nova senha"
                    />
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
                      Salvando...
                    </>
                  ) : (
                    <>
                      <KeyRound size={16} />
                      Redefinir senha
                    </>
                  )}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
