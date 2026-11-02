import type { TipoAcaoRodada } from '../types';

/**
 * Tipos de ação de uma rodada — rótulo e cor, num lugar só.
 *
 * Os rótulos existiam copiados no formulário e na listagem do calendário, cada um com a sua
 * versão ("Tráfego pago" aqui, "Ação de tráfego pago" ali). Reunir resolve o que já deu
 * problema duas vezes nesta base: dado de referência duplicado que uma das cópias atualiza e
 * a outra não.
 *
 * Sobre as cores, duas regras que foram conferidas com medição, não no olho:
 *
 * 1. Nenhum tipo repete o par exato (texto + fundo) de um chip de STATUS. As duas colunas
 *    ficam lado a lado na mesma linha, e repetir o par faria duas informações diferentes
 *    parecerem a mesma — a primeira tentativa deste arquivo dava ao "Outro" exatamente as
 *    cores do status "Cancelada".
 * 2. Os cinco tipos coloridos têm pelo menos 35° de diferença de matiz entre si, e cada texto
 *    tem contraste de 4.5:1 ou mais sobre o próprio fundo (AA para texto pequeno). O "Outro" é
 *    cinza de propósito: é o tipo sem identidade, e a ausência de cor diz isso.
 */
export interface TipoAcaoConfig {
  value: TipoAcaoRodada;
  label: string;
  /** Cor do texto do chip. */
  cor: string;
  /** Fundo do chip — claro o bastante para o texto manter contraste de leitura. */
  corBg: string;
}

export const TIPOS_DE_ACAO_RODADA: TipoAcaoConfig[] = [
  // Laranja da casa, escurecido: o tom original (#d55006) ficava em 3.97:1 sobre este fundo,
  // abaixo do mínimo de leitura para texto pequeno.
  { value: 'rodada', label: 'Rodada', cor: '#9a3412', corBg: '#fff7ed' },
  { value: 'cafe_na_obra', label: 'Café na obra', cor: '#15803d', corBg: '#f0fdf4' },
  { value: 'evento_externo', label: 'Evento externo', cor: '#7c3aed', corBg: '#f5f3ff' },
  { value: 'trafego_pago', label: 'Tráfego pago', cor: '#0e7490', corBg: '#ecfeff' },
  { value: 'almoco_jantar', label: 'Almoço/Jantar', cor: '#be185d', corBg: '#fdf2f8' },
  { value: 'outro', label: 'Outro', cor: '#334155', corBg: '#f8fafc' },
];

const POR_VALOR = new Map(TIPOS_DE_ACAO_RODADA.map((t) => [t.value, t]));

/** Nunca devolve undefined: um tipo desconhecido cai no neutro em vez de quebrar a linha. */
export function tipoDeAcaoRodada(tipo: TipoAcaoRodada): TipoAcaoConfig {
  return POR_VALOR.get(tipo) ?? POR_VALOR.get('outro')!;
}
