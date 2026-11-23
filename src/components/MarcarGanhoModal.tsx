import { useEffect, useState } from 'react';
import { useStore } from '../store';
import { corretoresApi } from '../api/endpoints';
import { ConfirmModal } from './ConfirmModal';
import { maskCurrencyBRLInput, parseCurrencyBRL, formatCurrencyBRL } from '../utils';
import { ApiError } from '../api/client';

/**
 * Registrar o fechamento de uma venda.
 *
 * Mora aqui, e não dentro do painel do corretor, porque há dois caminhos até o mesmo ato: o
 * botão "Marcar como Ganho" no painel e o arrasto do card para a Pós-venda. Antes só o botão
 * registrava a venda — arrastar levava o card para a coluna de vendidos e pronto, sem valor,
 * sem data, sem pontuar no SÕMMAR e sem bloquear a unidade no cadastro. O card parecia
 * vendido e, para o sistema, a venda não tinha acontecido.
 */
interface Props {
  corretorId: string;
  /** Nome exibido, só para a confirmação dizer de quem é a venda. */
  nome: string;
  onClose: () => void;
  onDone?: () => void;
}

export function MarcarGanhoModal({ corretorId, nome, onClose, onDone }: Props) {
  const markAsWon = useStore((s) => s.markAsWon);

  const [valor, setValor] = useState('');
  const [salvando, setSalvando] = useState(false);
  /** De onde veio o valor sugerido — a tela precisa dizer isso, senão o número parece surgir do nada. */
  const [origemDoValor, setOrigemDoValor] = useState<'proposta' | 'nenhuma' | null>(null);

  /**
   * Busca a proposta ACEITA do card para sugerir o valor.
   *
   * A listagem do pipeline é leve e não traz propostas, então o detalhe é buscado aqui, ao
   * abrir. Sugerir é o ponto todo: digitar de novo um número que já está registrado é onde
   * nasce a divergência entre o que a proposta diz e o que a meta soma.
   */
  useEffect(() => {
    let cancelado = false;
    corretoresApi
      .get(corretorId)
      .then((c) => {
        if (cancelado) return;
        const aceita = c.propostas.find((p) => p.status === 'aceita');
        if (aceita) {
          setValor(formatCurrencyBRL(aceita.valor));
          setOrigemDoValor('proposta');
        } else {
          setOrigemDoValor('nenhuma');
        }
      })
      .catch(() => { if (!cancelado) setOrigemDoValor('nenhuma'); });
    return () => { cancelado = true; };
  }, [corretorId]);

  async function confirmar() {
    if (salvando) return;
    setSalvando(true);
    try {
      await markAsWon(corretorId, parseCurrencyBRL(valor) ?? 0);
      onDone?.();
      onClose();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : 'Não foi possível marcar como ganho.');
    } finally {
      setSalvando(false);
    }
  }

  return (
    <ConfirmModal
      title="🏆 Marcar como Ganho!"
      description={`Confirme o valor da venda de ${nome} para registrar o fechamento e notificar a Diretoria.`}
      confirmLabel="Confirmar Ganho"
      confirmColor="#059669"
      onConfirm={confirmar}
      onCancel={onClose}
      loading={salvando}
    >
      <input
        className="form-input mt-3"
        placeholder="R$ 0,00"
        value={valor}
        onChange={(e) => setValor(maskCurrencyBRLInput(e.target.value))}
      />
      {origemDoValor === 'proposta' && (
        <p className="text-xs text-gray-500 mt-1.5">
          Valor da proposta aceita neste card. Pode ser alterado.
        </p>
      )}
      {origemDoValor === 'nenhuma' && (
        <p className="text-xs text-gray-500 mt-1.5">
          Este card não tem proposta aceita — digite o valor da venda.
        </p>
      )}
      {origemDoValor === null && <p className="text-xs text-gray-400 mt-1.5">Buscando a proposta aceita…</p>}
    </ConfirmModal>
  );
}
