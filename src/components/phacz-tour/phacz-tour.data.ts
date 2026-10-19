/**
 * Roteiro do tutorial animado do CRM PHACZ (ver PhaczTour.tsx).
 *
 * Cada cena é uma TELA do sistema (um print) e uma sequência de PARADAS. A cada parada a
 * câmera aproxima um pedaço da tela, o cursor vai até lá, uma caixa destaca a área e uma dica
 * explica o que é aquilo.
 *
 * Coordenadas normalizadas (0–1) sobre os prints de ~1919×908 (variam ±3px):
 * - c:   onde o cursor para [x, y]
 * - b:   caixa de destaque [x, y, largura, altura]
 * - cam: câmera [escala, foco x, foco y] — escala 1 = tela inteira
 * - r:   a dica, em uma linha (o balão não quebra)
 *
 * Para trocar um print: substitua o arquivo em `public/phacz-tour/` mantendo a proporção
 * 1919:908 e confira as coordenadas daquela cena. O motor não muda.
 */

export interface PhaczTourParada {
  c: [number, number];
  b: [number, number, number, number];
  cam: [number, number, number];
  r: string;
}

export interface PhaczTourDados {
  /** Nome de cada tela, na ordem — aparece no selo e na barra de progresso. */
  leg: string[];
  paradas: PhaczTourParada[][];
  telas: string[];
}

/** Duração de cada parada (ms). */
export const PASSO = 2600;
/** Duração do movimento de câmera/cursor até a parada (ms). */
export const MOVE = 700;
/** Tempo da tela final antes de parar (ms). */
export const FIM = 3500;

export const TELA_LARGURA = 1919;
export const TELA_ALTURA = 908;

