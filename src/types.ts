export type Temperatura = 'quente' | 'morno' | 'frio';
export type StatusCorretor = 'ativo' | 'nutricao' | 'arquivado' | 'ganho' | 'perdido';
export type TipoInteracao = 'ligacao' | 'whatsapp' | 'email' | 'visita' | 'reuniao' | 'nota' | 'proposta';
export type TipoInteresse = string;
export type CanalOrigem = string;
export type UserCargo = 'Diretora' | 'GR' | 'GV' | 'SDR' | 'Marketing';

export interface UserProfile {
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

export type EmailBlockType = 'heading' | 'text' | 'image' | 'button' | 'divider' | 'spacer';
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

export type EmailBlock = HeadingBlock | TextBlock | ImageBlock | ButtonBlock | DividerBlock | SpacerBlock;

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

// ── PHACZ IA ────────────────────────────────────────────────────────

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  criadoEm: string;
}
