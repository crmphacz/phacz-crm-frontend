import { CheckCircle2, XCircle, X } from 'lucide-react';
import { useStore } from '../store';

export function ToastContainer() {
  const toasts = useStore((s) => s.toasts);
  const dismissToast = useStore((s) => s.dismissToast);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[200] flex flex-col gap-2 w-full max-w-sm px-2 sm:px-0">
      {toasts.map((t) => (
        <div
          key={t.id}
          className="flex items-start gap-2.5 px-4 py-3 rounded-xl shadow-lg bg-white border"
          style={{ borderColor: t.type === 'error' ? '#fecaca' : '#e5e7eb' }}
        >
          {t.type === 'error' ? (
            <XCircle size={18} className="flex-shrink-0 mt-0.5" style={{ color: '#dc2626' }} />
          ) : (
            <CheckCircle2 size={18} className="flex-shrink-0 mt-0.5" style={{ color: '#16a34a' }} />
          )}
          <p className="text-sm text-gray-700 flex-1">{t.message}</p>
          <button
            onClick={() => dismissToast(t.id)}
            className="text-gray-400 hover:text-gray-600 flex-shrink-0"
          >
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}
