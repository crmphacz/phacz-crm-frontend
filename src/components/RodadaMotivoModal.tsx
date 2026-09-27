import { useState } from 'react';
import { X, XCircle, PencilLine } from 'lucide-react';
import { useStore } from '../store';
import { ApiError } from '../api/client';

/**
 * Modal do recado que a Diretoria manda junto com a decisão — o mesmo formulário serve para
 * recusar a rodada e para devolvê-la pedindo correção. A diferença entre os dois não é só de
 * texto: recusar encerra a rodada, pedir correção mantém ela viva e manda um e-mail para quem
 * cadastrou. Por isso os avisos abaixo do campo são diferentes.
 */
export type ModoMotivo = 'recusa' | 'correcao';

const CONFIG = {
  recusa: {
    titulo: 'Recusar rodada',
    label: 'Motivo da recusa',
    placeholder: 'Explique por que esta rodada está sendo recusada...',
    nota: 'Quem cadastrou a rodada será avisado no sino do CRM.',
    acao: 'Confirmar recusa',
    acaoLoading: 'Recusando...',
    erroVazio: 'Informe o motivo da recusa',
    erroSubmit: 'Não foi possível recusar a rodada. Tente novamente.',
    cor: '#dc2626',
    corBg: '#fef2f2',
    icon: XCircle,
  },
  correcao: {
    titulo: 'Solicitar correção',
    label: 'O que precisa ser corrigido',
    placeholder: 'Ex.: o custo da rodada está divergente do orçamento aprovado — revisar o item de transporte.',
    nota: 'Quem cadastrou recebe um e-mail com esta mensagem. Ao salvar o ajuste, a rodada volta para a sua fila de aprovação.',
    acao: 'Enviar solicitação',
    acaoLoading: 'Enviando...',
    erroVazio: 'Descreva o que precisa ser corrigido',
    erroSubmit: 'Não foi possível solicitar a correção. Tente novamente.',
    cor: '#d55006',
    corBg: '#fff7ed',
    icon: PencilLine,
  },
} as const;

interface RodadaMotivoModalProps {
  rodadaId: string;
  modo: ModoMotivo;
  onClose: () => void;
}

export function RodadaMotivoModal({ rodadaId, modo, onClose }: RodadaMotivoModalProps) {
  const rejectRodada = useStore((s) => s.rejectRodada);
  const requestRodadaCorrection = useStore((s) => s.requestRodadaCorrection);
  const [motivo, setMotivo] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const cfg = CONFIG[modo];
  const Icon = cfg.icon;

  async function handleSubmit() {
    if (!motivo.trim()) {
      setError(cfg.erroVazio);
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      if (modo === 'recusa') await rejectRodada(rodadaId, motivo.trim());
      else await requestRodadaCorrection(rodadaId, motivo.trim());
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : cfg.erroSubmit);
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
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: cfg.corBg }}>
              <Icon size={18} style={{ color: cfg.cor }} />
            </div>
            <h2 className="font-questrial font-bold text-lg text-gray-900">{cfg.titulo}</h2>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-100 transition-colors">
            <X size={16} />
          </button>
        </div>

        <div className="px-4 sm:px-6 py-4 sm:py-5 space-y-3">
          <label className="text-xs font-semibold text-gray-600 mb-1 block">
            {cfg.label}<span className="text-red-400 ml-0.5">*</span>
          </label>
          <textarea
            autoFocus
            className={`form-input resize-none ${error ? 'border-red-400' : ''}`}
            style={{ minHeight: 90 }}
            placeholder={cfg.placeholder}
            value={motivo}
            onChange={(e) => { setMotivo(e.target.value); setError(''); }}
          />
          {error && <p className="text-xs text-red-500">{error}</p>}
          <p className="text-xs text-gray-400">{cfg.nota}</p>
        </div>

        <div className="flex items-center gap-3 px-4 sm:px-6 py-4 border-t bg-gray-50 rounded-b-2xl" style={{ borderColor: '#e5e7eb' }}>
          <button onClick={onClose} className="px-5 py-2.5 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-200 transition-colors">
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white transition-colors hover:opacity-90 disabled:opacity-60"
            style={{ backgroundColor: cfg.cor }}
          >
            {submitting ? cfg.acaoLoading : cfg.acao}
          </button>
        </div>
      </div>
    </div>
  );
}
