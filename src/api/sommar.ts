import { apiFetch } from './client';
import type { SommarNivelChave } from '../types';

export type { SommarNivelChave };

/**
 * Programa SÕMMAR Elite.
 *
 * Arquivo próprio, e não mais um bloco dentro de `endpoints.ts`: o módulo é grande, tem tipos
 * só dele e nasceu inteiro de uma vez. Misturar com o resto só aumentaria a chance de
 * conflito na hora de aplicar.
 *
 * As regras de cálculo NÃO são repetidas aqui. Faixa, custo de resgate, pontos que faltam e
 * se pode resgatar vêm todos prontos do backend — regra duplicada na tela diverge do servidor
 * na primeira mudança, e aí o corretor vê um número na tela e outro no extrato.
 */

/**
 * Nome e cores de cada faixa, para a tag do card e a tela do SÕMMAR falarem a mesma língua.
 * Sem isto, a faixa no quadro e a faixa no extrato poderiam divergir de cor — e cor é o que a
 * equipe usa para reconhecer a faixa de relance.
 */
export const NIVEL_VISUAL: Record<SommarNivelChave, { nome: string; fundo: string; texto: string; borda: string }> = {
  SILVER: { nome: 'Silver', fundo: '#f1f5f9', texto: '#475569', borda: '#cbd5e1' },
  GOLD: { nome: 'Gold', fundo: '#fef3c7', texto: '#92400e', borda: '#fcd34d' },
  PLATINUM: { nome: 'Platinum', fundo: '#e5e7eb', texto: '#374151', borda: '#9ca3af' },
  DIAMOND: { nome: 'Diamond', fundo: '#ffedd5', texto: '#9a3412', borda: '#fb923c' },
};

export interface SommarNivel {
  ordem: number;
  chave: 'SILVER' | 'GOLD' | 'PLATINUM' | 'DIAMOND';
  nome: string;
  pontosMin: number;
  pontosMax: number | null;
  vgvMin: number;
  vgvMax: number | null;
  comissaoPct: number;
  custoResgate: number | null;
  premio: string | null;
  valorReferencia: number | null;
  beneficios: string;
}

export interface SommarLinhaCorretor {
  posicao: number;
  variacao: number | null;
  corretorId: string;
  nome: string;
  imobiliaria: string;
  cidade: string;
  uf: string;
  nivel: SommarNivel;
  pontos: number;
  pontuacaoTotal: number;
  vgvConfirmado: number;
}

export interface SommarLinhaImobiliaria {
  posicao: number;
  variacao: number | null;
  nome: string;
  cidade: string;
  uf: string;
  vgv: number;
  unidades: number;
  participantes: number;
  concorreAoBonus: boolean;
}

export interface SommarRanking {
  periodo: string;
  consolidadoEm: string | null;
  corretores: SommarLinhaCorretor[];
  imobiliarias: SommarLinhaImobiliaria[];
}

export interface SommarLancamento {
  id: string;
  tipo: 'CREDITO' | 'ESTORNO';
  origem: 'PROPOSTA' | 'VENDA' | 'AJUSTE';
  pontos: number;
  vgvConsiderado: number;
  valorTotal: number;
  valorPermuta: number;
  periodo: string;
  participantes: number;
  empreendimento: string;
  unidade: string;
  clienteNome: string;
  imobiliaria: string;
  motivo: string;
  estornadoEm: string | null;
  estornoDeId: string | null;
  createdAt: string;
  registradoPor: { id: string; nome: string } | null;
}

export interface SommarCupom {
  id: string;
  numero: number;
  periodo: string;
  createdAt: string;
  interacao: { id: string; tipo: string; data: string; resumo: string } | null;
  corretor?: { id: string; nomeCorretor: string; imobiliaria: string };
}

/**
 * Participante a um passo do degrau de cupons do item 8.1 — hoje, com exatamente 1 atendimento
 * qualificado no período. Com 1 atendimento ele tem ZERO cupom, então não aparece na lista de
 * cupons: é por isso que a tela precisa desta lista separada.
 */
export interface SommarQuaseComCupom {
  id: string;
  nome: string;
  imobiliaria: string;
  atendimentosQualificados: number;
  faltam: number;
}

