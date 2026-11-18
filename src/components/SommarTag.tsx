import { Award } from 'lucide-react';

/**
 * Marca o card de quem ADERIU ao programa SÕMMAR Elite.
 *
 * O que ela diz é "esta pessoa pontua", e nada além disso. Participante é quem tem
 * `sommarAdesaoEm` preenchido — dos mais de mil corretores do CRM, só os que se cadastraram
 * pela landing page. É esse campo, e não o cadastro do corretor, que decide quem pontua, e a
 * tag existe justamente porque isso não se enxerga em lugar nenhum no quadro.
 *
 * NÃO mostra o nível (Silver/Gold/Platinum/Diamond) de propósito: o nível é a soma do
 * livro-razão e não vem na listagem do pipeline. Para mostrá-lo aqui seria preciso uma
 * consulta por card, e um nível desatualizado num quadro de mil cards é pior do que nível
 * nenhum — ele vira a fonte que a equipe cita em discussão de prêmio. O nível fica onde ele é
 * apurado: na tela do SÕMMAR e no extrato do participante.
 *
 * Ícone próprio (Award), e não o troféu: o troféu já significa "tem venda fechada" no mesmo
 * card, e repeti-lo faria as duas coisas se confundirem.
 */
export function SommarTag({ aderiuEm, compact = false }: { aderiuEm?: string; compact?: boolean }) {
  if (!aderiuEm) return null;

  const desde = new Date(aderiuEm).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md font-bold border whitespace-nowrap w-fit ${
        compact ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-0.5 text-xs'
      }`}
      style={{ backgroundColor: '#eef2ff', color: '#4338ca', borderColor: '#c7d2fe' }}
      title={`Participante do SÕMMAR Elite desde ${desde}. As propostas e vendas deste corretor pontuam no programa.`}
    >
      <Award size={compact ? 10 : 12} className="flex-shrink-0" />
      SÕMMAR
    </span>
  );
}
