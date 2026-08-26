export type Temperatura = 'quente' | 'morno' | 'frio';
export type StatusCorretor = 'ativo' | 'nutricao' | 'arquivado' | 'ganho' | 'perdido';
export type TipoInteracao = 'ligacao' | 'whatsapp' | 'email' | 'visita' | 'reuniao' | 'nota' | 'proposta';
export type TipoInteresse = string;
export type CanalOrigem = string;
export type UserCargo = 'Diretora' | 'GR' | 'GV' | 'SDR' | 'Marketing' | 'Administrativo' | 'Recepcao';

export interface UserProfile {
  id: string;
  nome: string;
  cargo: UserCargo;
  email: string;
  cor: string;
}

export interface TarefaCadencia {
  dia: number;
  tipo: TipoInteracao;
  label: string;
  descricao: string;
  responsavel: UserCargo;
}

export interface ClienteFinal {
  id: string;
  nome: string;
  telefone: string;
  email?: string;
  interesse: string;
  orcamento?: number;
  observacoes?: string;
  dataAdicionado: string;
  negocioGerado: boolean;
  negocioCorretorId?: string;
  empreendimentoInteresse?: string;
}

export interface Interacao {
  id: string;
  data: string;
  tipo: TipoInteracao;
  resumo: string;
  responsavel: string;
  etapa: number;
}

export interface Proposta {
  id: string;
  clienteFinalId?: string;
  clienteFinalNome?: string;
  data: string;
  empreendimento: string;
  unidade: string;
  valor: number;
  condicoes: string;
  financiamento?: string;
  status: 'pendente' | 'aceita' | 'recusada';
  motivoRecusa?: string;
  anexoNome?: string;
}

export interface Corretor {
  id: string;

  // Corretor
  nomeCorretor: string;
  telefoneCorretor: string;
  whatsappCorretor: string;
  emailCorretor: string;
  imobiliaria: string;
  ticketMedio?: number;
  cpf?: string;
  creci?: string;
  dataNascimento?: string;
  tiposInteresse: TipoInteresse[];
  possuiInvestidores: boolean;
  potencialParceria: boolean;
  treinamento: boolean;

  // Treinamento — datas
  dataAgendamentoTreinamento?: string;
  dataRealizacaoTreinamento?: string;

  // Pipeline
  etapa: number;
  temperatura: Temperatura;
  status: StatusCorretor;

  // Equipe
  responsavelSDR: string;
  responsavelGV: string;
  responsavelGR: string;
  responsavelSDRId?: string;
  responsavelGVId?: string;
  responsavelGRId?: string;

  // Origem
  canalOrigem: CanalOrigem;

  // Timestamps
  dataEntrada: string;
  dataUltimaInteracao: string;
  dataDistribuicao?: string;
  dataFechamento?: string;
  etapaTimestamps: Record<string, string>;

  // Clientes finais
  clientesFinais: ClienteFinal[];

  // Atividades
  interacoes: Interacao[];

  // Propostas
  propostas: Proposta[];

  // Negócio derivado
  parentCorretorId?: string;
  clienteFinalNome?: string;

  // Saída
  observacoes: string;
  motivoPerda?: string;
  valorFechamento?: number;
}

export interface StageConfig {
  id: number;
  nome: string;
  nomeAbrev: string;
  responsavel: string[];
  cor: string;
  corBg: string;
  slaHoras?: number;
  slaDias?: number;
  slaLabel: string;
  descricao: string;
  paralelo?: boolean;
}

// ── Email Marketing ────────────────────────────────────────────────

export type EmailBlockType = 'heading' | 'text' | 'image' | 'video' | 'button' | 'divider' | 'spacer';
export type Alinhamento = 'left' | 'center' | 'right';

interface EmailBlockBase {
  id: string;
}

export interface HeadingBlock extends EmailBlockBase {
  type: 'heading';
  texto: string;
  tamanho: number;
  cor: string;
  alinhamento: Alinhamento;
}

