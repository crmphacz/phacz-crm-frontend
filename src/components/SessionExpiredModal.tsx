import { useEffect, useRef, useState } from 'react';
import { LockKeyhole, LogOut } from 'lucide-react';
import { useStore } from '../store';
import { authApi } from '../api/endpoints';
import { ApiError, registrarHandlerDeSessaoExpirada, setToken } from '../api/client';
import { Spinner } from './Spinner';

/**
 * Aparece quando o token expira com a tela aberta — o que acontece todo dia, porque o token
 * vale 24h e quase ninguém fecha a aba do CRM.
 *
 * O que ele resolve: antes, a sessão vencida não deslogava ninguém. A tela continuava com cara
 * de logada e cada tentativa de salvar voltava um toast de "token inválido". Quem estava no meio
 * de um formulário longo tentava de novo, recebia o mesmo toast e perdia o trabalho sem entender
 * o motivo.
 *
 * Aqui a pessoa digita a senha e segue de onde parou: o `apiFetch` repete a requisição que tomou
 * o 401 assim que o token novo é gravado, então o que ela estava salvando chega ao servidor.
 *
 * Não tem X nem fecha clicando fora, de propósito: enquanto a sessão estiver vencida não há nada
 * de útil a fazer na tela, e voltar para ela só traria o toast de novo. As duas saídas são
 * explícitas — reautenticar ou sair.
 */
export function SessionExpiredModal() {
  const currentUser = useStore((s) => s.currentUser);
  const logout = useStore((s) => s.logout);

  const [aberto, setAberto] = useState(false);
  const [senha, setSenha] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Guarda o `resolve` da promessa que o apiFetch está esperando: é ele que decide se a
  // requisição será repetida (true) ou se o erro sobe e a pessoa é deslogada (false).
  const resolverRef = useRef<((reautenticou: boolean) => void) | null>(null);

  useEffect(
    () =>
      registrarHandlerDeSessaoExpirada(
        () =>
          new Promise<boolean>((resolve) => {
            resolverRef.current = resolve;
            setSenha('');
            setError('');
            setSubmitting(false);
            setAberto(true);
          })
      ),
    []
  );

  function responder(reautenticou: boolean) {
    resolverRef.current?.(reautenticou);
    resolverRef.current = null;
    setAberto(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!currentUser || !senha.trim() || submitting) return;

    setSubmitting(true);
    setError('');
    try {
      const { token } = await authApi.login(currentUser.email, senha);
      setToken(token);
      responder(true);
    } catch (err) {
      setError(
        err instanceof ApiError && err.status === 401
          ? 'Senha incorreta. Tente novamente.'
          : 'Não foi possível entrar agora. Verifique a conexão e tente novamente.'
      );
      setSubmitting(false);
    }
  }

  function handleSair() {
    responder(false);
    logout();
  }

  if (!aberto || !currentUser) return null;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center modal-backdrop"
      style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
    >
      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-2 sm:mx-4 flex flex-col"
      >
        <div className="flex items-center gap-3 px-4 sm:px-6 py-4 sm:py-5 border-b" style={{ borderColor: '#e5e7eb' }}>
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: '#fff7ed' }}
          >
            <LockKeyhole size={18} style={{ color: '#d55006' }} />
          </div>
          <div className="min-w-0">
            <h2 className="font-questrial font-bold text-lg text-gray-900">Sua sessão expirou</h2>
            <p className="text-xs text-gray-500 truncate">{currentUser.email}</p>
          </div>
        </div>

        <div className="px-4 sm:px-6 py-4 sm:py-5 space-y-3">
          <p className="text-sm text-gray-600">
            Por segurança, o acesso vence depois de um tempo. Digite sua senha para continuar — o
            que você estava salvando será enviado logo em seguida.
          </p>

          <div>
            <label className="text-xs font-semibold text-gray-600 mb-1 block">Senha</label>
            <input
              autoFocus
              type="password"
              autoComplete="current-password"
              className={`form-input ${error ? 'border-red-400' : ''}`}
              placeholder="Sua senha de acesso"
              value={senha}
              onChange={(e) => {
                setSenha(e.target.value);
                setError('');
              }}
            />
          </div>

          {error && <p className="text-xs text-red-500">{error}</p>}
        </div>

        <div
          className="flex items-center gap-3 px-4 sm:px-6 py-4 border-t bg-gray-50 rounded-b-2xl"
          style={{ borderColor: '#e5e7eb' }}
        >
          <button
            type="button"
            onClick={handleSair}
            disabled={submitting}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-200 transition-colors disabled:opacity-60"
          >
            <LogOut size={15} />
            Sair
          </button>
          <button
            type="submit"
            disabled={submitting || !senha.trim()}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold text-white transition-colors hover:opacity-90 disabled:opacity-60"
            style={{ backgroundColor: '#d55006' }}
          >
            {submitting && <Spinner size={14} />}
            {submitting ? 'Entrando…' : 'Continuar trabalhando'}
          </button>
        </div>
      </form>
    </div>
  );
}
