import { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, UserCircle, Mail, ShieldCheck, KeyRound, CheckCircle2 } from 'lucide-react';
import { authApi } from '../api/endpoints';
import { ApiError } from '../api/client';
import { useStore } from '../store';
import { getInitials } from '../utils';

/**
 * "Meu perfil" — aberto pelo bloco do usuário no rodapé da sidebar. Mostra os dados
 * cadastrados (nome completo, e-mail, perfil de acesso) e deixa a pessoa pedir um link de
 * redefinição de senha para o próprio e-mail. Reaproveita POST /api/auth/forgot-password
 * (mesmo fluxo do "Esqueci minha senha" da tela de login).
 */
export function MyProfileModal({ onClose }: { onClose: () => void }) {
  const currentUser = useStore((s) => s.currentUser);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  if (!currentUser) return null;
  const email = currentUser.email;

  async function handleRequestReset() {
    setError('');
    setLoading(true);
    try {
      await authApi.forgotPassword(email);
      setSent(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Não foi possível enviar o e-mail. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }

  // Portal para o body: a sidebar (que abre este modal) fica sob um wrapper com
  // `translate-x-0` no desktop, e qualquer transform vira containing block de `position: fixed`
  // — sem o portal o modal ficaria preso na largura da coluna lateral.
  return createPortal(
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center modal-backdrop"
      style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-2 sm:mx-4" style={{ boxShadow: '0 25px 60px rgba(0,0,0,0.4)' }}>
        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: '#e5e7eb' }}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#fff7ed' }}>
              <UserCircle size={18} style={{ color: '#d55006' }} />
            </div>
            <h2 className="font-questrial font-bold text-lg text-gray-900">Meu perfil</h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-100 transition-colors flex-shrink-0"
          >
            <X size={16} />
          </button>
        </div>

        <div className="px-5 py-5">
          <div className="flex items-center gap-3 mb-5">
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center text-white text-base font-bold flex-shrink-0"
              style={{ backgroundColor: currentUser.cor || '#d55006', fontFamily: 'Plus Jakarta Sans, sans-serif' }}
            >
              {getInitials(currentUser.nome)}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-gray-900 truncate">{currentUser.nome}</p>
              <p className="text-xs text-gray-400">Nome completo cadastrado</p>
            </div>
          </div>

          <div className="space-y-3 mb-5">
            <div className="flex items-start gap-3">
              <Mail size={15} className="text-gray-400 mt-0.5 flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-xs font-semibold text-gray-400">E-mail</p>
                <p className="text-sm text-gray-800 break-all">{currentUser.email}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <ShieldCheck size={15} className="text-gray-400 mt-0.5 flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-xs font-semibold text-gray-400">Perfil de acesso</p>
                <p className="text-sm text-gray-800">{currentUser.cargo}</p>
              </div>
            </div>
          </div>

          <div className="border-t pt-4" style={{ borderColor: '#f3f4f6' }}>
            {sent ? (
              <div className="flex items-start gap-2.5 rounded-xl px-3 py-3" style={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0' }}>
                <CheckCircle2 size={16} style={{ color: '#059669' }} className="flex-shrink-0 mt-0.5" />
                <p className="text-xs text-gray-600 leading-relaxed">
                  Enviamos um link de redefinição de senha para <strong>{currentUser.email}</strong>. Abra o e-mail e
                  siga o link para criar uma nova senha — ele expira em 1 hora. Confira também a caixa de spam.
                </p>
              </div>
            ) : (
              <>
                <p className="text-xs text-gray-500 mb-2.5">
                  Precisa trocar sua senha? Enviaremos um link para o seu e-mail e você conclui o processo por lá.
                </p>
                {error && (
                  <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2 mb-2.5">{error}</p>
                )}
                <button
                  onClick={handleRequestReset}
                  disabled={loading}
                  className="w-full py-2.5 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2 transition-all hover:opacity-90 disabled:opacity-70"
                  style={{ backgroundColor: '#d55006' }}
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Enviando...
                    </>
                  ) : (
                    <>
                      <KeyRound size={15} />
                      Solicitar redefinição de senha
                    </>
                  )}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
