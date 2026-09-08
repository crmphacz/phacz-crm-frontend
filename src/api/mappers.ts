import type {
  Corretor, ClienteFinal, ClienteFinalComContexto, Interacao, Proposta, Temperatura, StatusCorretor, TipoInteracao,
  DestinatarioTipo, EmailTemplate, EmailCampaign,
  ChatMessage, UserCargo, Rodada, RodadaResumo, CreateRodadaPayload, Notificacao, TipoNotificacao,
  Empreendimento, EmpreendimentoDetail, Unidade, StatusUnidade,
  TipoAcaoRodada, VinculoRodadaTipo, PerfilImobiliaria, HistoricoParceria, IntencaoPrincipal, PublicoEsperado, CarteiraPublico,
  MaterialComercial, EstruturaOperacao, CategoriaOrcamento, ResponsavelEntrega, StatusEntrega, ComoConvite,
  ProximoPasso, InvestimentoOuMoradia, PlanoB, PotencialRetorno, PrioridadeTrimestre, Recomendacao,
  LogAcao,
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

export function mapTipoInteracaoFromApi(tipo: string): TipoInteracao {
  return tipoInteracaoMap.toApp(tipo);
}

const propostaStatusMap = makeEnumMap<string, Proposta['status']>([
  ['PENDENTE', 'pendente'], ['ACEITA', 'aceita'], ['RECUSADA', 'recusada'],
]);

const destinatarioTipoMap = makeEnumMap<string, DestinatarioTipo>([
  ['INDIVIDUAL', 'individual'], ['FUNIL', 'funil'], ['EMPREENDIMENTO', 'empreendimento'],
]);

const chatRoleMap = makeEnumMap<string, ChatMessage['role']>([
  ['USER', 'user'], ['ASSISTANT', 'assistant'],
]);

const statusUnidadeMap = makeEnumMap<string, StatusUnidade>([
  ['VENDIDO', 'vendido'], ['EM_CONTRATO', 'em_contrato'], ['DISPONIVEL', 'disponivel'],
  ['EM_NEGOCIACAO', 'em_negociacao'], ['ALUGADO', 'alugado'],
]);

export function mapStatusUnidadeToApi(status: StatusUnidade): string {
  return statusUnidadeMap.toApi(status);
}

const cargoFromApi: Record<string, UserCargo> = {
  DIRETORA: 'Diretora', GR: 'GR', GV: 'GV', SDR: 'SDR', MARKETING: 'Marketing',
  ADMINISTRATIVO: 'Administrativo', RECEPCAO: 'Recepcao',
};
const cargoToApi: Record<UserCargo, string> = {
  Diretora: 'DIRETORA', GR: 'GR', GV: 'GV', SDR: 'SDR', Marketing: 'MARKETING',
  Administrativo: 'ADMINISTRATIVO', Recepcao: 'RECEPCAO',
};

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
  whatsappPhoneNumberId?: string | null;
  whatsappNumeroExibicao?: string | null;
}

export interface AppUser {
  id: string;
  nome: string;
  email: string;
  cargo: UserCargo;
  cor: string;
  ativo: boolean;
  whatsappPhoneNumberId: string;
  whatsappNumeroExibicao: string;
}

export function mapUserFromApi(u: ApiUser): AppUser {
  return {
    id: u.id,
    nome: u.nome,
    email: u.email,
    cargo: mapCargoFromApi(u.cargo),
    cor: u.cor,
    ativo: u.ativo,
    whatsappPhoneNumberId: u.whatsappPhoneNumberId ?? '',
    whatsappNumeroExibicao: u.whatsappNumeroExibicao ?? '',
  };
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
  cidade: string | null;
  uf: string | null;
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
  cpf: string | null;
  creci: string | null;
  dataNascimento: string | null;
  cidade: string | null;
  uf: string | null;
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
  // Só vem no GET /api/corretores (listagem paginada) — ver comentário do campo em Corretor (types.ts).
  ultimaAtividadeEm?: string | null;
  dataDistribuicao: string | null;
  dataFechamento: string | null;
  etapaTimestamps: Record<string, string>;
  parentCorretorId: string | null;
  clienteFinalNome: string | null;
  observacoes: string;
  motivoPerda: string | null;
  valorFechamento: number | null;
  clientesFinais: ApiClienteFinal[];
  // Ausentes na listagem (GET /) — só vêm em GET /:id e nas rotas de mutação, que devolvem o
  // corretor completo. Ver corretorListInclude no backend.
  interacoes?: ApiInteracao[];
  propostas?: ApiProposta[];
}