export interface TextBlock extends EmailBlockBase {
  type: 'text';
  texto: string;
  tamanho: number;
  cor: string;
  alinhamento: Alinhamento;
}

export interface ImageBlock extends EmailBlockBase {
  type: 'image';
  url: string;
  alt: string;
  largura: number;
  alinhamento: Alinhamento;
  link?: string;
}

export interface VideoBlock extends EmailBlockBase {
  type: 'video';
  url: string;
  posterUrl?: string;
  legenda: string;
  largura: number;
  alinhamento: Alinhamento;
}

export interface ButtonBlock extends EmailBlockBase {
  type: 'button';
  texto: string;
  url: string;
  corFundo: string;
  corTexto: string;
  alinhamento: Alinhamento;
}

export interface DividerBlock extends EmailBlockBase {
  type: 'divider';
  cor: string;
}

export interface SpacerBlock extends EmailBlockBase {
  type: 'spacer';
  altura: number;
}

export type EmailBlock = HeadingBlock | TextBlock | ImageBlock | VideoBlock | ButtonBlock | DividerBlock | SpacerBlock;

export interface EmailTemplate {
  id: string;
  nome: string;
  assunto: string;
  preheader: string;
  blocks: EmailBlock[];
  criadoEm: string;
  atualizadoEm: string;
}

export type DestinatarioTipo = 'individual' | 'funil' | 'empreendimento';

export interface EmailDestinatario {
  nome: string;
  email: string;
  origem: string;
}

export interface EmailCampaign {
  id: string;
  nome: string;
  assunto: string;
  preheader: string;
  blocks: EmailBlock[];
  destinatarioTipo: DestinatarioTipo;
  etapaAlvo?: number;
  empreendimentoAlvo?: string;
  destinatarios: EmailDestinatario[];
  status: 'enviado';
  criadoEm: string;
  enviadoEm: string;
}

// ── Calendário de Rodadas ──────────────────────────────────────────
// Datas do formulário de rodada são strings "YYYY-MM-DD" (sem componente de hora),
// para casar 1:1 com <input type="date"> e evitar bug de fuso horário (o dia mudando
// ao converter para o horário local do navegador).

export type TipoAcaoRodada = 'rodada' | 'cafe_na_obra' | 'evento_externo' | 'trafego_pago' | 'almoco_jantar' | 'outro';
/** O que o campo `imobiliaria` da rodada representa: nome de uma imobiliária ou de um corretor cadastrado. */
export type VinculoRodadaTipo = 'imobiliaria' | 'corretor';
export type PerfilImobiliaria = 'alto_padrao' | 'misto' | 'investidor' | 'baixo_ticket';
export type HistoricoParceria = 'ja_parceira' | 'nao_parceira';
export type IntencaoPrincipal = 'abrir_relacionamento' | 'reativar_base' | 'engajar_corretores' | 'gerar_visitas_propostas' | 'conversao_vendas';
export type PublicoEsperado = 'corretores' | 'gerentes' | 'donos' | 'clientes_finais';
export type CarteiraPublico = 'investidor' | 'moradia';
export type MaterialComercial = 'apresentacao_ppt' | 'book_digital_pdf' | 'tabela_precos' | 'plantas_imagens';
export type EstruturaOperacao = 'tv_projetor' | 'som_microfone' | 'brindes';
export type CategoriaOrcamento = 'deslocamento' | 'hospedagem' | 'evento_estrutura' | 'impressos_materiais' | 'custos_internos';
export type ResponsavelEntrega = 'phacz' | 'corretor' | 'imobiliaria';
export type StatusEntrega = 'pendente' | 'em_andamento' | 'concluido';
export type ComoConvite = 'whatsapp' | 'ligacao' | 'email' | 'presencial';
export type ProximoPasso = 'visita' | 'reuniao' | 'proposta' | 'nutricao_conteudo';
export type InvestimentoOuMoradia = 'investimento' | 'moradia';
export type PlanoB = 'reagendar' | 'alterar_formato' | 'trocar_local' | 'reduzir_escopo';
export type PotencialRetorno = 'alto' | 'medio' | 'baixo';
export type PrioridadeTrimestre = 'alta' | 'media' | 'baixa';
export type Recomendacao = 'seguir' | 'seguir_com_ajustes' | 'nao_seguir';

