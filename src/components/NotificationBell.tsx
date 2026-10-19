import { useState } from 'react';
import { createPortal } from 'react-dom';
import { Bell, Check, X } from 'lucide-react';
import { useStore } from '../store';
import { formatRelativeTime } from '../utils';
import type { Notificacao } from '../types';

/**
 * Altura visível do painel antes de rolar: 3 notificações. Acima disso a lista rola em vez
 * de esticar o painel até o rodapé da tela.
 */
const ALTURA_DE_TRES = 258;

export function NotificationBell() {
  const notificacoes = useStore((s) => s.notificacoes);
  const naoLidas = useStore((s) => s.notificacoesNaoLidas);
  const markNotificacaoLida = useStore((s) => s.markNotificacaoLida);
  const markAllNotificacoesLidas = useStore((s) => s.markAllNotificacoesLidas);
  const removeNotificacao = useStore((s) => s.removeNotificacao);
  const abrirNotificacaoRodada = useStore((s) => s.abrirNotificacaoRodada);
  const [open, setOpen] = useState(false);

  function handleSelect(n: Notificacao) {
    setOpen(false);
    abrirNotificacaoRodada(n);
  }

  /**
   * O painel vai para o `body` por portal. O container da sidebar tem `md:translate-x-0`, e
   * um `transform` cria contexto de empilhamento: preso ali, o painel `fixed` era posicionado
   * em relação à sidebar e, pior, nunca conseguia subir acima do conteúdo principal — que é
   * irmão seguinte no DOM. Era por isso que os cards do pipeline passavam por cima dele.
   */
  const painel = (
    <>
      <div className="fixed inset-0 z-[90]" onClick={() => setOpen(false)} />
      <div
        className="fixed z-[91] w-80 max-w-[90vw] bg-white rounded-2xl shadow-2xl border overflow-hidden flex flex-col"
        style={{ borderColor: '#e5e7eb', top: 64, left: 16, maxHeight: '70vh' }}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b flex-shrink-0" style={{ borderColor: '#e5e7eb' }}>
          <p className="text-sm font-bold text-gray-800">Notificações</p>
          {naoLidas > 0 && (
            <button
              onClick={() => markAllNotificacoesLidas()}
              className="text-xs font-semibold"
              style={{ color: '#d55006' }}
            >
              Marcar todas como lidas
            </button>
          )}
        </div>

        <div className="overflow-y-auto" style={{ maxHeight: ALTURA_DE_TRES }}>
          {notificacoes.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-10">Nenhuma notificação por aqui.</p>
          )}
          {notificacoes.map((n) => (
            <div
              key={n.id}
              className="group border-b flex items-start gap-1 hover:bg-gray-50 transition-colors"
              style={{ borderColor: '#f3f4f6' }}
            >
              <button
                onClick={() => handleSelect(n)}
                className="flex-1 min-w-0 text-left pl-4 py-3 flex items-start gap-2.5"
              >
                <div className="w-2 flex-shrink-0 mt-1.5">
                  {!n.lida && <span className="block w-2 h-2 rounded-full" style={{ backgroundColor: '#d55006' }} />}
                </div>
                <div className="min-w-0">
                  <p className={`text-sm truncate ${n.lida ? 'font-medium text-gray-500' : 'font-semibold text-gray-800'}`}>
                    {n.titulo}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5 truncate">{n.mensagem}</p>
                  <p className="text-[11px] text-gray-400 mt-1">{formatRelativeTime(n.criadoEm)}</p>
                </div>
              </button>

              {/* Fora do botão que abre a notificação: clicar em "lida" ou "apagar" não pode
                  navegar para a rodada junto. */}
              <div className="flex flex-col gap-0.5 pr-2 py-3 flex-shrink-0">
                {!n.lida && (
                  <button
                    onClick={() => markNotificacaoLida(n.id)}
                    title="Marcar como lida"
                    aria-label="Marcar como lida"
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-300 hover:text-[#d55006] hover:bg-orange-50 transition-colors"
                  >
                    <Check size={14} />
                  </button>
                )}
                <button
                  onClick={() => removeNotificacao(n.id)}
                  title="Apagar da minha lista"
                  aria-label="Apagar da minha lista"
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors"
                >
                  <X size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        title="Notificações"
        className="relative w-9 h-9 rounded-lg flex items-center justify-center text-gray-300 hover:bg-white/10 transition-colors flex-shrink-0"
      >
        <Bell size={16} />
        {naoLidas > 0 && (
          <span
            className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
            style={{ backgroundColor: '#d55006' }}
          >
            {naoLidas > 9 ? '9+' : naoLidas}
          </span>
        )}
      </button>

      {open && createPortal(painel, document.body)}
    </div>
  );
}
