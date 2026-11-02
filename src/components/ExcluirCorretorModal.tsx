import { useEffect, useState } from 'react';
import { AlertTriangle, Trash2, X } from 'lucide-react';
import type { Corretor } from '../types';
import { useStore } from '../store';
import { ApiError } from '../api/client';
import { Spinner } from './Spinner';
import { ehCardDeCliente, nomeExibidoNoCard } from '../utils';

/**
 * Confirmação de exclusão de um card do pipeline. Usada pelo quadro e pela tela de Corretores,
 * para as duas perguntarem a mesma coisa — e perguntarem o suficiente.
 *
 * Excluir não arquiva: o registro sai do banco e leva junto, em cascata, os clientes finais, as
 * atividades, as propostas e o histórico de disparos. O modal diz isso com todas as letras
 * porque dois desses efeitos são invisíveis na tela de onde se clica: as atividades alimentam
 * o placar de metas, que muda retroativamente, e o corretor some dos relatórios de período
 * já fechado.
 *
 * Para arquivar sem perder nada existe o botão de Arquivar, no painel do card — o modal aponta
 * para ele, porque na maior parte das vezes é o que a pessoa realmente quer.
 */
interface Props {
  corretor: Corretor;
  onClose: () => void;
  /** Chamado após a exclusão dar certo — o quadro fecha o painel, a lista recarrega a página. */
  onExcluido?: () => void;
}

export function ExcluirCorretorModal({ corretor, onClose, onExcluido }: Props) {
  const deleteCorretor = useStore((s) => s.deleteCorretor);
  const showToast = useStore((s) => s.showToast);
  const [excluindo, setExcluindo] = useState(false);

  const nome = nomeExibidoNoCard(corretor);
  const ehNegocio = ehCardDeCliente(corretor);
  const clientes = corretor.clientesFinais?.length ?? 0;

  // Esc fecha, como nos demais modais. Não fecha enquanto exclui: a requisição já saiu, e
  // sumir com a janela nesse meio deixaria a pessoa sem saber se deu certo.
  useEffect(() => {
    function onKey(ev: KeyboardEvent) {
      if (ev.key === 'Escape' && !excluindo) onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [excluindo, onClose]);

  async function confirmar() {
    setExcluindo(true);
    try {
      await deleteCorretor(corretor.id);
      showToast(`${nome} foi excluído.`, 'success');
      onExcluido?.();
      onClose();
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'Não foi possível excluir agora.', 'error');
      setExcluindo(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
      onClick={() => !excluindo && onClose()}
    >
      <div
        className="bg-white rounded-2xl w-full max-w-md shadow-xl"
        onClick={(ev) => ev.stopPropagation()}
      >
        <div className="flex items-start gap-3 p-5 pb-3">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: '#fee2e2' }}
          >
            <AlertTriangle size={19} style={{ color: '#b91c1c' }} />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-base font-bold" style={{ color: '#1e1e1e', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
              Excluir {ehNegocio ? 'este negócio' : 'este corretor'}?
            </h3>
            <p className="text-sm text-gray-500 mt-0.5 break-words">{nome}</p>
          </div>
          <button
            onClick={onClose}
            disabled={excluindo}
            className="text-gray-300 hover:text-gray-500 transition-colors disabled:opacity-40"
            aria-label="Fechar"
          >
            <X size={18} />
          </button>
        </div>

        <div className="px-5 pb-4 space-y-3">
          <div className="rounded-xl p-3 text-sm" style={{ backgroundColor: '#fef2f2' }}>
            <p className="font-semibold" style={{ color: '#b91c1c' }}>
              Isto não tem volta. Some junto:
            </p>
            <ul className="mt-1.5 space-y-1 text-xs" style={{ color: '#991b1b' }}>
              {clientes > 0 && (
                <li>• {clientes} cliente{clientes > 1 ? 's' : ''} final{clientes > 1 ? 'is' : ''} cadastrado{clientes > 1 ? 's' : ''}</li>
              )}
              <li>• todas as atividades do card — e elas contam no placar de metas, que vai mudar</li>
              <li>• as propostas registradas</li>
              <li>• o histórico de disparos de WhatsApp</li>
            </ul>
          </div>

          {!ehNegocio && (
            <p className="text-xs text-gray-500">
              Negócios gerados a partir dele continuam no pipeline, mas ficam sem corretor vinculado.
            </p>
          )}

          <p className="text-xs text-gray-500">
            Se a intenção é tirar do quadro sem perder o histórico, use <strong>Arquivar</strong>, no
            painel do card.
          </p>
        </div>

        <div className="flex gap-2 px-5 pb-5">
          <button
            onClick={onClose}
            disabled={excluindo}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold border transition-colors hover:bg-gray-50 disabled:opacity-60"
            style={{ borderColor: '#e5e7eb', color: '#6b7280' }}
          >
            Cancelar
          </button>
          <button
            onClick={confirmar}
            disabled={excluindo}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
            style={{ backgroundColor: '#b91c1c' }}
          >
            {excluindo ? <Spinner size={14} className="text-white" /> : <Trash2 size={14} />}
            {excluindo ? 'Excluindo…' : 'Excluir'}
          </button>
        </div>
      </div>
    </div>
  );
}