export interface RodadaCorretorConvidado {
  nome: string;
  creci: string;
  cargo: string;
  potencial: string;
  contato: string;
  observacoes: string;
}

export interface RodadaOrcamentoItem {
  categoria: CategoriaOrcamento;
  descricao: string;
  valor: number;
  fornecedor: string;
  contato: string;
  cnpj: string;
  pago: boolean;
  periodoInicio?: string;
  periodoFim?: string;
  nomeReserva: string;
  numeroQuartos?: number;
  anexoUrl: string;
}

export interface RodadaEntrega {
  descricao: string;
  responsavel: ResponsavelEntrega;
  prazo?: string;
  status: StatusEntrega;
}

export interface RodadaConvidado {
  nome: string;
  perfil: string;
  jaConheceLitoral: boolean;
  possuiOutrosImoveis: boolean;
  investimentoOuMoradia?: InvestimentoOuMoradia;
}

export interface RodadaVisitaAgendada {
  clienteOuImobiliaria: string;
  horario: string;
  local: string;
}

export interface Rodada {
  id: string;

  // Cabeçalho
  dataSolicitacao?: string;
  dataInicio: string;
  dataFim: string;
  cidade: string;
  uf: string;
  tipoAcao: TipoAcaoRodada;
  tipoAcaoOutro: string;
  imobiliaria: string;
  vinculoTipo: VinculoRodadaTipo;
  responsavelImobiliaria: string;
  gerenteVendasInternas: string;
  solicitanteRelacionamento: string;
  /** Somado automaticamente a partir de orcamentoItens — não editável diretamente. */
  custoRodada: number;

  // 1. Dados do parceiro (Imobiliária)
  parceiroEndereco: string;
  parceiroPerfil?: PerfilImobiliaria;
  parceiroHistorico?: HistoricoParceria;
  parceiroParticipouAcaoAnterior?: boolean;
  parceiroParticipouQuando: string;
  parceiroResumoRelacionamento: string;

  // 2. Corretores envolvidos e time Phacz
  corretoresConvidados: RodadaCorretorConvidado[];
  equipeApoios: string;
  equipePresentes: string;

  // 3. Objetivo, intenção e justificativa
  intencaoPrincipal?: IntencaoPrincipal;
  justificativaEstrategica: string;

  // 4. Público-alvo, expectativa e metas
  publicoEsperado: PublicoEsperado[];
  quantidadeEstimadaParticipantes?: number;
  quantidadeEstimadaDetalhe: string;
  perfilPublicoTicketMedio?: number;
  perfilPublicoCarteira?: CarteiraPublico;
  empreendimentos: { id: string; nome: string }[];
  perfilClientesSegmento: string;
  metaMinParticipantes?: number;
  metaMinAgendamentos?: number;
  metaMinVendas?: number;
  vgvPotencialEstimado?: number;

  // 5. Detalhamento do evento/atividade
  eventoData?: string;
  eventoLocalNome: string;
  eventoLocalEndereco: string;
  eventoHorario: string;
  eventoAgendaRoteiro: string[];
  eventoAbordagemComercial: string;

  // 6. Materiais e estrutura
  materiaisComerciais: MaterialComercial[];
  estruturaOperacao: EstruturaOperacao[];
  brindesDescricao: string;

  // 7. Orçamento previsto
  orcamentoItens: RodadaOrcamentoItem[];
  orcamentoReservaContingenciaPercentual?: number;

  // 8. Responsabilidades e prazos
  entregas: RodadaEntrega[];

