import { useState } from 'react';
import { X, XCircle } from 'lucide-react';
import { useStore } from '../store';
import { ApiError } from '../api/client';

interface RodadaRecusaModalProps {
  rodadaId: string;
  onClose: () => void;
}

export function RodadaRecusaModal({ rodadaId, onClose }: RodadaRecusaModalProps) {
  const rejectRodada = useStore((s) => s.rejectRodada);
  const [motivo, setMotivo] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    if (!motivo.trim()) {
      setError('Informe o motivo da recusa');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      await rejectRodada(rodadaId, motivo.trim());
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Não foi possível recusar a rodada. Tente novamente.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center modal-backdrop"
      style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-2 sm:mx-4 flex flex-col">
        <div className="flex items-center justify-between px-4 sm:px-6 py-4 sm:py-5 border-b" style={{ borderColor: '#e5e7eb' }}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: '#fef2f2' }}>
              <XCircle size={18} style={{ color: '#dc2626' }} />
            </div>
            <h2 className="font-questrial font-bold text-lg text-gray-900">Recusar rodada</h2>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-100 transition-colors">
            <X size={16} />
          </button>
        </div>

        <div className="px-4 sm:px-6 py-4 sm:py-5 space-y-3">
          <label className="text-xs font-semibold text-gray-600 mb-1 block">
            Motivo da recusa<span className="text-red-400 ml-0.5">*</span>
          </label>
          <textarea
            autoFocus
            className={`form-input resize-none ${error ? 'border-red-400' : ''}`}
            style={{ minHeight: 90 }}
            placeholder="Explique por que esta rodada está sendo recusada..."
            value={motivo}
            onChange={(e) => { setMotivo(e.target.value); setError(''); }}
          />
          {error && <p className="text-xs text-red-500">{error}</p>}
        </div>

        <div className="flex items-center gap-3 px-4 sm:px-6 py-4 border-t bg-gray-50 rounded-b-2xl" style={{ borderColor: '#e5e7eb' }}>
          <button onClick={onClose} className="px-5 py-2.5 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-200 transition-colors">
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white transition-colors hover:opacity-90 disabled:opacity-60"
            style={{ backgroundColor: '#dc2626' }}
          >
            {submitting ? 'Recusando...' : 'Confirmar recusa'}
          </button>
        </div>
      </div>
    </div>
  );
}