export const PHACZ_TOUR_DADOS: PhaczTourDados = {
  leg: [
    'Pipeline',
    'Card do corretor',
    'Atividades',
    'Clientes finais',
    'Dashboard',
    'Placar de metas',
    'Agenda',
    'Calendário de rodadas',
    'Empreendimentos',
    'Tabelas de custos',
    'WhatsApp em massa',
    'E-mail marketing',
    'Configurações',
    'Usuários',
    'PHACZ IA',
  ],
  paradas: [
    // 1. Pipeline — o quadro onde o corretor caminha pelas 10 etapas.
    [
      { c: [0.073, 0.332], b: [0.006, 0.308, 0.134, 0.048], cam: [1, 0.073, 0.332], r: 'Pipeline: o funil de corretores' },
      { c: [0.37, 0.124], b: [0.164, 0.105, 0.412, 0.039], cam: [1.4, 0.37, 0.124], r: 'Os funis: pré-atendimento, treinamento, venda e pós-venda' },
      { c: [0.238, 0.4], b: [0.159, 0.215, 0.158, 0.402], cam: [1.35, 0.238, 0.4], r: 'Cada coluna é uma etapa — arraste o card para avançar' },
      { c: [0.238, 0.383], b: [0.164, 0.319, 0.147, 0.127], cam: [1.8, 0.238, 0.383], r: 'O card mostra o que falta preencher antes de avançar' },
      { c: [0.94, 0.046], b: [0.895, 0.026, 0.092, 0.040], cam: [1.6, 0.9, 0.05], r: 'Novo Corretor: cadastro simplificado ou completo' },
    ],
    // 2. Card do corretor — aba Geral.
    [
      { c: [0.8, 0.05], b: [0.612, 0.022, 0.378, 0.055], cam: [1.3, 0.8, 0.09], r: 'Clique no card para abrir o corretor' },
      { c: [0.8, 0.123], b: [0.615, 0.090, 0.374, 0.066], cam: [1.45, 0.8, 0.123], r: 'As setas movem o card de etapa' },
      { c: [0.8, 0.2], b: [0.615, 0.163, 0.375, 0.074], cam: [1.4, 0.8, 0.2], r: 'Ou salte direto para qualquer etapa' },
      { c: [0.75, 0.327], b: [0.618, 0.308, 0.279, 0.039], cam: [1.5, 0.75, 0.327], r: 'Geral, Clientes, Atividades, Propostas e Cadência' },
      { c: [0.95, 0.392], b: [0.913, 0.374, 0.078, 0.039], cam: [1.8, 0.92, 0.392], r: '"Editar dados" libera os campos para alteração' },
      { c: [0.8, 0.72], b: [0.618, 0.474, 0.372, 0.517], cam: [1.2, 0.8, 0.72], r: 'Telefone, WhatsApp, imobiliária, CPF e CRECI' },
    ],
    // 3. Atividades — o registro que alimenta o placar de metas.
    [
      { c: [0.748, 0.328], b: [0.713, 0.308, 0.070, 0.040], cam: [1.7, 0.748, 0.328], r: 'A aba Atividades guarda o histórico do card' },
      { c: [0.8, 0.405], b: [0.614, 0.380, 0.375, 0.050], cam: [1.45, 0.8, 0.405], r: 'Registrar atividade: ligação, visita, reunião, treinamento' },
      { c: [0.8, 0.507], b: [0.614, 0.454, 0.375, 0.106], cam: [1.4, 0.8, 0.507], r: 'Cada movimento do card vira um registro, com autor e data' },
      { c: [0.8, 0.49], b: [0.614, 0.374, 0.375, 0.243], cam: [1.25, 0.8, 0.49], r: 'Anexe arquivos e áudios — e cancele o treinamento que não aconteceu' },
    ],
    // 4. Clientes finais.
    [
      { c: [0.073, 0.492], b: [0.006, 0.468, 0.134, 0.048], cam: [1, 0.073, 0.492], r: 'Clientes Finais: os compradores que os corretores trazem' },
      { c: [0.82, 0.052], b: [0.745, 0.031, 0.151, 0.042], cam: [1.7, 0.82, 0.052], r: 'Busque por cliente, corretor ou imobiliária' },
      { c: [0.945, 0.052], b: [0.900, 0.031, 0.089, 0.042], cam: [1.8, 0.945, 0.052], r: 'Novo Cliente — escolhendo o corretor responsável' },
      { c: [0.57, 0.4], b: [0.156, 0.110, 0.834, 0.573], cam: [1.2, 0.57, 0.4], r: 'Contato e corretor de cada cliente, com atalho de WhatsApp' },
    ],
    // 5. Dashboard — Visão Geral.
    [
      { c: [0.073, 0.387], b: [0.006, 0.362, 0.134, 0.049], cam: [1, 0.073, 0.387], r: 'Dashboard: o resultado do funil em números' },
      { c: [0.57, 0.284], b: [0.164, 0.181, 0.818, 0.205], cam: [1.3, 0.57, 0.284], r: 'Corretores ativos, fechamentos, volume e conversão' },
      { c: [0.57, 0.493], b: [0.164, 0.417, 0.818, 0.152], cam: [1.35, 0.57, 0.493], r: 'Quantos corretores em cada funil' },
      { c: [0.43, 0.78], b: [0.164, 0.598, 0.541, 0.392], cam: [1.25, 0.43, 0.78], r: 'O funil etapa a etapa, da entrada ao pós-venda' },
      { c: [0.85, 0.78], b: [0.718, 0.598, 0.266, 0.392], cam: [1.4, 0.85, 0.78], r: 'Temperatura da base e os corretores mais quentes' },
    ],
    // 6. Placar de metas.
    [
      { c: [0.3, 0.124], b: [0.162, 0.105, 0.284, 0.039], cam: [1.5, 0.3, 0.124], r: 'Dashboard: Placar de Metas, Visão Geral e os funis' },
      { c: [0.57, 0.259], b: [0.163, 0.226, 0.827, 0.066], cam: [1.35, 0.57, 0.259], r: 'A meta do mês em reais, dividida entre os GVs ativos' },
      { c: [0.57, 0.52], b: [0.163, 0.322, 0.827, 0.400], cam: [1.2, 0.57, 0.52], r: 'Um cartão por pessoa, com as metas já batidas' },
      { c: [0.57, 0.86], b: [0.163, 0.740, 0.827, 0.255], cam: [1.3, 0.57, 0.86], r: 'Cada métrica por semana, total, meta, quanto falta e %' },
    ],
    // 7. Agenda.
    [
      { c: [0.073, 0.648], b: [0.006, 0.623, 0.134, 0.049], cam: [1, 0.073, 0.648], r: 'Agenda: aniversários, compromissos e eventos' },
      { c: [0.587, 0.05], b: [0.550, 0.031, 0.076, 0.037], cam: [1.8, 0.587, 0.05], r: 'Novo evento — e depois, quem foi captado nele' },
      { c: [0.57, 0.225], b: [0.162, 0.196, 0.828, 0.057], cam: [1.4, 0.57, 0.225], r: 'Aniversário, compromisso, evento e cancelado' },
      { c: [0.575, 0.6], b: [0.164, 0.270, 0.823, 0.650], cam: [1.15, 0.575, 0.6], r: 'O mês inteiro, com a cor de cada responsável' },
    ],
    // 8. Calendário de rodadas.
    [
      { c: [0.073, 0.595], b: [0.006, 0.570, 0.134, 0.049], cam: [1, 0.073, 0.595], r: 'Calendário de Rodadas: as ações com imobiliárias' },
      { c: [0.94, 0.048], b: [0.895, 0.029, 0.094, 0.039], cam: [1.8, 0.94, 0.048], r: 'Nova rodada — o formulário tem 11 seções' },
      { c: [0.836, 0.048], b: [0.781, 0.029, 0.111, 0.039], cam: [1.7, 0.836, 0.048], r: 'Veja como calendário ou como lista' },
      { c: [0.575, 0.48], b: [0.164, 0.198, 0.823, 0.567], cam: [1.2, 0.575, 0.48], r: 'Toda rodada nasce pendente da aprovação da Diretoria' },
    ],
    // 9. Empreendimentos.
    [
      { c: [0.073, 0.543], b: [0.006, 0.519, 0.134, 0.048], cam: [1, 0.073, 0.543], r: 'Empreendimentos: o produto que se vende' },
      { c: [0.835, 0.074], b: [0.774, 0.051, 0.122, 0.046], cam: [1.7, 0.835, 0.074], r: 'Marketing cadastra e edita os empreendimentos' },
      { c: [0.575, 0.5], b: [0.250, 0.138, 0.649, 0.738], cam: [1.15, 0.575, 0.5], r: 'Cada empreendimento com foto, cidade e unidades' },
      { c: [0.355, 0.837], b: [0.251, 0.804, 0.208, 0.066], cam: [1.7, 0.355, 0.837], r: 'Total de unidades e quantas seguem disponíveis' },
    ],
    // 10. Tabelas de custos.
    [
      { c: [0.073, 0.672], b: [0.006, 0.647, 0.134, 0.050], cam: [1, 0.073, 0.672], r: 'Tabelas de Custos: uma por empreendimento' },
      { c: [0.39, 0.3], b: [0.164, 0.133, 0.450, 0.337], cam: [1.3, 0.39, 0.3], r: 'Criada junto com o empreendimento, pronta para preencher' },
      { c: [0.94, 0.047], b: [0.892, 0.026, 0.097, 0.042], cam: [1.8, 0.94, 0.047], r: 'Ou crie uma tabela avulsa' },
    ],
    // 11. WhatsApp em massa.
    [
      { c: [0.073, 0.512], b: [0.006, 0.487, 0.134, 0.049], cam: [1, 0.073, 0.512], r: 'WhatsApp em massa: comunicados para a base de corretores' },
      { c: [0.82, 0.075], b: [0.775, 0.051, 0.087, 0.048], cam: [1.7, 0.82, 0.075], r: 'Novo disparo: escolha o template e o público' },
      { c: [0.575, 0.32], b: [0.289, 0.268, 0.573, 0.105], cam: [1.35, 0.575, 0.32], r: 'Usa template aprovado na Meta — exigência para iniciar conversa' },
      { c: [0.575, 0.19], b: [0.289, 0.138, 0.573, 0.102], cam: [1.35, 0.575, 0.19], r: 'O número dedicado ao disparo é configurado no servidor' },
    ],
    // 12. E-mail marketing.
    [
      { c: [0.073, 0.346], b: [0.006, 0.322, 0.134, 0.049], cam: [1, 0.073, 0.346], r: 'E-mail Marketing: monte e dispare campanhas' },
      { c: [0.86, 0.076], b: [0.821, 0.053, 0.078, 0.046], cam: [1.8, 0.86, 0.076], r: 'Editor visual de arrastar e soltar' },
      { c: [0.575, 0.195], b: [0.251, 0.139, 0.648, 0.112], cam: [1.35, 0.575, 0.195], r: 'Modelos criados, campanhas enviadas e alcance' },
      { c: [0.33, 0.314], b: [0.251, 0.289, 0.160, 0.051], cam: [1.6, 0.33, 0.314], r: 'Campanhas enviadas e modelos salvos' },
    ],
    // 13. Configurações da empresa.
    [
      { c: [0.073, 0.771], b: [0.006, 0.747, 0.134, 0.048], cam: [1, 0.073, 0.771], r: 'Configurações da Empresa' },
      { c: [0.575, 0.32], b: [0.326, 0.154, 0.497, 0.330], cam: [1.3, 0.575, 0.32], r: 'Nome, CNPJ e o Encarregado de Dados (LGPD)' },
      { c: [0.575, 0.86], b: [0.326, 0.771, 0.497, 0.224], cam: [1.35, 0.575, 0.86], r: 'Canais de origem, tipos de interesse e imobiliárias' },
    ],
    // 14. Usuários.
    [
      { c: [0.073, 0.718], b: [0.006, 0.693, 0.134, 0.050], cam: [1, 0.073, 0.718], r: 'Usuários: quem entra no sistema' },
      { c: [0.77, 0.296], b: [0.731, 0.275, 0.080, 0.042], cam: [1.7, 0.77, 0.296], r: 'Novo usuário — só a Diretoria gerencia acessos' },
      { c: [0.575, 0.369], b: [0.339, 0.336, 0.471, 0.066], cam: [1.6, 0.575, 0.369], r: 'Diretora, GV, GR, SDR, Marketing, Recepção e Administrativo' },
      { c: [0.575, 0.66], b: [0.339, 0.336, 0.469, 0.655], cam: [1.2, 0.575, 0.66], r: 'O perfil define o que cada pessoa pode fazer' },
    ],
    // 15. PHACZ IA.
    [
      { c: [0.073, 0.846], b: [0.006, 0.821, 0.134, 0.050], cam: [1, 0.073, 0.846], r: 'PHACZ IA: pergunte em linguagem natural' },
      { c: [0.48, 0.05], b: [0.350, 0.022, 0.265, 0.057], cam: [1.5, 0.48, 0.05], r: 'Assistente que consulta os dados reais do CRM' },
      { c: [0.575, 0.53], b: [0.426, 0.422, 0.301, 0.215], cam: [1.45, 0.575, 0.53], r: 'Sugestões prontas para começar' },
      { c: [0.575, 0.93], b: [0.350, 0.939, 0.455, 0.050], cam: [1.5, 0.575, 0.93], r: 'Pergunte sobre corretores, clientes, funis ou propostas' },
    ],
  ],
  telas: [
    '/phacz-tour/tela-01-pipeline.png',
    '/phacz-tour/tela-02-card-corretor.png',
    '/phacz-tour/tela-03-atividades.png',
    '/phacz-tour/tela-04-clientes.png',
    '/phacz-tour/tela-05-dashboard.png',
    '/phacz-tour/tela-06-placar.png',
    '/phacz-tour/tela-07-agenda.png',
    '/phacz-tour/tela-08-rodadas.png',
    '/phacz-tour/tela-09-empreendimentos.png',
    '/phacz-tour/tela-10-tabelas.png',
    '/phacz-tour/tela-11-whatsapp.png',
    '/phacz-tour/tela-12-email.png',
    '/phacz-tour/tela-13-configuracoes.png',
    '/phacz-tour/tela-14-usuarios.png',
    '/phacz-tour/tela-15-ia.png',
  ],
};
