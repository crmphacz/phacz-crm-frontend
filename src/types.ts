export type Temperatura = 'quente' | 'morno' | 'frio';
export type StatusCorretor = 'ativo' | 'nutricao' | 'arquivado' | 'ganho' | 'perdido';
export type TipoInteracao =
  | 'ligacao' | 'whatsapp' | 'email'
  // 'visita' é a "Visita em clientes" — o valor não mudou, só o rótulo (ver TIPO_INTERACAO_CONFIG).
  | 'visita' | 'visita_obra' | 'visita_imobiliaria' | 'almoco' | 'evento'
  | 'reuniao' | 'atendimento_cliente' | 'atendimento_corretor'
  | 'nota' | 'proposta' | 'especulacao' | 'treinamento';
export type TipoInteresse = string;
export type CanalOrigem = string;
export type UserCargo = 'Diretora' | 'GR' | 'GV' | 'SDR' | 'Marketing' | 'Administrativo' | 'Recepcao' | 'GerenteEstrategias';

export interface UserProfile {
  id: string;
  nome: string;
  cargo: UserCargo;
  email: string;
  cor: string;
  /** Número da Meta pelo qual esta pessoa dispara WhatsApp, formatado para exibição. Vazio = não configurado. */
  whatsappNumeroExibicao: string;
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
  /** País do telefone (ISO 3166-1 alfa-2). Define a máscara e o DDI. Padrão 'BR'. */
  paisTelefone?: string;
  email?: string;
  cidade?: string;
  uf?: string;
  interesse: string;
  orcamento?: number;
  observacoes?: string;
  dataAdicionado: string;
  negocioGerado: boolean;
  negocioCorretorId?: string;
  empreendimentoInteresse?: string;
  /** Mesma lista do canal de origem do corretor. Vazio nos clientes cadastrados antes do campo existir. */
  canalOrigem?: CanalOrigem;
  /** Rodada em que o cliente foi captado, quando o canal de origem é "Rodada". */
  rodadaId?: string | null;
}

export interface Interacao {
  id: string;
  data: string;
  /**
   * Término do compromisso, nos tipos com duração (ver PEDE_PERIODO em utils.ts). `data` é o
   * início; aqui vai o fim, que no evento pode cair em outro dia. Ausente nos tipos sem
   * duração e em todo o histórico registrado antes deste campo existir.
   */
  dataFim?: string;
  tipo: TipoInteracao;
  resumo: string;
  /**
   * Arquivos e áudios anexados à atividade, na ordem em que foram enviados. Qualquer tipo de
   * atividade aceita, e os dois tipos de anexo podem conviver na mesma.
   */
  anexosUrls?: string[];
  /** Como aconteceu — alimenta as linhas "presencial" × "vídeo chamada" do placar de metas. */
  modalidade?: ModalidadeAtividade;
  /** Empreendimento a que a atividade se refere — quebra a especulação no placar. */
  empreendimento?: string;
  /** Quem REALIZOU a atividade. Nem sempre é quem registrou: a Diretoria lança pelos outros. */
  responsavelId?: string;
  responsavel: string;
  /**
   * Preenchido quando o compromisso foi marcado e NÃO aconteceu (ver PODE_CANCELAR em
   * utils.ts — hoje, só o treinamento). A atividade continua no histórico, riscada: é dela que
   * sai a taxa de churn de treinamentos. Ausente = o compromisso continua valendo.
   */
  canceladoEm?: string;
  /** Por que não aconteceu. Só tem conteúdo junto com `canceladoEm`. */
  motivoCancelamento?: string;
  etapa: number;
  /** Preenchido quando `tipo === 'proposta'` e a atividade foi vinculada a uma proposta específica. */
  propostaId?: string;
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
  /** País do telefone (ISO 3166-1 alfa-2). Define a máscara e o DDI. Padrão 'BR'. */
  paisTelefone?: string;
  whatsappCorretor: string;
  emailCorretor: string;
  imobiliaria: string;
  ticketMedio?: number;
  cpf?: string;
  creci?: string;
  dataNascimento?: string;
  cidade?: string;
  uf?: string;
  tiposInteresse: TipoInteresse[];
  possuiInvestidores: boolean;
  potencialParceria: boolean;
  /** Quer treinamento. */
  treinamento: boolean;
  /** Foi perguntado e recusou. Diferente de `treinamento: false`, que é "não informado". */
  naoDesejaTreinamento?: boolean;

