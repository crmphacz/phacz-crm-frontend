import { useState } from 'react';
import { X, RefreshCw, AlertTriangle } from 'lucide-react';
import { useStore } from '../store';
import { ApiError } from '../api/client';
import { Spinner } from './Spinner';
import type { StatusAprovacaoRodada } from '../types';

/**
 * Correção de rota da Diretoria: muda a situação de uma rodada para qualquer outra, a qualquer
 * momento — inclusive devolvendo uma já aprovada para a fila.
 *
 * É separado dos botões de aprovar/recusar/corrigir da lista de propósito. Aqueles são o fluxo
 * do dia a dia e só aparecem em rodada pendente; este é o conserto, serve em qualquer situação
 * e por isso pede confirmação explícita.
 */

const SITUACOES: { valor: StatusAprovacaoRodada; label: string; descricao: string }[] = [
  { valor: 'pendente', label: 'Pendente de aprovação', descricao: 'Volta para a fila, como se ainda não tivesse sido decidida.' },
  { valor: 'aprovada', label: 'Aprovada', descricao: 'Passa a valer no calendário para toda a equipe.' },
  { valor: 'correcao_solicitada', label: 'Correção solicitada', descricao: 'Devolve para quem cadastrou ajustar. Avisa por e-mail.' },
  { valor: 'recusada', label: 'Recusada', descricao: 'Encerra a rodada com o motivo registrado.' },
  { valor: 'cancelada', label: 'Cancelada', descricao: 'A rodada não vai acontecer. Fica no histórico com o motivo.' },
];

/** Mudar para estes exige motivo — é o recado que a pessoa do outro lado vai ler. */
const PEDEM_MOTIVO: StatusAprovacaoRodada[] = ['recusada', 'correcao_solicitada', 'cancelada'];

interface RodadaStatusModalProps {
  rodadaId: string;
  statusAtual: StatusAprovacaoRodada;
  /** Para a tela conseguir dizer de qual rodada se trata. */
  descricao: string;
  onClose: () => void;
}

export function RodadaStatusModal({ rodadaId, statusAtual, descricao, onClose }: RodadaStatusModalProps) {
  const changeRodadaStatus = useStore((s) => s.changeRodadaStatus);
  const showToast = useStore((s) => s.showToast);

  const [novo, setNovo] = useState<StatusAprovacaoRodada | ''>('');
  const [motivo, setMotivo] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const pedeMotivo = novo !== '' && PEDEM_MOTIVO.includes(novo);
  const escolhida = SITUACOES.find((s) => s.valor === novo);
  // Tirar a aprovação tem consequência que não é óbvia na tela: a rodada some do calendário de
  // quem não é Diretoria, e deixa de aceitar cliente final novo. Avisar antes é mais barato que
  // explicar depois.
  const avisaDesaprovacao = statusAtual === 'aprovada' && novo !== '' && novo !== 'aprovada';

  async function handleSubmit() {
    if (!novo) {
      setError('Escolha a nova situação.');
      return;
    }
    if (pedeMotivo && !motivo.trim()) {
      setError('Informe o motivo desta mudança.');
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      await changeRodadaStatus(rodadaId, novo, motivo.trim());
      showToast(`Situação alterada para "${escolhida?.label}".`, 'success');
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Não foi possível mudar a situação. Tente novamente.');
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center modal-backdrop"
      style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-2 sm:mx-4 flex flex-col" style={{ maxHeight: '92vh' }}>
        <div className="flex items-center justify-between px-4 sm:px-6 py-4 sm:py-5 border-b" style={{ borderColor: '#e5e7eb' }}>
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#fff7ed' }}>
              <RefreshCw size={18} style={{ color: '#d55006' }} />
            </div>
            <div className="min-w-0">
              <h2 className="font-questrial font-bold text-lg text-gray-900">Mudar situação</h2>
              <p className="text-xs text-gray-500 truncate">{descricao}</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-100 transition-colors flex-shrink-0">
            <X size={16} />
          </button>
        </div>

        <div className="px-4 sm:px-6 py-4 sm:py-5 space-y-3 overflow-y-auto">
          <div className="space-y-1.5">
            {SITUACOES.map((s) => {
              const atual = s.valor === statusAtual;
              const marcada = s.valor === novo;
              return (
                <button
                  key={s.valor}
                  type="button"
                  disabled={atual}
                  onClick={() => { setNovo(s.valor); setError(''); }}
                  className="w-full text-left px-3 py-2.5 rounded-xl border transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  style={
                    marcada
                      ? { borderColor: '#d55006', backgroundColor: '#fff7ed' }
                      : { borderColor: '#e5e7eb', backgroundColor: '#fff' }
                  }
                >
                  <span className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-gray-900">{s.label}</span>
                    {atual && <span className="text-[10px] font-bold uppercase text-gray-400">situação atual</span>}
                  </span>
                  <span className="block text-xs text-gray-500 mt-0.5">{s.descricao}</span>
                </button>
              );
            })}
          </div>

          {avisaDesaprovacao && (
            <div
              className="flex items-start gap-2 px-3 py-2.5 rounded-lg text-xs"
              style={{ backgroundColor: '#fffbeb', color: '#92400e', border: '1px solid #fde68a' }}
            >
              <AlertTriangle size={14} className="flex-shrink-0 mt-0.5" />
              <span>
                Ao tirar a aprovação, a rodada sai do calendário de quem não é Diretoria e deixa de
                aceitar cliente final novo. Os clientes já vinculados a ela continuam como estão.
              </span>
            </div>
          )}

          {pedeMotivo && (
            <div>
              <label className="text-xs font-semibold text-gray-600 mb-1 block">
                Motivo<span className="text-red-400 ml-0.5">*</span>
              </label>
              <textarea
                autoFocus
                className="form-input resize-none"
                style={{ minHeight: 80 }}
                placeholder="Explique a mudança — é o que a pessoa que cadastrou vai ler."
                value={motivo}
                onChange={(e) => { setMotivo(e.target.value); setError(''); }}
              />
            </div>
          )}

          {error && <p className="text-xs text-red-500">{error}</p>}
        </div>

        <div className="flex items-center gap-3 px-4 sm:px-6 py-4 border-t bg-gray-50 rounded-b-2xl" style={{ borderColor: '#e5e7eb' }}>
          <button onClick={onClose} className="px-5 py-2.5 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-200 transition-colors">
            Voltar
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting || !novo}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold text-white transition-colors hover:opacity-90 disabled:opacity-60"
            style={{ backgroundColor: '#d55006' }}
          >
            {submitting && <Spinner size={14} />}
            {submitting ? 'Alterando...' : 'Confirmar mudança'}
          </button>
        </div>
      </div>
    </div>
  );
}
