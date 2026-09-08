import type {
  Corretor, ClienteFinal, Interacao, Proposta, Temperatura, StatusCorretor, TipoInteracao,
  DestinatarioTipo, EmailTemplate, EmailCampaign,
  ChatMessage, UserCargo,
} from '../types';

function makeEnumMap<Api extends string, App extends string>(pairs: [Api, App][]) {
  const toAppMap = new Map(pairs);
  const toApiMap = new Map(pairs.map(([api, app]) => [app, api] as [App, Api]));
  return {
    toApp: (v: string): App => (toAppMap.get(v as Api) ?? (pairs[0][1])),
    toApi: (v: string): Api => (toApiMap.get(v as App) ?? (pairs[0][0])),
  };
}

const temperaturaMap = makeEnumMap<string, Temperatura>([
  ['QUENTE', 'quente'], ['MORNO', 'morno'], ['FRIO', 'frio'],
]);

const statusCorretorMap = makeEnumMap<string, StatusCorretor>([
  ['ATIVO', 'ativo'], ['NUTRICAO', 'nutricao'], ['ARQUIVADO', 'arquivado'], ['GANHO', 'ganho'], ['PERDIDO', 'perdido'],
]);

const tipoInteracaoMap = makeEnumMap<string, TipoInteracao>([
  ['LIGACAO', 'ligacao'], ['WHATSAPP', 'whatsapp'], ['EMAIL', 'email'], ['VISITA', 'visita'],
  ['REUNIAO', 'reuniao'], ['NOTA', 'nota'], ['PROPOSTA', 'proposta'],
]);

const propostaStatusMap = makeEnumMap<string, Proposta['status']>([
  ['PENDENTE', 'pendente'], ['ACEITA', 'aceita'], ['RECUSADA', 'recusada'],
]);

const destinatarioTipoMap = makeEnumMap<string, DestinatarioTipo>([
  ['INDIVIDUAL', 'individual'], ['FUNIL', 'funil'], ['EMPREENDIMENTO', 'empreendimento'],
]);

const chatRoleMap = makeEnumMap<string, ChatMessage['role']>([
  ['USER', 'user'], ['ASSISTANT', 'assistant'],
]);

const cargoFromApi: Record<string, UserCargo> = { DIRETORA: 'Diretora', GR: 'GR', GV: 'GV', SDR: 'SDR', MARKETING: 'Marketing' };
const cargoToApi: Record<UserCargo, string> = { Diretora: 'DIRETORA', GR: 'GR', GV: 'GV', SDR: 'SDR', Marketing: 'MARKETING' };

export function mapCargoFromApi(cargo: string): UserCargo {
  return cargoFromApi[cargo] ?? 'SDR';
}

export function mapCargoToApi(cargo: UserCargo): string {
  return cargoToApi[cargo];
}

// ── Users ──────────────────────────────────────────────────────────

export interface ApiUser {
  id: string;
  nome: string;
  email: string;
  cargo: string;
  cor: string;
  ativo: boolean;
}

export interface AppUser {
  id: string;
  nome: string;
  email: string;
  cargo: UserCargo;
  cor: string;
  ativo: boolean;
}

export function mapUserFromApi(u: ApiUser): AppUser {
  return { id: u.id, nome: u.nome, email: u.email, cargo: mapCargoFromApi(u.cargo), cor: u.cor, ativo: u.ativo };
}

// ── Corretores ──────────────────────────────────────────────────────

interface ApiResponsavel {
  id: string;
  nome: string;
  email: string;
}

export interface ApiClienteFinal {
  id: string;
  corretorId: string;
  nome: string;
  telefone: string;
  email: string | null;
  interesse: string;
  orcamento: number | null;
  observacoes: string | null;
  empreendimentoInteresse: string | null;
  dataAdicionado: string;
  negocioGerado: boolean;
  negocioCorretorId: string | null;
}

export interface ApiInteracao {
  id: string;
  corretorId: string;
  data: string;
  tipo: string;
  resumo: string;
  responsavelId: string | null;
  responsavel: ApiResponsavel | null;
  etapa: number;
}

export interface ApiProposta {
  id: string;
  corretorId: string;
  clienteFinalId: string | null;
  clienteFinalNome: string | null;
  data: string;
  empreendimento: string;
  unidade: string;
  valor: number;
  condicoes: string;
  financiamento: string | null;
  status: string;
  motivoRecusa: string | null;
  anexoNome: string | null;
}