  // Treinamento — datas e horários
  dataAgendamentoTreinamento?: string;
  dataRealizacaoTreinamento?: string;
  /** Hora de relógio "HH:MM". Vazio quando não informado. */
  horaInicioTreinamento?: string;
  horaFimTreinamento?: string;

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
  /**
   * Evento da agenda em que este corretor foi captado. Preenchido quando o canal de origem é
   * "Evento" — é o que faz o corretor aparecer no modal daquele evento no calendário.
   */
  eventoAgendaId?: string | null;
  /** Nasceu como cadastro simplificado — registro de como o card entrou, não muda depois. */
  cadastroSimplificado?: boolean;

  // Timestamps
  dataEntrada: string;
  dataUltimaInteracao: string;
  /** Última interação real (ou movimentação de etapa/distribuição/fechamento); ausente = corretor sem nenhuma atividade registrada. Só vem preenchido na listagem paginada (GET /api/corretores). */
  ultimaAtividadeEm?: string;
  /**
   * Tipos de atividade que este card já teve registrados, sem repetição. Alimenta o filtro
   * "tipo de atividade" — a tela precisa saber que houve uma especulação, não o que foi
   * escrito nela.
   */
  tiposInteracao?: TipoInteracao[];
  /**
   * Quando o CORRETOR fechou a última venda, somando o card raiz e todos os negócios gerados a
   * partir dele — não é o `dataFechamento` deste card. Ausente = nunca vendeu. Só vem
   * preenchido na listagem paginada (GET /api/corretores).
   */
  ultimaVendaEm?: string;
  /** Quantas vendas o corretor já fechou, na mesma conta de `ultimaVendaEm`. */
  totalVendas?: number;
  dataDistribuicao?: string;
  dataFechamento?: string;
  etapaTimestamps: Record<string, string>;

  // Clientes finais
  clientesFinais: ClienteFinal[];

  // Atividades
  interacoes: Interacao[];

  // Propostas
  propostas: Proposta[];

  /** `true` quando `interacoes`/`propostas` vieram do backend (GET /:id ou mutação); `false`/ausente na listagem leve, onde ambos são só `[]` placeholder. */
  detalheCarregado?: boolean;

  // Negócio derivado
  parentCorretorId?: string;
  clienteFinalNome?: string;

  // Saída
  observacoes: string;
  motivoPerda?: string;
  valorFechamento?: number;
}

/** ClienteFinal + contexto do corretor responsável — usado na tela de Clientes (lista achatada, um cliente por linha). */
export interface ClienteFinalComContexto extends ClienteFinal {
  corretorId: string;
  nomeCorretor: string;
  imobiliaria: string;
  etapaCorretor: number;
  statusCorretor: StatusCorretor;
  // Donos do card do corretor. Vêm na listagem para a tela saber quem pode EDITAR este
  // cliente — a edição passa pela posse do card no servidor (ver canEditClienteFinal).
  responsavelSDRId?: string;
  responsavelGVId?: string;
  responsavelGRId?: string;
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

/** `grupo_funil` (funil inteiro) só existe no disparo de WhatsApp — o e-mail tem os outros três. */
export type DestinatarioTipo = 'individual' | 'funil' | 'empreendimento' | 'grupo_funil';

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

/** Uma imobiliária ou corretor vinculado à rodada. `nome` é o nome mesmo, não um id. */
export interface RodadaVinculo {
  tipo: VinculoRodadaTipo;
  nome: string;
}
export type StatusAprovacaoRodada = 'pendente' | 'aprovada' | 'recusada' | 'correcao_solicitada' | 'cancelada';
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
  /** Anexos do item: nota, orçamento, cardápio, comprovante. Vários por item. */
  anexosUrls: string[];
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
  /** Ao menos um dos dois é obrigatório — convidado sem contato não serve para follow-up. */
  email: string;
  telefone: string;
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
  /** Fria (imobiliária nova) × quente (parceira ativa) — conta no placar de metas do GR. */
  temperaturaRodada?: TemperaturaRodada | null;
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

