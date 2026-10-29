import type { StageConfig, TarefaCadencia } from './types';

export const STAGES: StageConfig[] = [
  {
    id: 1,
    nome: 'Novo Corretor',
    nomeAbrev: 'Novo',
    responsavel: ['SDR', 'Sistema'],
    cor: '#64748b',
    corBg: '#f1f5f9',
    slaHoras: 0,
    slaLabel: 'Imediato',
    descricao: 'Corretor cadastrado aguardando primeiro contato',
  },
  {
    id: 2,
    nome: 'Tentativa de Contato',
    nomeAbrev: 'Contato',
    responsavel: ['SDR'],
    cor: '#3b82f6',
    corBg: '#eff6ff',
    slaHoras: 2,
    slaLabel: '2h',
    descricao: 'SDR deve ligar em até 2h após entrada',
  },
  {
    id: 3,
    nome: 'Qualificação',
    nomeAbrev: 'Qualif.',
    responsavel: ['SDR'],
    cor: '#10b981',
    corBg: '#ecfdf5',
    slaHoras: 24,
    slaLabel: '24h',
    descricao: 'Entender perfil, renda, interesse e treinamento',
  },
  {
    id: 4,
    nome: 'Nutrição / Cadência',
    nomeAbrev: 'Nutrição',
    responsavel: ['SDR', 'Automação'],
    cor: '#f59e0b',
    corBg: '#fffbeb',
    slaDias: 30,
    slaLabel: '30 dias',
    descricao: 'Cadência automática. Nova tentativa a cada 7 dias',
  },
  // A distribuição virou duas etapas: primeiro o GR, depois o GV. Por isso TUDO o que vem
  // depois subiu um número — ver a migração 20261029000000. O número da etapa é a posição no
  // funil em todo o sistema, então inserir no meio obriga a renumerar.
  {
    id: 5,
    nome: 'Distribuição GR',
    nomeAbrev: 'Distrib. GR',
    responsavel: ['SDR'],
    cor: '#8b5cf6',
    corBg: '#f5f3ff',
    slaHoras: 24,
    slaLabel: '24h',
    descricao: 'SDR atribui o Gerente de Relacionamento',
  },
  {
    id: 6,
    nome: 'Distribuição GV',
    nomeAbrev: 'Distrib. GV',
    responsavel: ['SDR'],
    cor: '#7c3aed',
    corBg: '#f5f3ff',
    slaHoras: 24,
    slaLabel: '24h',
    descricao: 'SDR atribui o Gerente de Vendas',
  },
  {
    id: 7,
    nome: 'Acompanhamento Gerente de Relacionamento',
    // Forma curta para selos e listas, onde o nome inteiro não cabe (no Dashboard a linha tem
    // 112px). Precisa acompanhar o `nome`, senão duas telas chamam a mesma etapa de coisas
    // diferentes.
    nomeAbrev: 'Acomp. GR',
    responsavel: ['GR', 'GV'],
    cor: '#0d9488',
    corBg: '#f0fdfa',
    slaDias: 7,
    slaLabel: 'Semanal',
    descricao: 'GR: relacionamento ativo | GV: monitoramento (paralelo)',
    paralelo: true,
  },
  {
    id: 8,
    nome: 'Monitoramento GV',
    nomeAbrev: 'Monitor.',
    responsavel: ['GV'],
    cor: '#0891b2',
    corBg: '#ecfeff',
    slaDias: 7,
    slaLabel: 'Semanal',
    descricao: 'GV acompanha sinais de venda em paralelo com etapa 6',
    paralelo: true,
  },
  {
    id: 9,
    nome: 'Negociação',
    nomeAbrev: 'Negoc.',
    responsavel: ['GV', 'GR'],
    cor: '#d55006',
    corBg: '#fff7ed',
    slaHoras: 48,
    slaLabel: '48h',
    descricao: 'GV apresenta proposta formal. GR mantém vínculo emocional',
  },
  {
    id: 10,
    nome: 'Fechamento',
    nomeAbrev: 'Fecha.',
    responsavel: ['GV', 'GR'],
    cor: '#059669',
    corBg: '#ecfdf5',
    slaHoras: 0,
    slaLabel: 'Imediato',
    descricao: 'Formalizar documentação e registrar como Ganho',
  },
  {
    id: 11,
    nome: 'Pós-venda / Fidelização',
    nomeAbrev: 'Pós-venda',
    responsavel: ['Ana', 'Lucimara'],
    cor: '#6366f1',
    corBg: '#eef2ff',
    slaDias: 30,
    slaLabel: 'Mensal',
    descricao: 'Fidelização, NPS e geração de indicações',
  },
];

export const EMPREENDIMENTOS = [
  'Jardins do Sul',
  'Residencial Nobre',
  'Vista Alto da Serra',
  'Bosque das Palmeiras',
  'Edifício Aurora',
];

