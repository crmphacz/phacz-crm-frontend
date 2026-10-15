import { useState } from 'react';
import { X, CalendarX } from 'lucide-react';
import { useStore } from '../store';
import { ApiError } from '../api/client';
import { Spinner } from './Spinner';

/**
 * Registra que um treinamento marcado NÃO aconteceu, e por quê.
 *
 * Serve dois lugares — a aba de Atividades do card e a agenda — porque o cancelamento acontece
 * nos dois momentos: ou quando se abre o card do corretor, ou quando se olha a semana e se vê
 * que aquele horário caiu.
 *
 * O motivo é obrigatório de propósito: é ele que dá sentido à taxa de churn de treinamentos no
 * Dashboard. Uma taxa sem motivos diz que o problema existe e não diz o que consertar.
 */
interface CancelarTreinamentoModalProps {
  corretorId: string;
  interacaoId: string;
  corretorNome: string;
  /** Quando o treinamento estava marcado, já formatado para leitura. */
  quando?: string;
  /** Motivo já gravado — abre o modal em modo "corrigir o texto", sem recancelar. */
  motivoAtual?: string;
  /** Avisa a tela de origem para ela atualizar a própria lista (a agenda não lê do store). */
  onCancelado: (motivo: string) => void;
  onClose: () => void;
}

export function CancelarTreinamentoModal({
  corretorId, interacaoId, corretorNome, quando, motivoAtual, onCancelado, onClose,
}: CancelarTreinamentoModalProps) {
  const cancelarAtividade = useStore((s) => s.cancelarAtividade);
  const [motivo, setMotivo] = useState(motivoAtual ?? '');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const editando = Boolean(motivoAtual);

  async function handleSubmit() {
    const texto = motivo.trim();
    if (!texto) {
      setError('Informe o motivo do cancelamento.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      await cancelarAtividade(corretorId, interacaoId, texto);
      onCancelado(texto);
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Não foi possível cancelar o treinamento. Tente novamente.');
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
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#fef2f2' }}>
              <CalendarX size={18} style={{ color: '#dc2626' }} />
            </div>
            <div className="min-w-0">
              <h2 className="font-questrial font-bold text-lg text-gray-900 truncate">
                {editando ? 'Editar motivo do cancelamento' : 'Cancelar treinamento'}
              </h2>
              <p className="text-xs text-gray-500 truncate">
                {corretorNome}{quando ? ` · ${quando}` : ''}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-100 transition-colors flex-shrink-0">
            <X size={16} />
          </button>
        </div>

        <div className="px-4 sm:px-6 py-4 sm:py-5 space-y-3">
          <label className="text-xs font-semibold text-gray-600 mb-1 block">
            Motivo do cancelamento<span className="text-red-400 ml-0.5">*</span>
          </label>
          <textarea
            autoFocus
            className={`form-input resize-none ${error ? 'border-red-400' : ''}`}
            style={{ minHeight: 90 }}
            placeholder="Ex.: o corretor não compareceu; teve uma visita com cliente no mesmo horário; pediu para remarcar."
            value={motivo}
            onChange={(e) => { setMotivo(e.target.value); setError(''); }}
          />
          {error && <p className="text-xs text-red-500">{error}</p>}
          <p className="text-xs text-gray-400">
            O treinamento continua no histórico, marcado como cancelado — e deixa de contar no placar de
            metas de quem o realizaria. O motivo aparece na taxa de churn de treinamentos do Dashboard.
          </p>
        </div>

        <div className="flex items-center gap-3 px-4 sm:px-6 py-4 border-t bg-gray-50 rounded-b-2xl" style={{ borderColor: '#e5e7eb' }}>
          <button onClick={onClose} className="px-5 py-2.5 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-200 transition-colors">
            Voltar
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold text-white transition-colors hover:opacity-90 disabled:opacity-60"
            style={{ backgroundColor: '#dc2626' }}
          >
            {submitting && <Spinner size={14} />}
            {submitting
              ? 'Salvando…'
              : editando ? 'Salvar motivo' : 'Confirmar cancelamento'}
          </button>
        </div>
      </div>
    </div>
  );
}