  // 9. Convites, confirmações e follow-up
  comoConvites: ComoConvite[];
  comoConvitesObs: string;
  rsvpDataLimite?: string;
  rsvpResponsavel: string;
  posEventoPrazoMaterial?: string;
  posEventoPrazoRegistroCrm?: string;
  posEventoProximosPassos: ProximoPasso[];
  convidados: RodadaConvidado[];
  possuiVisitasAgendadas: boolean;
  visitasAgendadas: RodadaVisitaAgendada[];

  // 10. Riscos, dependências e plano B
  riscosPrincipais: string;
  mitigacaoRiscos: string;
  planoB?: PlanoB;
  planoBDetalhes: string;

  // 11. Parecer de viabilidade
  potencialRetorno?: PotencialRetorno;
  prioridadeTrimestre?: PrioridadeTrimestre;
  comentarioFinalSolicitante: string;
  recomendacao?: Recomendacao;

  criadoPorNome: string;
  criadoEm: string;
}

export type CreateRodadaPayload = Omit<Rodada, 'id' | 'criadoPorNome' | 'criadoEm' | 'custoRodada' | 'empreendimentos'> & {
  empreendimentoIds: string[];
};

/**
 * Formato reduzido de rodada retornado pela API para perfis sem acesso ao formulário
 * completo (Recepção, SDR, GV/"GRV", GR/"Gerente de Relacionamento") — ver
 * `RODADA_SUMMARY_SELECT` no backend. Só a Diretoria recebe o `Rodada` completo.
 */
export interface RodadaResumo {
  id: string;
  dataInicio: string;
  dataFim: string;
  cidade: string;
  uf: string;
  imobiliaria: string;
  vinculoTipo: VinculoRodadaTipo;
  /** "Corretor parceiro" — responsável pela imobiliária nessa rodada. */
  responsavelImobiliaria: string;
}

/** Type guard: distingue o formulário completo (Diretoria) do resumo (demais perfis). */
export function isRodadaCompleta(r: Rodada | RodadaResumo): r is Rodada {
  return 'tipoAcao' in r;
}

// ── Notificações ────────────────────────────────────────────────────

export type TipoNotificacao = 'rodada_criada';

export interface Notificacao {
  id: string;
  tipo: TipoNotificacao;
  titulo: string;
  mensagem: string;
  lida: boolean;
  rodadaId?: string;
  rodadaDataInicio?: string; // "YYYY-MM-DD", usado para abrir o mês certo no calendário
  criadoEm: string;
}

// ── Empreendimentos & Unidades ──────────────────────────────────────

export type StatusUnidade = 'vendido' | 'em_contrato' | 'disponivel' | 'em_negociacao' | 'alugado';

export interface Unidade {
  id: string;
  tipo: string;
  numero: string;
  metragemPrivativa: number;
  valor: number;
  status: StatusUnidade;
}

export type CreateUnidadePayload = Omit<Unidade, 'id'>;

export interface Empreendimento {
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
  inicioObra?: string; // "YYYY-MM-DD"
  dataEntrega?: string; // "YYYY-MM-DD"
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
  totalUnidades: number;
  unidadesDisponiveis: number;
  updatedAt: string;
}

export interface EmpreendimentoDetail extends Omit<Empreendimento, 'totalUnidades' | 'unidadesDisponiveis'> {
  unidades: Unidade[];
}

export type CreateEmpreendimentoPayload = Omit<Empreendimento, 'id' | 'totalUnidades' | 'unidadesDisponiveis' | 'updatedAt'>;

// ── PHACZ IA ────────────────────────────────────────────────────────

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  criadoEm: string;
}

// ── Histórico de Ações ────────────────────────────────────────────────
// Só existe leitura/busca — nenhum campo/ação de exclusão em lugar nenhum do frontend,
// espelhando o backend (que também não tem rota de DELETE pra isso).

export interface LogAcao {
  id: string;
  userNome: string;
  userCargo: UserCargo;
  acao: string;
  descricao: string;
  entidade: string | null;
  entidadeId: string | null;
  criadoEm: string;
}
