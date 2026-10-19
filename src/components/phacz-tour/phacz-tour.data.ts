/**
 * Roteiro do tutorial animado do CRM PHACZ (ver PhaczTour.tsx).
 *
 * Cada cena é uma TELA do sistema (um print) e uma sequência de PARADAS. A cada parada a
 * câmera aproxima um pedaço da tela, o cursor vai até lá, uma caixa destaca a área e uma dica
 * explica o que é aquilo.
 *
 * Coordenadas normalizadas (0–1) sobre prints de 1706×921:
 * - c:   onde o cursor para [x, y]
 * - b:   caixa de destaque [x, y, largura, altura]
 * - cam: câmera [escala, foco x, foco y] — escala 1 = tela inteira
 * - r:   a dica, em uma linha (o balão não quebra)
 *
 * Para trocar os prints: substitua os arquivos em `public/phacz-tour/` mantendo 1706×921 e
 * ajuste as coordenadas desta lista. O motor não precisa mudar.
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

export const TELA_LARGURA = 1706;
export const TELA_ALTURA = 921;

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
    'WhatsApp e e-mail',
    'Configurações',
  ],
  paradas: [
    // 1. Pipeline — o quadro onde o corretor caminha pelas 10 etapas.
    [
      { c: [0.04, 0.3], b: [0.004, 0.285, 0.13, 0.038], cam: [1, 0.07, 0.3], r: 'Pipeline: o funil de corretores' },
      { c: [0.36, 0.16], b: [0.16, 0.14, 0.68, 0.05], cam: [1.25, 0.36, 0.16], r: 'Os funis: pré-atendimento, treinamento, venda e pós-venda' },
      { c: [0.3, 0.42], b: [0.16, 0.22, 0.28, 0.6], cam: [1.35, 0.3, 0.42], r: 'Cada coluna é uma etapa — arraste o card para avançar' },
      { c: [0.25, 0.37], b: [0.17, 0.33, 0.25, 0.1], cam: [1.7, 0.25, 0.37], r: 'O card mostra nome, imobiliária e o que falta preencher' },
    ],
    // 2. Card do corretor — aba Geral.
    [
      { c: [0.78, 0.12], b: [0.63, 0.04, 0.36, 0.1], cam: [1.3, 0.78, 0.12], r: 'Clique no card para abrir o corretor' },
      { c: [0.78, 0.2], b: [0.64, 0.17, 0.34, 0.06], cam: [1.5, 0.78, 0.2], r: 'As setas movem o card de etapa' },
      { c: [0.78, 0.3], b: [0.64, 0.27, 0.34, 0.05], cam: [1.5, 0.78, 0.3], r: 'As abas: Geral, Clientes, Atividades, Propostas e Cadência' },
      { c: [0.78, 0.55], b: [0.64, 0.34, 0.34, 0.45], cam: [1.25, 0.78, 0.55], r: 'Dados do corretor — "Editar" libera os campos' },
    ],
    // 3. Atividades — o registro que alimenta o placar.
    [
      { c: [0.78, 0.37], b: [0.65, 0.34, 0.33, 0.05], cam: [1.5, 0.78, 0.37], r: 'Registrar atividade: ligação, visita, reunião, treinamento' },
      { c: [0.78, 0.47], b: [0.65, 0.41, 0.33, 0.12], cam: [1.4, 0.78, 0.47], r: 'Tipo, data e quem realizou — é quem leva no placar de metas' },
      { c: [0.78, 0.62], b: [0.65, 0.56, 0.33, 0.1], cam: [1.4, 0.78, 0.62], r: 'Anexe arquivos e áudios em qualquer atividade' },
      { c: [0.78, 0.8], b: [0.65, 0.7, 0.33, 0.2], cam: [1.3, 0.78, 0.8], r: 'O histórico fica abaixo — treinamento que caiu vira cancelado, com motivo' },
    ],
    // 4. Clientes finais.
    [
      { c: [0.04, 0.37], b: [0.004, 0.355, 0.13, 0.038], cam: [1, 0.07, 0.37], r: 'Clientes Finais: os compradores que os corretores trazem' },
      { c: [0.55, 0.1], b: [0.16, 0.07, 0.68, 0.06], cam: [1.35, 0.55, 0.1], r: 'Busque por nome, corretor ou imobiliária' },
      { c: [0.9, 0.1], b: [0.85, 0.075, 0.12, 0.045], cam: [1.6, 0.9, 0.1], r: 'Novo cliente — escolhendo o corretor responsável' },
      { c: [0.5, 0.5], b: [0.16, 0.18, 0.82, 0.65], cam: [1.2, 0.5, 0.5], r: 'A lista inteira, com o corretor de cada cliente' },
    ],
    // 5. Dashboard — Visão Geral.
    [
      { c: [0.04, 0.19], b: [0.004, 0.175, 0.13, 0.038], cam: [1, 0.07, 0.19], r: 'Dashboard: o resultado do funil em números' },
      { c: [0.55, 0.25], b: [0.16, 0.16, 0.82, 0.2], cam: [1.3, 0.55, 0.25], r: 'Corretores ativos, fechamentos, volume e conversão' },
      { c: [0.4, 0.62], b: [0.16, 0.42, 0.52, 0.42], cam: [1.3, 0.4, 0.62], r: 'O funil etapa a etapa' },
      { c: [0.84, 0.62], b: [0.7, 0.42, 0.28, 0.42], cam: [1.4, 0.84, 0.62], r: 'Temperatura e churn de treinamentos' },
    ],
    // 6. Placar de metas.
    [
      { c: [0.3, 0.14], b: [0.16, 0.12, 0.35, 0.05], cam: [1.5, 0.3, 0.14], r: 'Placar de Metas: o que substituiu a planilha' },
      { c: [0.55, 0.3], b: [0.16, 0.22, 0.82, 0.14], cam: [1.3, 0.55, 0.3], r: 'Um cartão por pessoa, com as metas já batidas' },
      { c: [0.55, 0.62], b: [0.16, 0.42, 0.82, 0.42], cam: [1.25, 0.55, 0.62], r: 'Cada linha por semana, total, meta, quanto falta e %' },
      { c: [0.86, 0.62], b: [0.76, 0.42, 0.22, 0.42], cam: [1.5, 0.86, 0.62], r: 'Linhas que dividem uma meta somam numa linha de total' },
    ],
    // 7. Agenda.
    [
      { c: [0.04, 0.52], b: [0.004, 0.505, 0.13, 0.038], cam: [1, 0.07, 0.52], r: 'Agenda: aniversários, compromissos e eventos' },
      { c: [0.62, 0.05], b: [0.55, 0.03, 0.18, 0.05], cam: [1.6, 0.62, 0.05], r: 'Novo evento — e quem foi captado nele' },
      { c: [0.5, 0.5], b: [0.16, 0.2, 0.82, 0.62], cam: [1.2, 0.5, 0.5], r: 'O mês inteiro, com a cor de cada responsável' },
      { c: [0.72, 0.5], b: [0.62, 0.44, 0.2, 0.08], cam: [1.8, 0.72, 0.5], r: 'Treinamento que caiu: registre o motivo sem sair daqui' },
    ],
    // 8. Calendário de rodadas.
    [
      { c: [0.04, 0.45], b: [0.004, 0.435, 0.13, 0.038], cam: [1, 0.07, 0.45], r: 'Calendário de Rodadas: as ações com imobiliárias' },
      { c: [0.9, 0.1], b: [0.84, 0.075, 0.13, 0.045], cam: [1.6, 0.9, 0.1], r: 'Nova rodada — o formulário tem 11 seções' },
      { c: [0.5, 0.5], b: [0.16, 0.2, 0.82, 0.62], cam: [1.2, 0.5, 0.5], r: 'Toda rodada nasce pendente da aprovação da Diretoria' },
    ],
    // 9. Empreendimentos e unidades.
    [
      { c: [0.04, 0.26], b: [0.004, 0.245, 0.13, 0.038], cam: [1, 0.07, 0.26], r: 'Empreendimentos: o produto que se vende' },
      { c: [0.5, 0.35], b: [0.16, 0.16, 0.82, 0.35], cam: [1.25, 0.5, 0.35], r: 'Obra, entrega, características e catálogo' },
      { c: [0.5, 0.72], b: [0.16, 0.55, 0.82, 0.3], cam: [1.3, 0.5, 0.72], r: 'As unidades, com metragem, valor e status' },
    ],
    // 10. Tabelas de custos.
    [
      { c: [0.04, 0.59], b: [0.004, 0.575, 0.13, 0.038], cam: [1, 0.07, 0.59], r: 'Tabelas de Custos: uma por empreendimento' },
      { c: [0.5, 0.5], b: [0.16, 0.18, 0.82, 0.65], cam: [1.2, 0.5, 0.5], r: 'Criada junto com o empreendimento, pronta para preencher' },
    ],
    // 11. Comunicação em massa.
    [
      { c: [0.04, 0.66], b: [0.004, 0.645, 0.13, 0.038], cam: [1, 0.07, 0.66], r: 'WhatsApp em massa: disparo para a base de parceiros' },
      { c: [0.5, 0.35], b: [0.16, 0.16, 0.82, 0.35], cam: [1.25, 0.5, 0.35], r: 'Escolha o público e o modelo aprovado pela Meta' },
      { c: [0.5, 0.72], b: [0.16, 0.55, 0.82, 0.3], cam: [1.3, 0.5, 0.72], r: 'O histórico mostra entregues e falhas, um a um' },
    ],
    // 12. Configurações.
    [
      { c: [0.04, 0.73], b: [0.004, 0.715, 0.13, 0.038], cam: [1, 0.07, 0.73], r: 'Configurações da Empresa' },
      { c: [0.5, 0.3], b: [0.16, 0.16, 0.82, 0.28], cam: [1.3, 0.5, 0.3], r: 'Canais de origem e tipos de interesse' },
      { c: [0.5, 0.65], b: [0.16, 0.45, 0.82, 0.4], cam: [1.25, 0.5, 0.65], r: 'Imobiliárias: busque antes de cadastrar, o CNPJ não se repete' },
      { c: [0.04, 0.8], b: [0.004, 0.785, 0.13, 0.038], cam: [1, 0.07, 0.8], r: 'Usuários: quem entra no sistema e com qual perfil' },
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
    '/phacz-tour/tela-12-configuracoes.png',
  ],
};