  // Aprovação da Diretoria — só aparece no calendário pra quem não seja Diretoria (ou quem
  // não a criou) depois de aprovada.
  /**
   * Todas as imobiliárias e corretores da rodada. `imobiliaria` + `vinculoTipo` acima seguem
   * existindo e espelham o PRIMEIRO item daqui — é o par que as telas de lista, o log e a IA
   * leem. Pode vir vazio em rodada antiga ainda não migrada; o formulário trata isso.
   */
  vinculos: RodadaVinculo[];

  statusAprovacao: StatusAprovacaoRodada;
  motivoRecusa: string;
  aprovadoPorNome?: string;
  aprovadoEm?: string;

  /** Retirada da aprovação pela GR (ou Diretoria) — ver statusAprovacao 'cancelada'. */
  motivoCancelamento: string;
  canceladoPorNome?: string;
  canceladoEm?: string;

  criadoPorId: string;
  criadoPorNome: string;
  criadoEm: string;
}

export type CreateRodadaPayload = Omit<
  Rodada,
  'id' | 'criadoPorId' | 'criadoPorNome' | 'criadoEm' | 'custoRodada' | 'empreendimentos' | 'statusAprovacao' | 'motivoRecusa' | 'aprovadoPorNome' | 'aprovadoEm' | 'motivoCancelamento' | 'canceladoPorNome' | 'canceladoEm'
