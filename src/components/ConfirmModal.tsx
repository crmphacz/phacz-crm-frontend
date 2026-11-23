import { Spinner } from './Spinner';

/**
 * Confirmação de uma ação que vale a pena interromper o fluxo para perguntar.
 *
 * Mora num arquivo próprio porque é usada por mais de uma tela: saiu de dentro do painel do
 * corretor quando o registro de venda passou a ser alcançável também pelo arrasto do card no
 * pipeline (ver MarcarGanhoModal).
 */
export function ConfirmModal({ title, description, confirmLabel, confirmColor, onConfirm, onCancel, loading = false, children }: {
  title: string; description: string; confirmLabel: string; confirmColor: string;
  onConfirm: () => void; onCancel: () => void; loading?: boolean; children?: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center modal-backdrop" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div className="bg-white rounded-2xl p-6 w-96 shadow-2xl">
        <h3 className="font-bold text-lg text-gray-900 mb-1" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{title}</h3>
        <p className="text-sm text-gray-500">{description}</p>
        {children}
        <div className="flex gap-2 mt-5">
          <button onClick={onConfirm} disabled={loading} className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-70" style={{ backgroundColor: confirmColor }}>
            {loading && <Spinner size={14} />}
            {loading ? 'Aguarde…' : confirmLabel}
          </button>
          <button onClick={onCancel} disabled={loading} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-100 border transition-colors disabled:opacity-50" style={{ borderColor: '#e5e7eb' }}>
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}