function mapClienteFinalFromApi(cf: ApiClienteFinal): ClienteFinal {
  return {
    id: cf.id,
    nome: cf.nome,
    telefone: cf.telefone,
    email: cf.email ?? undefined,
    cidade: cf.cidade ?? undefined,
    uf: cf.uf ?? undefined,
    interesse: cf.interesse,
    orcamento: cf.orcamento ?? undefined,
    observacoes: cf.observacoes ?? undefined,
    dataAdicionado: cf.dataAdicionado,
    negocioGerado: cf.negocioGerado,
    negocioCorretorId: cf.negocioCorretorId ?? undefined,
    empreendimentoInteresse: cf.empreendimentoInteresse ?? undefined,
  };
}

// ── Listagem paginada de clientes (GET /api/corretores/clientes) ──────
// Cada linha já vem achatada com o contexto do corretor responsável + `comprou` calculado no
// backend (ver corretoresRouter.get('/clientes', ...)) — a tela de Clientes não precisa mais
// do array inteiro de corretores pra montar isso no client.

export interface ApiClienteFinalComContexto extends ApiClienteFinal {
  corretor: { id: string; nomeCorretor: string; imobiliaria: string; etapa: number; status: string };
  comprou: boolean;
}

export function mapClienteFinalComContextoFromApi(
  cf: ApiClienteFinalComContexto
): ClienteFinalComContexto & { comprou: boolean } {
  return {
    ...mapClienteFinalFromApi(cf),
    corretorId: cf.corretorId,
    nomeCorretor: cf.corretor.nomeCorretor,
    imobiliaria: cf.corretor.imobiliaria,
    etapaCorretor: cf.corretor.etapa,
    statusCorretor: statusCorretorMap.toApp(cf.corretor.status),
    comprou: cf.comprou,
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
    cpf: l.cpf ?? undefined,
    creci: l.creci ?? undefined,
    dataNascimento: l.dataNascimento ?? undefined,
    cidade: l.cidade ?? undefined,
    uf: l.uf ?? undefined,
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
    responsavelSDRId: l.responsavelSDRId ?? undefined,
    responsavelGVId: l.responsavelGVId ?? undefined,
    responsavelGRId: l.responsavelGRId ?? undefined,
    canalOrigem: l.canalOrigem,
    dataEntrada: l.dataEntrada,
    dataUltimaInteracao: l.dataUltimaInteracao,
    ultimaAtividadeEm: l.ultimaAtividadeEm ?? undefined,
    dataDistribuicao: l.dataDistribuicao ?? undefined,
    dataFechamento: l.dataFechamento ?? undefined,
    etapaTimestamps: l.etapaTimestamps ?? {},
    clientesFinais: l.clientesFinais.map(mapClienteFinalFromApi),
    // Na listagem leve (ver ApiCorretor) esses dois campos não vêm do backend — o corretor
    // aparece com histórico "vazio" até o painel de detalhe buscar o registro completo
    // (ver hydrateCorretorDetail no store).
    interacoes: (l.interacoes ?? []).map(mapInteracaoFromApi),
    propostas: (l.propostas ?? []).map(mapPropostaFromApi),
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
  cpf?: string;
  creci?: string;
  dataNascimento?: string;
  cidade?: string;
  uf?: string;
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

// ── Calendário de Rodadas ──────────────────────────────────────────

const tipoAcaoMap = makeEnumMap<string, TipoAcaoRodada>([
  ['RODADA', 'rodada'], ['CAFE_NA_OBRA', 'cafe_na_obra'], ['EVENTO_EXTERNO', 'evento_externo'],
  ['TRAFEGO_PAGO', 'trafego_pago'], ['ALMOCO_JANTAR', 'almoco_jantar'], ['OUTRO', 'outro'],
]);
const vinculoRodadaTipoMap = makeEnumMap<string, VinculoRodadaTipo>([
  ['IMOBILIARIA', 'imobiliaria'], ['CORRETOR', 'corretor'],
]);
const perfilImobiliariaMap = makeEnumMap<string, PerfilImobiliaria>([
  ['ALTO_PADRAO', 'alto_padrao'], ['MISTO', 'misto'], ['INVESTIDOR', 'investidor'], ['BAIXO_TICKET', 'baixo_ticket'],
]);
const historicoParceriaMap = makeEnumMap<string, HistoricoParceria>([
  ['JA_PARCEIRA', 'ja_parceira'], ['NAO_PARCEIRA', 'nao_parceira'],
]);
const intencaoPrincipalMap = makeEnumMap<string, IntencaoPrincipal>([
  ['ABRIR_RELACIONAMENTO', 'abrir_relacionamento'], ['REATIVAR_BASE', 'reativar_base'],
  ['ENGAJAR_CORRETORES', 'engajar_corretores'], ['GERAR_VISITAS_PROPOSTAS', 'gerar_visitas_propostas'],
  ['CONVERSAO_VENDAS', 'conversao_vendas'],
]);
const publicoEsperadoMap = makeEnumMap<string, PublicoEsperado>([
  ['CORRETORES', 'corretores'], ['GERENTES', 'gerentes'], ['DONOS', 'donos'], ['CLIENTES_FINAIS', 'clientes_finais'],
]);
const carteiraPublicoMap = makeEnumMap<string, CarteiraPublico>([
  ['INVESTIDOR', 'investidor'], ['MORADIA', 'moradia'],
]);
const materialComercialMap = makeEnumMap<string, MaterialComercial>([
  ['APRESENTACAO_PPT', 'apresentacao_ppt'], ['BOOK_DIGITAL_PDF', 'book_digital_pdf'],
  ['TABELA_PRECOS', 'tabela_precos'], ['PLANTAS_IMAGENS', 'plantas_imagens'],
]);
const estruturaOperacaoMap = makeEnumMap<string, EstruturaOperacao>([
  ['TV_PROJETOR', 'tv_projetor'], ['SOM_MICROFONE', 'som_microfone'], ['BRINDES', 'brindes'],
]);
const categoriaOrcamentoMap = makeEnumMap<string, CategoriaOrcamento>([
  ['DESLOCAMENTO', 'deslocamento'], ['HOSPEDAGEM', 'hospedagem'], ['EVENTO_ESTRUTURA', 'evento_estrutura'],
  ['IMPRESSOS_MATERIAIS', 'impressos_materiais'], ['CUSTOS_INTERNOS', 'custos_internos'],
]);
const responsavelEntregaMap = makeEnumMap<string, ResponsavelEntrega>([
  ['PHACZ', 'phacz'], ['CORRETOR', 'corretor'], ['IMOBILIARIA', 'imobiliaria'],
]);
const statusEntregaMap = makeEnumMap<string, StatusEntrega>([
  ['PENDENTE', 'pendente'], ['EM_ANDAMENTO', 'em_andamento'], ['CONCLUIDO', 'concluido'],
]);
const comoConviteMap = makeEnumMap<string, ComoConvite>([
  ['WHATSAPP', 'whatsapp'], ['LIGACAO', 'ligacao'], ['EMAIL', 'email'], ['PRESENCIAL', 'presencial'],
]);
const proximoPassoMap = makeEnumMap<string, ProximoPasso>([
  ['VISITA', 'visita'], ['REUNIAO', 'reuniao'], ['PROPOSTA', 'proposta'], ['NUTRICAO_CONTEUDO', 'nutricao_conteudo'],
]);
const investimentoOuMoradiaMap = makeEnumMap<string, InvestimentoOuMoradia>([
  ['INVESTIMENTO', 'investimento'], ['MORADIA', 'moradia'],
]);
const planoBMap = makeEnumMap<string, PlanoB>([
  ['REAGENDAR', 'reagendar'], ['ALTERAR_FORMATO', 'alterar_formato'], ['TROCAR_LOCAL', 'trocar_local'], ['REDUZIR_ESCOPO', 'reduzir_escopo'],
]);
const potencialRetornoMap = makeEnumMap<string, PotencialRetorno>([
  ['ALTO', 'alto'], ['MEDIO', 'medio'], ['BAIXO', 'baixo'],
]);
const prioridadeTrimestreMap = makeEnumMap<string, PrioridadeTrimestre>([
  ['ALTA', 'alta'], ['MEDIA', 'media'], ['BAIXA', 'baixa'],
]);
const recomendacaoMap = makeEnumMap<string, Recomendacao>([
  ['SEGUIR', 'seguir'], ['SEGUIR_COM_AJUSTES', 'seguir_com_ajustes'], ['NAO_SEGUIR', 'nao_seguir'],
]);

function apiDateToKey(value: string | null | undefined): string | undefined {
  return value ? value.slice(0, 10) : undefined;
}

interface ApiRodadaCorretorConvidado {
  nome: string; creci: string; cargo: string; potencial: string; contato: string; observacoes: string;
}
interface ApiRodadaOrcamentoItem {
  categoria: string; descricao: string; valor: number; fornecedor: string; contato: string; cnpj: string; pago: boolean;
  periodoInicio: string | null; periodoFim: string | null; nomeReserva: string; numeroQuartos: number | null; anexoUrl: string;
}
interface ApiRodadaEntrega {
  descricao: string; responsavel: string; prazo: string | null; status: string;
}
interface ApiRodadaConvidado {
  nome: string; perfil: string; jaConheceLitoral: boolean; possuiOutrosImoveis: boolean; investimentoOuMoradia: string | null;
}
interface ApiRodadaVisitaAgendada {
  clienteOuImobiliaria: string; horario: string; local: string;
}

export interface ApiRodada {
  id: string;
  dataSolicitacao: string | null;
  dataInicio: string;
  dataFim: string;
  cidade: string;
  uf: string;
  tipoAcao: string;
  tipoAcaoOutro: string;
  imobiliaria: string;
  vinculoTipo: string;
  responsavelImobiliaria: string;
  gerenteVendasInternas: string;
  solicitanteRelacionamento: string;
  custoRodada: number;

  parceiroEndereco: string;
  parceiroPerfil: string | null;
  parceiroHistorico: string | null;
  parceiroParticipouAcaoAnterior: boolean | null;
  parceiroParticipouQuando: string;
  parceiroResumoRelacionamento: string;

  corretoresConvidados: ApiRodadaCorretorConvidado[];
  equipeApoios: string;
  equipePresentes: string;

  intencaoPrincipal: string | null;
  justificativaEstrategica: string;

  publicoEsperado: string[];
  quantidadeEstimadaParticipantes: number | null;
  quantidadeEstimadaDetalhe: string;
  perfilPublicoTicketMedio: number | null;
  perfilPublicoCarteira: string | null;
  empreendimentos: { empreendimento: { id: string; nome: string } }[];
  perfilClientesSegmento: string;
  metaMinParticipantes: number | null;
  metaMinAgendamentos: number | null;
  metaMinVendas: number | null;
  vgvPotencialEstimado: number | null;

  eventoData: string | null;
  eventoLocalNome: string;
  eventoLocalEndereco: string;
  eventoHorario: string;
  eventoAgendaRoteiro: string[];
  eventoAbordagemComercial: string;

  materiaisComerciais: string[];
  estruturaOperacao: string[];
  brindesDescricao: string;

  orcamentoItens: ApiRodadaOrcamentoItem[];
  orcamentoReservaContingenciaPercentual: number | null;

  entregas: ApiRodadaEntrega[];

  comoConvites: string[];
  comoConvitesObs: string;
  rsvpDataLimite: string | null;
  rsvpResponsavel: string;
  posEventoPrazoMaterial: string | null;
  posEventoPrazoRegistroCrm: string | null;
  posEventoProximosPassos: string[];
  convidados: ApiRodadaConvidado[];
  possuiVisitasAgendadas: boolean;
  visitasAgendadas: ApiRodadaVisitaAgendada[];

  riscosPrincipais: string;
  mitigacaoRiscos: string;
  planoB: string | null;
  planoBDetalhes: string;

  potencialRetorno: string | null;
  prioridadeTrimestre: string | null;
  comentarioFinalSolicitante: string;
  recomendacao: string | null;

  criadoPor: { id: string; nome: string };
  criadoEm: string;
}

/**
 * Formato retornado pela API para perfis sem acesso ao formulário completo — ver
 * `RODADA_SUMMARY_SELECT` no backend (`src/lib/permissions.ts`). Só a Diretoria recebe
 * `ApiRodada` completo; os demais perfis com acesso ao calendário recebem só isto.
 */
export interface ApiRodadaResumo {
  id: string;
  dataInicio: string;
  dataFim: string;
  cidade: string;
  uf: string;
  imobiliaria: string;
  vinculoTipo: string;
  responsavelImobiliaria: string;
}

export function mapRodadaResumoFromApi(r: ApiRodadaResumo): RodadaResumo {
  return {
    id: r.id,
    dataInicio: r.dataInicio.slice(0, 10),
    dataFim: r.dataFim.slice(0, 10),
    cidade: r.cidade,
    uf: r.uf,
    imobiliaria: r.imobiliaria,
    vinculoTipo: vinculoRodadaTipoMap.toApp(r.vinculoTipo),
    responsavelImobiliaria: r.responsavelImobiliaria,
  };
}

/** Distingue os dois formatos que `GET /api/rodadas` pode retornar, conforme o perfil do usuário. */
function isApiRodadaCompleta(r: ApiRodada | ApiRodadaResumo): r is ApiRodada {
  return 'criadoPor' in r;
}

/** Usado pela listagem, que pode vir completa (Diretoria) ou resumida (demais perfis). */
export function mapRodadaListItemFromApi(r: ApiRodada | ApiRodadaResumo): Rodada | RodadaResumo {
  return isApiRodadaCompleta(r) ? mapRodadaFromApi(r) : mapRodadaResumoFromApi(r);
}

export function mapRodadaFromApi(r: ApiRodada): Rodada {
  return {
    id: r.id,
    dataSolicitacao: apiDateToKey(r.dataSolicitacao),
    dataInicio: r.dataInicio.slice(0, 10),
    dataFim: r.dataFim.slice(0, 10),
    cidade: r.cidade,
    uf: r.uf,
    tipoAcao: tipoAcaoMap.toApp(r.tipoAcao),
    tipoAcaoOutro: r.tipoAcaoOutro,
    imobiliaria: r.imobiliaria,
    vinculoTipo: vinculoRodadaTipoMap.toApp(r.vinculoTipo),
    responsavelImobiliaria: r.responsavelImobiliaria,
    gerenteVendasInternas: r.gerenteVendasInternas,
    solicitanteRelacionamento: r.solicitanteRelacionamento,
    custoRodada: r.custoRodada,

    parceiroEndereco: r.parceiroEndereco,
    parceiroPerfil: r.parceiroPerfil ? perfilImobiliariaMap.toApp(r.parceiroPerfil) : undefined,
    parceiroHistorico: r.parceiroHistorico ? historicoParceriaMap.toApp(r.parceiroHistorico) : undefined,
    parceiroParticipouAcaoAnterior: r.parceiroParticipouAcaoAnterior ?? undefined,
    parceiroParticipouQuando: r.parceiroParticipouQuando,
    parceiroResumoRelacionamento: r.parceiroResumoRelacionamento,

    corretoresConvidados: r.corretoresConvidados.map((c) => ({ ...c })),
    equipeApoios: r.equipeApoios,
    equipePresentes: r.equipePresentes,

    intencaoPrincipal: r.intencaoPrincipal ? intencaoPrincipalMap.toApp(r.intencaoPrincipal) : undefined,
    justificativaEstrategica: r.justificativaEstrategica,

    publicoEsperado: r.publicoEsperado.map((v) => publicoEsperadoMap.toApp(v)),
    quantidadeEstimadaParticipantes: r.quantidadeEstimadaParticipantes ?? undefined,
    quantidadeEstimadaDetalhe: r.quantidadeEstimadaDetalhe,
    perfilPublicoTicketMedio: r.perfilPublicoTicketMedio ?? undefined,
    perfilPublicoCarteira: r.perfilPublicoCarteira ? carteiraPublicoMap.toApp(r.perfilPublicoCarteira) : undefined,
    empreendimentos: r.empreendimentos.map((e) => e.empreendimento),
    perfilClientesSegmento: r.perfilClientesSegmento,
    metaMinParticipantes: r.metaMinParticipantes ?? undefined,
    metaMinAgendamentos: r.metaMinAgendamentos ?? undefined,
    metaMinVendas: r.metaMinVendas ?? undefined,
    vgvPotencialEstimado: r.vgvPotencialEstimado ?? undefined,

    eventoData: apiDateToKey(r.eventoData),
    eventoLocalNome: r.eventoLocalNome,
    eventoLocalEndereco: r.eventoLocalEndereco,
    eventoHorario: r.eventoHorario,
    eventoAgendaRoteiro: r.eventoAgendaRoteiro,
    eventoAbordagemComercial: r.eventoAbordagemComercial,

    materiaisComerciais: r.materiaisComerciais.map((v) => materialComercialMap.toApp(v)),
    estruturaOperacao: r.estruturaOperacao.map((v) => estruturaOperacaoMap.toApp(v)),
    brindesDescricao: r.brindesDescricao,

    orcamentoItens: r.orcamentoItens.map((o) => ({
      categoria: categoriaOrcamentoMap.toApp(o.categoria),
      descricao: o.descricao,
      valor: o.valor,
      fornecedor: o.fornecedor,
      contato: o.contato,
      cnpj: o.cnpj,
      pago: o.pago,
      periodoInicio: apiDateToKey(o.periodoInicio),
      periodoFim: apiDateToKey(o.periodoFim),
      nomeReserva: o.nomeReserva,
      numeroQuartos: o.numeroQuartos ?? undefined,
      anexoUrl: o.anexoUrl,
    })),
    orcamentoReservaContingenciaPercentual: r.orcamentoReservaContingenciaPercentual ?? undefined,

    entregas: r.entregas.map((e) => ({
      descricao: e.descricao,
      responsavel: responsavelEntregaMap.toApp(e.responsavel),
      prazo: apiDateToKey(e.prazo),
      status: statusEntregaMap.toApp(e.status),
    })),

    comoConvites: r.comoConvites.map((v) => comoConviteMap.toApp(v)),
    comoConvitesObs: r.comoConvitesObs,
    rsvpDataLimite: apiDateToKey(r.rsvpDataLimite),
    rsvpResponsavel: r.rsvpResponsavel,
    posEventoPrazoMaterial: apiDateToKey(r.posEventoPrazoMaterial),
    posEventoPrazoRegistroCrm: apiDateToKey(r.posEventoPrazoRegistroCrm),
    posEventoProximosPassos: r.posEventoProximosPassos.map((v) => proximoPassoMap.toApp(v)),
    convidados: r.convidados.map((c) => ({
      nome: c.nome,
      perfil: c.perfil,
      jaConheceLitoral: c.jaConheceLitoral,
      possuiOutrosImoveis: c.possuiOutrosImoveis,
      investimentoOuMoradia: c.investimentoOuMoradia ? investimentoOuMoradiaMap.toApp(c.investimentoOuMoradia) : undefined,
    })),
    possuiVisitasAgendadas: r.possuiVisitasAgendadas,
    visitasAgendadas: r.visitasAgendadas.map((v) => ({ ...v })),

    riscosPrincipais: r.riscosPrincipais,
    mitigacaoRiscos: r.mitigacaoRiscos,
    planoB: r.planoB ? planoBMap.toApp(r.planoB) : undefined,
    planoBDetalhes: r.planoBDetalhes,

    potencialRetorno: r.potencialRetorno ? potencialRetornoMap.toApp(r.potencialRetorno) : undefined,
    prioridadeTrimestre: r.prioridadeTrimestre ? prioridadeTrimestreMap.toApp(r.prioridadeTrimestre) : undefined,
    comentarioFinalSolicitante: r.comentarioFinalSolicitante,
    recomendacao: r.recomendacao ? recomendacaoMap.toApp(r.recomendacao) : undefined,

    criadoPorNome: r.criadoPor.nome,
    criadoEm: r.criadoEm,
  };
}

/** Traduz o payload do formulário (shape do app) para o corpo esperado pela API (enums em maiúsculo). */
export function mapCreateRodadaToApi(payload: CreateRodadaPayload): Record<string, unknown> {
  return {
    ...payload,
    tipoAcao: tipoAcaoMap.toApi(payload.tipoAcao),
    vinculoTipo: vinculoRodadaTipoMap.toApi(payload.vinculoTipo),
    parceiroPerfil: payload.parceiroPerfil ? perfilImobiliariaMap.toApi(payload.parceiroPerfil) : undefined,
    parceiroHistorico: payload.parceiroHistorico ? historicoParceriaMap.toApi(payload.parceiroHistorico) : undefined,
    intencaoPrincipal: payload.intencaoPrincipal ? intencaoPrincipalMap.toApi(payload.intencaoPrincipal) : undefined,
    publicoEsperado: payload.publicoEsperado.map((v) => publicoEsperadoMap.toApi(v)),
    perfilPublicoCarteira: payload.perfilPublicoCarteira ? carteiraPublicoMap.toApi(payload.perfilPublicoCarteira) : undefined,
    materiaisComerciais: payload.materiaisComerciais.map((v) => materialComercialMap.toApi(v)),
    estruturaOperacao: payload.estruturaOperacao.map((v) => estruturaOperacaoMap.toApi(v)),
    orcamentoItens: payload.orcamentoItens.map((o) => ({ ...o, categoria: categoriaOrcamentoMap.toApi(o.categoria) })),
    entregas: payload.entregas.map((e) => ({
      ...e,
      responsavel: responsavelEntregaMap.toApi(e.responsavel),
      status: statusEntregaMap.toApi(e.status),
    })),
    comoConvites: payload.comoConvites.map((v) => comoConviteMap.toApi(v)),
    posEventoProximosPassos: payload.posEventoProximosPassos.map((v) => proximoPassoMap.toApi(v)),
    convidados: payload.convidados.map((c) => ({
      ...c,
      investimentoOuMoradia: c.investimentoOuMoradia ? investimentoOuMoradiaMap.toApi(c.investimentoOuMoradia) : undefined,
    })),
    planoB: payload.planoB ? planoBMap.toApi(payload.planoB) : undefined,
    potencialRetorno: payload.potencialRetorno ? potencialRetornoMap.toApi(payload.potencialRetorno) : undefined,
    prioridadeTrimestre: payload.prioridadeTrimestre ? prioridadeTrimestreMap.toApi(payload.prioridadeTrimestre) : undefined,
    recomendacao: payload.recomendacao ? recomendacaoMap.toApi(payload.recomendacao) : undefined,
  };
}

// ── Notificações ────────────────────────────────────────────────────

const tipoNotificacaoMap: Record<string, TipoNotificacao> = {
  RODADA_CRIADA: 'rodada_criada',
  ANIVERSARIO_HOJE: 'aniversario_hoje',
  ANIVERSARIO_ENVIADO: 'aniversario_enviado',
};

export interface ApiNotificacao {
  id: string;
  tipo: string;
  titulo: string;
  mensagem: string;
  lida: boolean;
  rodadaId: string | null;
  rodada: { id: string; dataInicio: string } | null;
  criadoEm: string;
}

export function mapNotificacaoFromApi(n: ApiNotificacao): Notificacao {
  return {
    id: n.id,
    tipo: tipoNotificacaoMap[n.tipo] ?? 'rodada_criada',
    titulo: n.titulo,
    mensagem: n.mensagem,
    lida: n.lida,
    rodadaId: n.rodadaId ?? undefined,
    rodadaDataInicio: n.rodada?.dataInicio.slice(0, 10),
    criadoEm: n.criadoEm,
  };
}

// ── Empreendimentos & Unidades ──────────────────────────────────────

export interface ApiUnidade {
  id: string;
  tipo: string;
  numero: string;
  metragemPrivativa: number;
  valor: number;
  status: string;
}

export function mapUnidadeFromApi(u: ApiUnidade): Unidade {
  return {
    id: u.id,
    tipo: u.tipo,
    numero: u.numero,
    metragemPrivativa: u.metragemPrivativa,
    valor: u.valor,
    status: statusUnidadeMap.toApp(u.status),
  };
}

interface ApiEmpreendimentoBase {
  id: string;
  nome: string;
  incorporadora: string;
  imagemCapaUrl: string;
  logoIncorporadoraUrl: string;
  rua: string;
  numero: string;
  bairro: string;
  cidade: string;
  uf: string;
  inicioObra: string | null;
  dataEntrega: string | null;
  percentualConcluido: number;
  faixaIncorporacao: string;
  dormitoriosMin: number;
  dormitoriosMax: number;
  suitesMin: number;
  suitesMax: number;
  vagasGaragem: number;
  caracteristicas: string[];
  hotsiteUrl: string;
  catalogoUrl: string;
  telefoneContato: string;
  updatedAt: string;
}

export interface ApiEmpreendimento extends ApiEmpreendimentoBase {
  totalUnidades: number;
  unidadesDisponiveis: number;
}

export interface ApiEmpreendimentoDetail extends ApiEmpreendimentoBase {
  unidades: ApiUnidade[];
}

function mapEmpreendimentoBaseFromApi(e: ApiEmpreendimentoBase) {
  return {
    id: e.id,
    nome: e.nome,
    incorporadora: e.incorporadora,
    imagemCapaUrl: e.imagemCapaUrl,
    logoIncorporadoraUrl: e.logoIncorporadoraUrl,
    rua: e.rua,
    numero: e.numero,
    bairro: e.bairro,
    cidade: e.cidade,
    uf: e.uf,
    // Datas sem componente de hora: fatiadas aqui uma única vez para casar com <input type="date">
    // e evitar o bug de fuso horário (dia mudando ao converter para o horário local do navegador).
    inicioObra: e.inicioObra?.slice(0, 10),
    dataEntrega: e.dataEntrega?.slice(0, 10),
    percentualConcluido: e.percentualConcluido,
    faixaIncorporacao: e.faixaIncorporacao,
    dormitoriosMin: e.dormitoriosMin,
    dormitoriosMax: e.dormitoriosMax,
    suitesMin: e.suitesMin,
    suitesMax: e.suitesMax,
    vagasGaragem: e.vagasGaragem,
    caracteristicas: e.caracteristicas,
    hotsiteUrl: e.hotsiteUrl,
    catalogoUrl: e.catalogoUrl,
    telefoneContato: e.telefoneContato,
    updatedAt: e.updatedAt,
  };
}

export function mapEmpreendimentoFromApi(e: ApiEmpreendimento): Empreendimento {
  return { ...mapEmpreendimentoBaseFromApi(e), totalUnidades: e.totalUnidades, unidadesDisponiveis: e.unidadesDisponiveis };
}

export function mapEmpreendimentoDetailFromApi(e: ApiEmpreendimentoDetail): EmpreendimentoDetail {
  return { ...mapEmpreendimentoBaseFromApi(e), unidades: e.unidades.map(mapUnidadeFromApi) };
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

// ── Histórico de Ações ──────────────────────────────────────────────

export interface ApiLogAcao {
  id: string;
  userNome: string;
  userCargo: string;
  acao: string;
  descricao: string;
  entidade: string | null;
  entidadeId: string | null;
  criadoEm: string;
}

export function mapLogAcaoFromApi(l: ApiLogAcao): LogAcao {
  return {
    id: l.id,
    userNome: l.userNome,
    userCargo: mapCargoFromApi(l.userCargo),
    acao: l.acao,
    descricao: l.descricao,
    entidade: l.entidade,
    entidadeId: l.entidadeId,
    criadoEm: l.criadoEm,
  };
}
