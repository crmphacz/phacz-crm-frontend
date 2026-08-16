import { useState } from 'react';
import { Bell } from 'lucide-react';
import { useStore } from '../store';
import { formatRelativeTime } from '../utils';
import type { Notificacao } from '../types';

export function NotificationBell() {
  const notificacoes = useStore((s) => s.notificacoes);
  const naoLidas = useStore((s) => s.notificacoesNaoLidas);
  const markAllNotificacoesLidas = useStore((s) => s.markAllNotificacoesLidas);
  const abrirNotificacaoRodada = useStore((s) => s.abrirNotificacaoRodada);
  const [open, setOpen] = useState(false);

  function handleSelect(n: Notificacao) {
    setOpen(false);
    abrirNotificacaoRodada(n);
  }

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

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div
            className="fixed z-50 w-80 max-w-[90vw] bg-white rounded-2xl shadow-2xl border overflow-hidden flex flex-col"
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
            <div className="flex-1 overflow-y-auto">
              {notificacoes.length === 0 && (
                <p className="text-sm text-gray-400 text-center py-10">Nenhuma notificação por aqui.</p>
              )}
              {notificacoes.map((n) => (
                <button
                  key={n.id}
                  onClick={() => handleSelect(n)}
                  className="w-full text-left px-4 py-3 border-b hover:bg-gray-50 transition-colors flex items-start gap-2.5"
                  style={{ borderColor: '#f3f4f6' }}
                >
                  <div className="w-2 flex-shrink-0 mt-1.5">
                    {!n.lida && <span className="block w-2 h-2 rounded-full" style={{ backgroundColor: '#d55006' }} />}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-800 truncate">{n.titulo}</p>
                    <p className="text-xs text-gray-500 mt-0.5 truncate">{n.mensagem}</p>
                    <p className="text-[11px] text-gray-400 mt-1">{formatRelativeTime(n.criadoEm)}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