export interface ApiCorretor {
  id: string;
  nomeCorretor: string;
  telefoneCorretor: string;
  whatsappCorretor: string;
  emailCorretor: string;
  imobiliaria: string;
  ticketMedio: number | null;
  tiposInteresse: string[];
  possuiInvestidores: boolean;
  potencialParceria: boolean;
  treinamento: boolean;
  dataAgendamentoTreinamento: string | null;
  dataRealizacaoTreinamento: string | null;
  etapa: number;
  temperatura: string;
  status: string;
  responsavelSDRId: string | null;
  responsavelSDR: ApiResponsavel | null;
  responsavelGVId: string | null;
  responsavelGV: ApiResponsavel | null;
  responsavelGRId: string | null;
  responsavelGR: ApiResponsavel | null;
  canalOrigem: string;
  dataEntrada: string;
  dataUltimaInteracao: string;
  dataDistribuicao: string | null;
  dataFechamento: string | null;
  etapaTimestamps: Record<string, string>;
  parentCorretorId: string | null;
  clienteFinalNome: string | null;
  observacoes: string;
  motivoPerda: string | null;
  valorFechamento: number | null;
  clientesFinais: ApiClienteFinal[];
  interacoes: ApiInteracao[];
  propostas: ApiProposta[];
}

function mapClienteFinalFromApi(cf: ApiClienteFinal): ClienteFinal {
  return {
    id: cf.id,
    nome: cf.nome,
    telefone: cf.telefone,
    email: cf.email ?? undefined,
    interesse: cf.interesse,
    orcamento: cf.orcamento ?? undefined,
    observacoes: cf.observacoes ?? undefined,
    dataAdicionado: cf.dataAdicionado,
    negocioGerado: cf.negocioGerado,
    negocioCorretorId: cf.negocioCorretorId ?? undefined,
    empreendimentoInteresse: cf.empreendimentoInteresse ?? undefined,
  };
}

function mapInteracaoFromApi(i: ApiInteracao): Interacao {
  return {
    id: i.id,
    data: i.data,
    tipo: tipoInteracaoMap.toApp(i.tipo),
    resumo: i.resumo,
    responsavel: i.responsavel?.nome ?? 'Sistema',
    etapa: i.etapa,
  };
}

function mapPropostaFromApi(p: ApiProposta): Proposta {
  return {
    id: p.id,
    clienteFinalId: p.clienteFinalId ?? undefined,
    clienteFinalNome: p.clienteFinalNome ?? undefined,
    data: p.data,
    empreendimento: p.empreendimento,
    unidade: p.unidade,
    valor: p.valor,
    condicoes: p.condicoes,
    financiamento: p.financiamento ?? undefined,
    status: propostaStatusMap.toApp(p.status),
    motivoRecusa: p.motivoRecusa ?? undefined,
    anexoNome: p.anexoNome ?? undefined,
  };
}

export function mapCorretorFromApi(l: ApiCorretor): Corretor {
  return {
    id: l.id,
    nomeCorretor: l.nomeCorretor,
    telefoneCorretor: l.telefoneCorretor,
    whatsappCorretor: l.whatsappCorretor,
    emailCorretor: l.emailCorretor,
    imobiliaria: l.imobiliaria,
    ticketMedio: l.ticketMedio ?? undefined,
    tiposInteresse: l.tiposInteresse,
    possuiInvestidores: l.possuiInvestidores,
    potencialParceria: l.potencialParceria,
    treinamento: l.treinamento,
    dataAgendamentoTreinamento: l.dataAgendamentoTreinamento ?? undefined,
    dataRealizacaoTreinamento: l.dataRealizacaoTreinamento ?? undefined,
    etapa: l.etapa,
    temperatura: temperaturaMap.toApp(l.temperatura),
    status: statusCorretorMap.toApp(l.status),
    responsavelSDR: l.responsavelSDR?.nome ?? '',
    responsavelGV: l.responsavelGV?.nome ?? '',
    responsavelGR: l.responsavelGR?.nome ?? '',
    canalOrigem: l.canalOrigem,
    dataEntrada: l.dataEntrada,
    dataUltimaInteracao: l.dataUltimaInteracao,
    dataDistribuicao: l.dataDistribuicao ?? undefined,
    dataFechamento: l.dataFechamento ?? undefined,
    etapaTimestamps: l.etapaTimestamps ?? {},
    clientesFinais: l.clientesFinais.map(mapClienteFinalFromApi),
    interacoes: l.interacoes.map(mapInteracaoFromApi),
    propostas: l.propostas.map(mapPropostaFromApi),
    parentCorretorId: l.parentCorretorId ?? undefined,
    clienteFinalNome: l.clienteFinalNome ?? undefined,
    observacoes: l.observacoes,
    motivoPerda: l.motivoPerda ?? undefined,
    valorFechamento: l.valorFechamento ?? undefined,
  };
}

