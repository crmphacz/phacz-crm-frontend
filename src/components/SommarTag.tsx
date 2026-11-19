import { Award } from 'lucide-react';
import { NIVEL_VISUAL } from '../api/sommar';
import type { SommarNivelChave } from '../types';

/**
 * Marca o card de quem ADERIU ao programa SÕMMAR Elite, e em que faixa ele está.
 *
 * Participante é quem tem `sommarAdesaoEm` preenchido — dos mais de mil corretores do CRM, só
 * os que se cadastraram pela landing page. É esse campo, e não o cadastro do corretor, que
 * decide quem pontua, e a tag existe porque isso não se enxerga em lugar nenhum no quadro.
 *
 * A faixa mostrada é a CONFIRMADA: a que as vendas efetivas sustentam (itens 3.q e 7.2), e a
 * que vale para comissão e prêmio. A pendente — alcançada por pontos de proposta — não aparece
 * aqui de propósito: no quadro ela faria a equipe tratar como Gold quem ainda é Silver. Quem
 * precisa ver as duas abre o extrato, onde a diferença está explicada.
 *
 * Sem faixa conhecida a tag ainda aparece, só com o nome do programa: é o caso do card de
 * negócio cujo corretor-pai não está na página carregada. Some um detalhe, nunca aparece um
 * errado — dizer "Silver" por falta de dado colocaria a pessoa na faixa de baixo.
 *
 * Ícone próprio (Award), e não o troféu: o troféu já significa "tem venda fechada" no mesmo
 * card, e repeti-lo faria as duas coisas se confundirem.
 */
export function SommarTag({
  aderiuEm,
  nivel,
  compact = false,
}: {
  aderiuEm?: string;
  nivel?: SommarNivelChave;
  compact?: boolean;
}) {
  if (!aderiuEm) return null;

  const desde = new Date(aderiuEm).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
  const faixa = nivel ? NIVEL_VISUAL[nivel] : null;

  // Sem faixa, a tag fica no índigo neutro do programa; com faixa, veste a cor dela — é a
  // mesma paleta da tela do SÕMMAR, para a faixa ser reconhecida de relance nos dois lugares.
  const cor = faixa
    ? { fundo: faixa.fundo, texto: faixa.texto, borda: faixa.borda }
    : { fundo: '#eef2ff', texto: '#4338ca', borda: '#c7d2fe' };

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md font-bold border whitespace-nowrap w-fit ${
        compact ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-0.5 text-xs'
      }`}
      style={{ backgroundColor: cor.fundo, color: cor.texto, borderColor: cor.borda }}
      title={
        `Participante do SÕMMAR Elite desde ${desde}. ` +
        (faixa
          ? `Faixa confirmada: ${faixa.nome} — a que as vendas efetivas sustentam.`
          : 'As propostas e vendas deste corretor pontuam no programa.')
      }
    >
      <Award size={compact ? 10 : 12} className="flex-shrink-0" />
      {faixa ? `SÕMMAR ${faixa.nome}` : 'SÕMMAR'}
    </span>
  );
}