export const CADENCIAS: Record<'SDR' | 'GR' | 'GV', TarefaCadencia[]> = {
  SDR: [
    { dia: 0, tipo: 'ligacao', label: 'Ligação de boas-vindas', descricao: 'Apresentar a PHACZ e entender o perfil do corretor', responsavel: 'SDR' },
    { dia: 1, tipo: 'whatsapp', label: 'WhatsApp de follow-up', descricao: 'Enviar material de apresentação e confirmar interesse', responsavel: 'SDR' },
    { dia: 3, tipo: 'email', label: 'E-mail de qualificação', descricao: 'Enviar convite para treinamento e portfólio PHACZ', responsavel: 'SDR' },
    { dia: 7, tipo: 'ligacao', label: '2ª ligação de retomada', descricao: 'Verificar interesse e agendar treinamento', responsavel: 'SDR' },
    { dia: 14, tipo: 'whatsapp', label: 'WhatsApp de retomada', descricao: 'Reengajar corretor com conteúdo relevante', responsavel: 'SDR' },
    { dia: 21, tipo: 'ligacao', label: 'Ligação final de cadência', descricao: 'Última tentativa antes de mover para nutrição', responsavel: 'SDR' },
  ],
  GR: [
    { dia: 0, tipo: 'reuniao', label: 'Reunião de apresentação', descricao: 'Apresentar GR e GV ao corretor, alinhar expectativas', responsavel: 'GR' },
    { dia: 3, tipo: 'visita', label: 'Visita ao empreendimento', descricao: 'Tour guiado pelo estande/empreendimento com o corretor', responsavel: 'GR' },
    { dia: 7, tipo: 'whatsapp', label: 'WhatsApp de relacionamento', descricao: 'Enviar novidades e manter contato próximo', responsavel: 'GR' },
    { dia: 14, tipo: 'visita', label: 'Evento de relacionamento', descricao: 'Almoço ou evento PHACZ com parceiros', responsavel: 'GR' },
    { dia: 21, tipo: 'ligacao', label: 'Ligação de acompanhamento', descricao: 'Verificar clientes interessados e status do corretor', responsavel: 'GR' },
    { dia: 30, tipo: 'nota', label: 'Avaliação do ciclo', descricao: 'Registrar NPS e decidir próximo passo', responsavel: 'GR' },
  ],
  GV: [
    { dia: 0, tipo: 'ligacao', label: '1º contato após repasse', descricao: 'GV inicia relacionamento com o corretor e identifica clientes', responsavel: 'GV' },
    { dia: 2, tipo: 'whatsapp', label: 'WhatsApp de apresentação', descricao: 'Enviar apresentação do portfólio e materiais de venda', responsavel: 'GV' },
    { dia: 5, tipo: 'reuniao', label: 'Reunião de proposta', descricao: 'Apresentar proposta formal ao corretor e cliente final', responsavel: 'GV' },
    { dia: 10, tipo: 'ligacao', label: 'Follow-up da proposta', descricao: 'Verificar pendências e objeções da proposta', responsavel: 'GV' },
    { dia: 15, tipo: 'whatsapp', label: 'Negociação final', descricao: 'Encaminhar documentação e fechar negócio', responsavel: 'GV' },
  ],
};

/**
 * Agrupamento das etapas em funis — fonte ÚNICA para o Pipeline e o Dashboard.
 *
 * Existia copiado em três lugares, com os números das etapas cravados em cada um. Quando a
 * Distribuição virou duas etapas e tudo depois dela foi renumerado, as três cópias ficaram
 * para trás em silêncio: a coluna de Pós-venda sumiu do quadro e a aba passou a contar 0.
 * Com uma definição só, a próxima mudança de etapa tem um lugar para acertar.
 */
/** `stages` é `number[]` e não tupla literal: as telas testam `stages.includes(etapa)`. */
export const FUNIS_DO_PIPELINE: Record<
  'pre-atendimento' | 'treinamento' | 'venda' | 'pos-venda',
  { label: string; cor: string; stages: number[] }
> = {
  'pre-atendimento': { label: 'Pré-atendimento', cor: '#8b5cf6', stages: [1, 2, 3, 4, 5, 6] },
  // As duas distribuições são trabalho do SDR, por isso entram no pré-atendimento.
  'treinamento': { label: 'Treinamento', cor: '#0d9488', stages: [7] },
  'venda': { label: 'Venda', cor: '#d55006', stages: [8, 9, 10] },
  'pos-venda': { label: 'Pós-venda', cor: '#6366f1', stages: [11] },
};

/** Todas as etapas, na ordem — o funil "Todos". */
export const TODAS_AS_ETAPAS: number[] = STAGES.map((s) => s.id);

/**
 * Colunas do quadro. Etapas marcadas como `paralelo` e vizinhas dividem a mesma coluna — hoje
 * o Acompanhamento GR e o Monitoramento GV, que acontecem ao mesmo tempo.
 *
 * Derivado de STAGES em vez de escrito à mão: era uma lista fixa, e ela também ficou para trás
 * na renumeração.
 */
export const COLUNAS_DO_PIPELINE: number[][] = STAGES.reduce<number[][]>((grupos, etapa) => {
  const ultimo = grupos[grupos.length - 1];
  const anterior = ultimo ? STAGES.find((s) => s.id === ultimo[ultimo.length - 1]) : undefined;
  if (ultimo && anterior?.paralelo && etapa.paralelo) ultimo.push(etapa.id);
  else grupos.push([etapa.id]);
  return grupos;
}, []);
