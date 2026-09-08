import { useState } from 'react';
import { X, Mail, Send, CheckCircle2 } from 'lucide-react';
import { authApi } from '../api/endpoints';
import { ApiError } from '../api/client';

/**
 * A resposta do backend é sempre a mesma genérica, exista ou não o e-mail (anti-enumeração de
 * contas) — por isso a mensagem de sucesso aqui também não afirma "encontramos sua conta",
 * só confirma que o e-mail foi enviado se ela existir.
 */
export function ForgotPasswordModal({ onClose }: { onClose: () => void }) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) {
      setError('Informe o e-mail da sua conta.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await authApi.forgotPassword(email.trim());
      setSent(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Não foi possível enviar o e-mail. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center modal-backdrop"
      style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-2 sm:mx-4" style={{ boxShadow: '0 25px 60px rgba(0,0,0,0.4)' }}>
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 sm:py-5 border-b" style={{ borderColor: '#e5e7eb' }}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#fff7ed' }}>
              <Mail size={18} style={{ color: '#d55006' }} />
            </div>
            <div>
              <h2 className="font-questrial font-bold text-lg text-gray-900">Esqueci minha senha</h2>
              <p className="text-xs text-gray-400">Informe seu e-mail de acesso</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-100 transition-colors flex-shrink-0">
            <X size={16} />
          </button>
        </div>

        <div className="px-5 sm:px-6 py-5">
          {sent ? (
            <div className="text-center py-2">
              <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3" style={{ backgroundColor: '#dcfce7' }}>
                <CheckCircle2 size={24} style={{ color: '#059669' }} />
              </div>
              <p className="text-sm font-semibold text-gray-800">E-mail enviado</p>
              <p className="text-xs text-gray-500 mt-1.5 leading-relaxed">
                Se <strong>{email.trim()}</strong> estiver cadastrado no PHACZ CRM, você vai receber um link para
                redefinir sua senha em instantes. Confira também a caixa de spam.
              </p>
              <button
                onClick={onClose}
                className="w-full mt-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-colors hover:opacity-90"
                style={{ backgroundColor: '#d55006' }}
              >
                Voltar ao login
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <p className="text-sm text-gray-500">
                Enviaremos um link de redefinição de senha pro e-mail cadastrado, se ele existir na plataforma.
              </p>
              <div>
                <label htmlFor="forgot-email" className="text-xs font-semibold text-gray-600 block mb-1.5">
                  E-mail
                </label>
                <div className="relative">
                  <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                  <input
                    id="forgot-email"
                    type="email"
                    autoComplete="email"
                    autoFocus
                    className="form-input"
                    style={{ paddingLeft: '2.5rem' }}
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); setError(''); }}
                    placeholder="seu@email.com.br"
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
                    Enviando...
                  </>
                ) : (
                  <>
                    <Send size={16} />
                    Enviar link de redefinição
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