> & {
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

export type TipoNotificacao =
  | 'rodada_criada'
  | 'rodada_pendente_aprovacao'
  | 'rodada_aprovada'
  | 'rodada_recusada'
  | 'rodada_correcao_solicitada'
  | 'aniversario_hoje'
  | 'aniversario_enviado';

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

// ── Tabela de Empreendimentos ──────────────────────────────────────

export interface TabelaEmpreendimentoResumo {
  id: string;
  nome: string;
  criadoEm: string;
  atualizadoEm: string;
  criadoPorNome: string | null;
  atualizadoPorNome: string | null;
  /**
   * Empreendimento dono da tabela, quando ela nasceu junto com um (toda criação de
   * empreendimento cria a sua). Null nas tabelas avulsas, feitas pelo botão "Nova tabela".
   */
  empreendimentoId: string | null;
  empreendimentoNome: string | null;
}

export interface TabelaEmpreendimentoDetalhe extends TabelaEmpreendimentoResumo {
  /** Snapshot do editor (array de abas no formato do fortune-sheet). */
  dados: unknown;
}

export interface CelulaAlterada {
  aba: string;
  ref: string;
  valor: string;
  formula: string | null;
}

// ── Agenda / Aniversários ───────────────────────────────────────────

export interface SaudacaoAniversario {
  enviadoPorNome: string;
  enviadoEm: string; // ISO
  mensagem: string;
}

export interface AniversarioAgenda {
  corretorId: string;
  nomeCorretor: string;
  imobiliaria: string;
  telefone: string;
  whatsapp: string;
  /** País do telefone (ISO). Define o DDI do link do WhatsApp. */
  paisTelefone?: string;
  dia: number; // 1-31
  dataNascimento: string; // ISO
  idade: number;
  /** True se o aniversário é HOJE — só nesse dia a Diretoria pode enviar a mensagem. */
  hoje: boolean;
  saudacao: SaudacaoAniversario | null;
}

/** Uma interação (ver `Interacao`) do usuário logado, exibida na Agenda como compromisso/ligação. */
/**
 * Evento criado direto na agenda de um usuário. Diferente da atividade, não pertence a um
 * card: existe por si e vários corretores podem apontar para ele como canal de origem.
 */
export interface EventoAgenda {
  id: string;
  titulo: string;
  descricao: string;
  local: string;
  dataInicio: string; // ISO
  dataFim: string;    // ISO
  responsavelId: string;
  responsavelNome: string;
  responsavelCor: string;
  /** Quantos corretores foram captados neste evento. */
  totalCorretores: number;
}

/** Evento com a lista de quem veio dele — o que o modal do calendário mostra. */
export interface EventoAgendaDetalhe extends EventoAgenda {
  corretores: {
    id: string;
    nomeCorretor: string;
    imobiliaria: string;
    etapa: number;
    status: StatusCorretor;
    telefoneCorretor: string;
    emailCorretor: string;
    dataEntrada: string;
  }[];
}

export interface AtividadeAgenda {
  id: string;
  data: string; // ISO
  /** Término, nos compromissos com duração. Null nos instantâneos e no histórico antigo. */
  dataFim?: string | null;
  tipo: TipoInteracao;
  resumo: string;
  etapa: number;
  corretorId: string;
  corretorNome: string;
  /**
   * Compromisso cancelado — continua ocupando o dia no calendário, riscado. Some seria pior:
   * quem olha a semana precisa ver que aquele horário caiu, e por quê.
   */
  canceladoEm?: string;
  motivoCancelamento?: string;
  /** Dono do compromisso. Só varia na visão da Diretoria, que vê a agenda de todos. */
  responsavelId?: string;
  responsavelNome?: string;
  responsavelCor?: string;
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
  suites: number;
  vagas: number;
  observacoes: string;
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
  tipos: string[];
  condicoesPagamento: string[];
  hotsiteUrl: string;
  catalogoUrl: string;
  /** Catálogo enviado como arquivo — alternativa ao link. Vazio quando não há arquivo. */
  catalogoArquivoUrl: string;
  /** Nome original do arquivo, para exibir na tela. */
  catalogoArquivoNome: string;
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

// ── WhatsApp em massa ──────────────────────────────────────────────
// Disparo iniciado pela empresa exige template aprovado na Meta: texto livre fora da janela de
// 24h desde a última resposta do destinatário é recusado (erro 131047). Por isso a campanha
// aponta sempre para um template aprovado, e o que a pessoa escreve são as variáveis dele.

/** Funis do pipeline como critério de público — mesmos grupos das abas do Pipeline. */
export type GrupoFunil = 'todos' | 'pre-atendimento' | 'treinamento' | 'venda' | 'pos-venda';

export interface WhatsappTemplateComponent {
  tipo: 'HEADER' | 'BODY' | 'FOOTER' | 'BUTTONS';
  formato?: 'TEXT' | 'IMAGE' | 'VIDEO' | 'DOCUMENT' | 'LOCATION';
  texto?: string;
}

export interface WhatsappTemplate {
  nome: string;
  idioma: string;
  categoria: string;
  componentes: WhatsappTemplateComponent[];
  /** Texto do corpo com os {{1}}, {{2}}… como vieram da Meta. */
  corpo: string;
  /** Quantas variáveis o corpo espera. */
  totalVariaveis: number;
  /** Cabeçalho de mídia, quando o template tem um. */
  midiaCabecalho: 'IMAGE' | 'VIDEO' | 'DOCUMENT' | null;
}

export type StatusDisparo = 'pendente' | 'enviando' | 'concluido' | 'cancelado';
export type StatusEnvio = 'pendente' | 'enviado' | 'falhou' | 'pulado';

export interface WhatsappCampaign {
  id: string;
  nome: string;
  templateName: string;
  templateLanguage: string;
  previewTexto: string;
  variaveis: string[];
  midiaUrl: string;
  midiaTipo: string;
  destinatarioTipo: DestinatarioTipo;
  etapaAlvo?: number;
  funilAlvo?: GrupoFunil;
  tipoInteresseAlvo?: string;
  status: StatusDisparo;
  totalDestinatarios: number;
  enviados: number;
  falhas: number;
  criadoPorNome: string;
  criadoEm: string;
  concluidoEm?: string;
}

export interface WhatsappEnvio {
  id: string;
  nome: string;
  telefone: string;
  origem: string;
  status: StatusEnvio;
  erro?: string;
  enviadoEm?: string;
}

export interface WhatsappCampaignDetalhe extends WhatsappCampaign {
  envios: WhatsappEnvio[];
}

export interface WhatsappOptOut {
  id: string;
  nomeCorretor: string;
  imobiliaria: string;
  desdeEm?: string;
}

export interface CreateWhatsappCampaignPayload {
  templateName: string;
  templateLanguage: string;
  previewTexto: string;
  variaveis: string[];
  midiaUrl?: string;
  midiaTipo?: 'image' | 'video' | '';
  destinatarioTipo: DestinatarioTipo;
  etapaAlvo?: number;
  funilAlvo?: GrupoFunil;
  tipoInteresseAlvo?: string;
  corretorIds?: string[];
}

// ── Placar de metas (substitui a planilha "ACOMPANHAMENTO") ──────────

/** Como a atividade aconteceu — separa "presencial" de "vídeo chamada" nas linhas do placar. */
export type ModalidadeAtividade = 'PRESENCIAL' | 'VIDEO_CHAMADA' | 'TELEFONE' | 'MENSAGEM';

export type TemperaturaRodada = 'FRIA' | 'QUENTE';

export type CargoPlacar = 'SDR' | 'GR' | 'GV';

export interface DefinicaoMetrica {
  chave: string;
  label: string;
  grupo: string;
  cargo: CargoPlacar;
  porEmpreendimento: boolean;
  /**
   * Como ler o número. Ausente = contagem de ocorrências; 'moeda' = total, meta e quebra por
   * empreendimento estão em reais. Hoje só a linha de vendas fechadas.
   */
  formato?: 'moeda';
  /** Frase curta explicando de onde vem o número — mostrada como dica na tela. */
  explicacao: string;
  /**
   * Id do grupo de meta a que a linha pertence. A linha mostra o total próprio (é a quebra que
   * a Diretoria quer ver) mas não tem meta própria: a meta é do grupo, e quem a persegue é a
   * linha de soma, logo abaixo.
   */
  metaGrupo?: string;
  /** A meta desta linha é o total de outra, no mesmo mês — hoje só "Leads atendidos". */
  metaDerivadaDe?: string;
  /** A Diretoria digita a meta desta linha. Falso nas de grupo, nas derivadas e em vendas. */
  metaDigitada: boolean;
}

/** Conjunto de linhas que dividem uma meta — ver `metaGrupo` em DefinicaoMetrica. */
export interface GrupoDeMeta {
  id: string;
  label: string;
  cargo: CargoPlacar;
  grupo: string;
  explicacao: string;
}

/** O catálogo que a tela usa para montar os blocos: as linhas e os grupos de meta. */
export interface CatalogoPlacar {
  metricas: DefinicaoMetrica[];
  gruposMeta: GrupoDeMeta[];
}

export interface SemanaPlacar {
  numero: number;
  inicio: string;
  fim: string;
  dias: string[];
}

export interface ValorMetrica {
  chave: string;
  porDia: Record<string, number>;
  porEmpreendimento?: Record<string, number>;
  total: number;
  meta: number;
}

/**
 * Soma das linhas que dividem uma meta. Vira uma linha de total na tabela, logo abaixo das
 * linhas somadas: é nela que a meta é digitada e é ela que mostra Faltam e %.
 */
export interface ValorGrupoMeta {
  id: string;
  /** Chaves somadas, na ordem do catálogo — a última diz onde a linha de soma entra. */
  chaves: string[];
  porDia: Record<string, number>;
  total: number;
  meta: number;
}

export interface PlacarPessoa {
  userId: string;
  nome: string;
  cargo: CargoPlacar;
  cor: string;
  metricas: ValorMetrica[];
  gruposMeta: ValorGrupoMeta[];
}

export interface Placar {
  periodo: string;
  semanas: SemanaPlacar[];
  pessoas: PlacarPessoa[];
  /** Meta geral de vendas do mês e como ficou rateada entre os GVs. */
  metaVendas: {
    total: number;
    gvsAtivos: number;
    porGv: number;
  };
}