export interface CreateCorretorPayload {
  nomeCorretor: string;
  telefoneCorretor: string;
  whatsappCorretor?: string;
  emailCorretor?: string;
  imobiliaria?: string;
  ticketMedio?: number;
  tiposInteresse?: string[];
  possuiInvestidores?: boolean;
  potencialParceria?: boolean;
  treinamento?: boolean;
  canalOrigem: string;
  responsavelSDRId?: string;
  observacoes?: string;
}

export function mapCreateCorretorToApi(payload: CreateCorretorPayload) {
  return payload;
}

/** Traduz um Partial<Corretor> (shape do app) para o payload PATCH esperado pela API. */
export function mapCorretorUpdateToApi(updates: Partial<Corretor>): Record<string, unknown> {
  const {
    responsavelSDR: _sdr, responsavelGV: _gv, responsavelGR: _gr,
    clientesFinais: _cf, interacoes: _int, propostas: _prop,
    id: _id, etapaTimestamps: _et,
    ...rest
  } = updates;

  const payload: Record<string, unknown> = { ...rest };

  if (updates.temperatura) payload.temperatura = temperaturaMap.toApi(updates.temperatura);
  if (updates.status) payload.status = statusCorretorMap.toApi(updates.status);

  return payload;
}

// ── Email Marketing ──────────────────────────────────────────────────

export interface ApiEmailTemplate {
  id: string;
  nome: string;
  assunto: string;
  preheader: string;
  blocks: unknown;
  criadoEm: string;
  atualizadoEm: string;
}

export function mapEmailTemplateFromApi(t: ApiEmailTemplate): EmailTemplate {
  return {
    id: t.id,
    nome: t.nome,
    assunto: t.assunto,
    preheader: t.preheader,
    blocks: t.blocks as EmailTemplate['blocks'],
    criadoEm: t.criadoEm,
    atualizadoEm: t.atualizadoEm,
  };
}

export interface ApiEmailCampaign {
  id: string;
  nome: string;
  assunto: string;
  preheader: string;
  blocks: unknown;
  destinatarioTipo: string;
  etapaAlvo: number | null;
  empreendimentoAlvo: string | null;
  destinatarios: EmailCampaign['destinatarios'];
  status: string;
  criadoEm: string;
  enviadoEm: string | null;
}

export function mapEmailCampaignFromApi(c: ApiEmailCampaign): EmailCampaign {
  return {
    id: c.id,
    nome: c.nome,
    assunto: c.assunto,
    preheader: c.preheader,
    blocks: c.blocks as EmailCampaign['blocks'],
    destinatarioTipo: destinatarioTipoMap.toApp(c.destinatarioTipo),
    etapaAlvo: c.etapaAlvo ?? undefined,
    empreendimentoAlvo: c.empreendimentoAlvo ?? undefined,
    destinatarios: c.destinatarios,
    status: 'enviado',
    criadoEm: c.criadoEm,
    enviadoEm: c.enviadoEm ?? c.criadoEm,
  };
}

export function mapDestinatarioTipoToApi(tipo: DestinatarioTipo): string {
  return destinatarioTipoMap.toApi(tipo);
}

// ── PHACZ IA ─────────────────────────────────────────────────────────

export interface ApiChatMessage {
  id: string;
  role: string;
  content: string;
  criadoEm: string;
}

export function mapChatMessageFromApi(m: ApiChatMessage): ChatMessage {
  return { id: m.id, role: chatRoleMap.toApp(m.role), content: m.content, criadoEm: m.criadoEm };
}
