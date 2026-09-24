import type { Corretor, DestinatarioTipo, GrupoFunil } from '../types';
import { STAGES } from '../data';

/**
 * Seleção de público das campanhas, do lado da tela. Espelha src/lib/publicoAlvo.ts do backend
 * (que é quem decide de verdade) — aqui serve para mostrar a prévia de quem vai receber antes
 * de disparar. E-mail e WhatsApp usam os mesmos critérios; só o canal muda o que torna um
 * corretor elegível.
 */

/** Grupos de etapas do pipeline — mesmos das abas do Pipeline. */
export const GRUPOS_FUNIL: Record<GrupoFunil, { label: string; etapas: number[] }> = {
  'todos': { label: 'Todos os funis', etapas: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] },
  'pre-atendimento': { label: 'Pré-atendimento', etapas: [1, 2, 3, 4, 5] },
  'treinamento': { label: 'Treinamento', etapas: [6] },
  'venda': { label: 'Venda', etapas: [7, 8, 9] },
  'pos-venda': { label: 'Pós-venda', etapas: [10] },
};

export const GRUPOS_FUNIL_LISTA = Object.entries(GRUPOS_FUNIL) as [GrupoFunil, { label: string; etapas: number[] }][];

export type CanalCampanha = 'email' | 'whatsapp';

export interface PublicoAlvo {
  tipo: DestinatarioTipo;
  corretorIds: string[];
  etapaAlvo: number;
  funilAlvo: GrupoFunil;
  tipoInteresseAlvo: string;
}

export const PUBLICO_ALVO_INICIAL: PublicoAlvo = {
  tipo: 'individual',
  corretorIds: [],
  etapaAlvo: STAGES[0].id,
  funilAlvo: 'todos',
  tipoInteresseAlvo: '',
};

function telefoneValido(c: Corretor): boolean {
  return (c.whatsappCorretor || c.telefoneCorretor || '').replace(/\D/g, '').length >= 10;
}

/** Quem pode receber por este canal. Arquivado nunca recebe, em nenhum dos dois. */
export function corretoresElegiveis(corretores: Corretor[], canal: CanalCampanha): Corretor[] {
  return corretores.filter((c) => {
    if (c.status === 'arquivado') return false;
    return canal === 'email' ? Boolean(c.emailCorretor?.includes('@')) : telefoneValido(c);
  });
}

/** Aplica o critério escolhido sobre os elegíveis — é a prévia do que o backend vai fazer. */
export function resolveDestinatarios(elegiveis: Corretor[], publico: PublicoAlvo): Corretor[] {
  switch (publico.tipo) {
    case 'individual':
      return elegiveis.filter((c) => publico.corretorIds.includes(c.id));
    case 'funil':
      return elegiveis.filter((c) => c.etapa === publico.etapaAlvo);
    case 'grupo_funil':
      return elegiveis.filter((c) => GRUPOS_FUNIL[publico.funilAlvo].etapas.includes(c.etapa));
    default:
      return publico.tipoInteresseAlvo
        ? elegiveis.filter((c) => c.tiposInteresse.includes(publico.tipoInteresseAlvo))
        : [];
  }
}

/** Rótulo de por que a pessoa entrou na lista — o mesmo texto que o backend grava. */
export function descreveOrigem(publico: PublicoAlvo, corretor: Corretor): string {
  switch (publico.tipo) {
    case 'individual':
      return corretor.imobiliaria || 'Seleção manual';
    case 'funil': {
      const etapa = STAGES.find((s) => s.id === publico.etapaAlvo);
      return etapa ? `${etapa.id}. ${etapa.nome}` : '';
    }
    case 'grupo_funil':
      return GRUPOS_FUNIL[publico.funilAlvo].label;
    default:
      return publico.tipoInteresseAlvo;
  }
}

/** Resumo curto do critério, para o histórico de campanhas. */
export function descreveCriterio(
  tipo: DestinatarioTipo,
  dados: { etapaAlvo?: number; funilAlvo?: GrupoFunil; tipoInteresseAlvo?: string }
): string {
  if (tipo === 'funil') {
    const etapa = STAGES.find((s) => s.id === dados.etapaAlvo);
    return etapa ? `Etapa ${etapa.id} · ${etapa.nome}` : 'Etapa do funil';
  }
  if (tipo === 'grupo_funil') return dados.funilAlvo ? GRUPOS_FUNIL[dados.funilAlvo].label : 'Funil';
  if (tipo === 'empreendimento') return dados.tipoInteresseAlvo || 'Perfil de qualificação';
  return 'Seleção manual';
}