export interface SommarExtrato {
  participante: {
    id: string;
    nome: string;
    imobiliaria: string;
    cidade: string;
    uf: string;
    aderiuEm: string;
  };
  pontuacaoTotal: number;
  vgvConfirmado: number;
  nivelConfirmado: SommarNivel;
  nivelPendente: SommarNivel;
  temPendencia: boolean;
  saldoResgatavel: number;
  pontosBloqueadosPorSinal: number;
  /**
   * O degrau de cupons do item 8.1 no mês CORRENTE — não no período selecionado na tela.
   *
   * `faltam` é o que o aviso mostra, e é zero tanto para quem já destravou quanto para quem
   * não fez atendimento nenhum no mês: no segundo caso não há progresso a comunicar.
   */
  cupomDoPeriodo: {
    periodo: string;
    atendimentosQualificados: number;
    cupons: number;
    faltam: number;
  };
  lancamentos: SommarLancamento[];
  cupons: SommarCupom[];
}

export interface SommarResgatePossivel {
  pode: boolean;
  motivo: string | null;
  custo: number | null;
  premio: string | null;
  valorReferencia: number | null;
  saldoResgatavel: number;
}

export interface SommarPeriodo {
  periodo: string;
  consolidadoEm: string | null;
  sorteioEm: string | null;
  sorteioGanhadorId: string | null;
}

export interface SommarResgate {
  id: string;
  nivel: string;
  pontos: number;
  opcao: 'BEM' | 'VALOR';
  premio: string;
  valorReferencia: number;
  status: 'SOLICITADO' | 'APROVADO' | 'ENTREGUE' | 'CANCELADO';
  prazoAte: string;
  observacoes: string;
  solicitadoEm: string;
  corretor: { id: string; nomeCorretor: string; imobiliaria: string };
}

export const sommarApi = {
  niveis: () => apiFetch<SommarNivel[]>('/api/sommar/niveis'),

  ranking: (periodo?: string) =>
    apiFetch<SommarRanking>('/api/sommar/ranking', { query: { periodo } }),

  periodos: () => apiFetch<SommarPeriodo[]>('/api/sommar/periodos'),

  extrato: (corretorId: string) =>
    apiFetch<SommarExtrato>(`/api/sommar/participantes/${corretorId}/extrato`),

  cupons: (periodo: string) => apiFetch<SommarCupom[]>(`/api/sommar/periodos/${periodo}/cupons`),

  quaseComCupom: (periodo: string) =>
    apiFetch<SommarQuaseComCupom[]>(`/api/sommar/periodos/${periodo}/quase-com-cupom`),

  resgates: () => apiFetch<SommarResgate[]>('/api/sommar/resgates'),

  podeResgatar: (corretorId: string) =>
    apiFetch<SommarResgatePossivel>(`/api/sommar/participantes/${corretorId}/resgate`),

  solicitarResgate: (corretorId: string, opcao: 'BEM' | 'VALOR', observacoes?: string) =>
    apiFetch<SommarResgate>(`/api/sommar/participantes/${corretorId}/resgate`, {
      method: 'POST',
      body: { opcao, observacoes },
    }),

  /** Só Diretoria. Tira pontos já creditados — o motivo aparece no extrato do participante. */
  estornar: (lancamentoId: string, motivo: string) =>
    apiFetch<{ lancado: boolean; pontos: number }>(`/api/sommar/lancamentos/${lancamentoId}/estorno`, {
      method: 'POST',
      body: { motivo },
    }),

  /** Só Diretoria. Congela o ranking do mês — depois disso ele não muda mais (item 12.1). */
  consolidar: (periodo: string) =>
    apiFetch<SommarRanking>(`/api/sommar/periodos/${periodo}/consolidar`, { method: 'POST' }),

  /** Só Diretoria, e irreversível: um segundo sorteio do mesmo período é recusado. */
  sortear: (periodo: string) =>
    apiFetch<{ sorteado: boolean; cupom: { id: string; numero: number }; totalCupons: number }>(
      `/api/sommar/periodos/${periodo}/sorteio`,
      { method: 'POST' }
    ),
};

/** `AAAA-MM` do mês corrente, no fuso de São Paulo — o mesmo corte que o backend usa. */
export function periodoAtual(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
  })
    .format(new Date())
    .slice(0, 7);
}

/** "2027-01" → "janeiro de 2027". */
export function rotuloDoPeriodo(periodo: string): string {
  const [ano, mes] = periodo.split('-').map(Number);
  if (!ano || !mes) return periodo;
  const nome = new Intl.DateTimeFormat('pt-BR', { month: 'long', timeZone: 'UTC' }).format(
    new Date(Date.UTC(ano, mes - 1, 1))
  );
  return `${nome} de ${ano}`;
}
