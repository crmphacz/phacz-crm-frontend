import { apiFetch } from './client';

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
