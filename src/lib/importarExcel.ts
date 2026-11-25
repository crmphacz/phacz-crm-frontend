import type { Sheet, Cell, CellWithRowAndCol, Image } from '@fortune-sheet/core';
import { update } from '@fortune-sheet/core';
import { extrasDoXlsx, regraBate, type MedidasDaAba, type RegraCondicional } from './extrasDoXlsx';

export { nomesDasAbas } from './extrasDoXlsx';

/**
 * Importação de um .xlsx para o formato do editor de planilhas (fortune-sheet).
 *
 * A conversão em si é do LuckyExcel, que lê o XML do arquivo e devolve o JSON do luckysheet —
 * o mesmo formato que o fortune-sheet usa. Ele já traz o que mais importa para a planilha
 * continuar parecida com a do Excel: mesclagens, bordas, preenchimentos, fontes, alinhamento,
 * formatos numéricos, larguras de coluna e alturas de linha, em todas as abas.
 *
 * O que ele NÃO traz, e é completado aqui, é o que fazia a planilha importada parecer outra:
 *
 *   1. Todo número chega como TEXTO ("4224493.11"), sem o tipo e sem o texto de exibição. A
 *      célula entrava alinhada à esquerda, sem "R$", e qualquer fórmula sobre ela dava erro.
 *   2. As imagens vêm sempre vazias — são os dois logos do cabeçalho da tabela da cliente.
 *   3. Os painéis congelados se perdem.
 *   4. O tamanho da grade não vem, e a planilha abria cortada no fim dos dados.
 *
 * O que não atravessa, em nenhum caminho: formatação condicional, gráficos, tabelas dinâmicas,
 * validação de dados, filtros e comentários. Os valores e a aparência das células vêm; esses
 * recursos precisam ser refeitos no editor.
 */

/** Tamanho acima do qual o navegador trava convertendo e o servidor recusa o salvamento. */
export const TAMANHO_MAXIMO_BYTES = 20 * 1024 * 1024;

/**
 * Teto do backend para o diff de células (ver saveSchema em tabelasEmpreendimentos/routes).
 *
 * Conta só as células COM CONTEÚDO, que são as que o backend audita. A pasta de trabalho da
 * cliente tem 1,3 milhão de células segundo o conversor e apenas 35 mil com algum valor — o
 * resto é formatação espalhada por linhas vazias. Medir pelo número bruto reprovava um
 * arquivo perfeitamente importável, e ainda mandava a pessoa "separar em mais de um arquivo",
 * que não resolveria nada.
 */
const MAXIMO_DE_CELULAS = 200_000;

/**
 * Orçamento para o JSON das abas, em caracteres.
 *
 * O servidor aceita 48 MB de corpo (ver app.ts). O que sai daqui é só a parte `dados`; a lista
 * de células auditadas vai junto e pesa alguns MB a mais, e os acentos custam um byte extra
 * cada um no caminho. 38 milhões de caracteres deixam essa margem coberta.
 */
const ORCAMENTO_DO_CORPO = 38 * 1024 * 1024;

export interface PlanilhaImportada {
  sheets: Sheet[];
  /** Nome do arquivo sem a extensão — vira o nome da tabela. */
  nomeSugerido: string;
  /** Células com algum valor ou fórmula — é o que o backend audita. */
  totalCelulas: number;
  totalImagens: number;
  /** Abas que existiam no arquivo e ficaram de fora por escolha de quem importou. */
  abasIgnoradas: number;
  /** O que não veio como no Excel, para a tela avisar em vez de deixar a pessoa descobrir. */
  avisos: string[];
}

export interface OpcoesDeImportacao {
  /** Quais abas trazer. Ausente = todas. */
  abas?: string[];
}

/** Erro de importação com texto pronto para a tela — tudo aqui é problema do arquivo, não bug. */
export class ErroDeImportacao extends Error {}

// ── Formatação ───────────────────────────────────────────────────────

/**
 * Um formato de data? "m" sozinho é minuto ou mês; dentro de aspas é texto literal.
 *
 * Importa porque datas NÃO podem ter os separadores trocados logo abaixo: "15/03/2023" já está
 * certo, e trocar vírgula por ponto num formato "d/m/yyyy, h:mm" estragaria a hora.
 */
function pareceFormatoDeData(fa: string): boolean {
  return /[ymdhs]/i.test(fa.replace(/"[^"]*"/g, ''));
}

/**
 * Troca os separadores de milhar e decimal para a convenção brasileira.
 *
 * O formatador que vem do fortune-sheet é fixo em en-US: ele escreve "R$ 4,224,493.11" onde a
 * tabela da cliente diz "R$ 4.224.493,11". Como a troca é simétrica, uma passada só com os dois
 * casos resolve — fazer em dois `replace` encadeados transformaria tudo em vírgula.
 */
function paraPadraoBrasileiro(texto: string): string {
  return texto.replace(/[.,]/g, (ch) => (ch === ',' ? '.' : ','));
}

/** O texto que a célula deve mostrar, a partir do formato do Excel e do valor. */
export function textoExibido(formato: string, valor: number): string {
  let formatado: unknown;
  try {
    formatado = update(formato, valor);
  } catch {
    formatado = null;
  }
  if (typeof formatado !== 'string' || formatado === '') return String(valor);
  if (pareceFormatoDeData(formato)) return formatado;
  return paraPadraoBrasileiro(formatado);
}

// ── Células ──────────────────────────────────────────────────────────

type CelulaBruta = Cell & { ct?: { fa?: string; t?: string; s?: unknown }; rt?: number };

/**
 * Texto de várias linhas dentro de UMA célula — na tabela da cliente, as dez cláusulas
 * comerciais no rodapé da folha.
 *
 * O Excel guarda isso como "inline string", e o LuckyExcel entrega os pedaços em `ct.s`
 * deixando `v` vazio. A planilha até desenha o texto a partir de `ct.s`, mas tudo que LÊ a
 * célula — a auditoria, o BI, a busca — encontrava uma célula em branco no lugar do bloco
 * inteiro. Era a única perda de conteúdo, e silenciosa.
 */
function textoDosPedacos(ct: CelulaBruta['ct']): string | null {
  if (!Array.isArray(ct?.s)) return null;
  const texto = ct.s.map((p) => String((p as { v?: unknown })?.v ?? '')).join('');
  return texto === '' ? null : texto;
}

/**
 * Devolve a célula pronta para o editor.
 *
 * O ponto da função é o número: o LuckyExcel entrega `v: "4224493.11"` — uma string, sem
 * `ct.t` e sem `m`. Para o editor isso é texto, então a célula encostava à esquerda, ignorava o
 * formato de moeda e não entrava em soma nenhuma. Aqui ela volta a ser número, com o texto de
 * exibição calculado a partir do formato que veio do Excel.
 */
export function normalizarCelula(bruta: CelulaBruta): Cell {
  const celula: CelulaBruta = { ...bruta };
  const tipo = celula.ct?.t;

  // Mantém `ct.s`: se o editor desenhar pelos pedaços, o formato rico continua; se ignorar,
  // ainda aparece o texto puro. De um jeito ou de outro, nada se perde.
  if (celula.v === undefined || celula.v === null || celula.v === '') {
    const texto = textoDosPedacos(celula.ct);
    if (texto !== null) {
      celula.v = texto;
      celula.m = texto;
    }
  }

  // `rt` é o ÂNGULO e `tr` é o MODO de rotação. O LuckyExcel preenche o ângulo (90) e deixa o
  // modo em 0, que para o editor quer dizer "sem rotação" — e o rótulo da tipologia, que no
  // Excel sobe pela lateral da tabela, era desenhado deitado numa coluna de seis caracteres.
  if (Number(celula.rt ?? 0) !== 0 && !celula.tr) celula.tr = '1';

  // `t: 's'` é string declarada pelo Excel: "0102" é um código de apartamento, não o número
  // 102, e convertê-lo apagaria o zero da frente.
  if (tipo !== 's' && typeof celula.v === 'string' && celula.v.trim() !== '') {
    const numero = Number(celula.v);
    if (Number.isFinite(numero)) {
      celula.v = numero;
      celula.ct = { ...celula.ct, t: 'n' };
      if (celula.m === undefined || celula.m === null) {
        celula.m = textoExibido(celula.ct.fa ?? 'General', numero);
      }
    }
  }

  return celula as Cell;
}

// ── Abas ─────────────────────────────────────────────────────────────

const LARGURA_PADRAO = 73;
const ALTURA_PADRAO = 19;

interface AbaBruta {
  name?: string;
  celldata?: { r: number; c: number; v: CelulaBruta | null }[];
  config?: Record<string, unknown>;
  defaultColWidth?: number;
  defaultRowHeight?: number;
  showGridLines?: boolean | number;
  zoomRatio?: number;
}

function medidasDaAba(aba: AbaBruta): MedidasDaAba {
  const config = (aba.config ?? {}) as {
    columnlen?: Record<string, number>;
    rowlen?: Record<string, number>;
  };
  const larguraPadrao = aba.defaultColWidth || LARGURA_PADRAO;
  const alturaPadrao = aba.defaultRowHeight || ALTURA_PADRAO;
  return {
    larguraColuna: (c) => config.columnlen?.[String(c)] ?? larguraPadrao,
    alturaLinha: (r) => config.rowlen?.[String(r)] ?? alturaPadrao,
  };
}

/**
 * A célula tem conteúdo?
 *
 * O terceiro caso é a armadilha: num TEXTO RICO — um parágrafo com trechos de formatação
 * diferente — o conversor deixa `v` vazio e põe os pedaços em `ct.s`. Olhar só para `v`
 * declarava a célula vazia, e a poda jogava fora justamente o bloco das dez cláusulas
 * comerciais no rodapé da tabela da cliente (1.676 caracteres em quatro trechos).
 *
 * É a mesma razão de `textoDosPedacos` existir. A diferença é o momento: aqui a célula ainda
 * está crua, antes de `normalizarCelula` preencher `v` a partir dos pedaços.
 */
function temConteudo(v: CelulaBruta): boolean {
  if (typeof v.f === 'string' && v.f !== '') return true;
  if (v.v !== undefined && v.v !== null && v.v !== '') return true;
  return Array.isArray(v.ct?.s) && v.ct.s.length > 0;
}

/**
 * A célula mostra alguma coisa, mesmo vazia?
 *
 * Preenchimento, negrito, itálico, sublinhado, tachado, rotação, cor de fonte diferente do
 * preto e comentário — tudo que se enxerga sem haver texto. As BORDAS não entram: elas moram
 * em `config.borderInfo`, fora das células, e por isso sobrevivem à poda.
 */
function temAparencia(v: CelulaBruta): boolean {
  if (v.bg) return true;
  if (v.bl || v.it || v.un || v.cl) return true;
  if (v.tr || v.rt) return true;
  if (v.ps) return true;
  return Boolean(v.fc && v.fc !== '#000000');
}

/**
 * Converte uma aba, joga fora o que não existe e dimensiona a grade.
 *
 * A poda é o que torna um arquivo real importável. O Excel guarda formatação por linha e por
 * coluna inteira, e o conversor materializa isso célula a célula: a pasta de trabalho da
 * cliente vira 1,3 MILHÃO de células, das quais 35 mil têm valor, 111 mil têm alguma aparência
 * e 1,19 milhão não têm nem uma coisa nem outra — são o tipo e o tamanho padrão da fonte
 * repetidos por linhas vazias. Em JSON isso é a diferença entre 163 MB e 29 MB; sem a poda, o
 * navegador engasga e o salvamento é recusado antes de sair.
 *
 * Nada do que se vê é descartado: a célula só sai se não tiver conteúdo NEM aparência.
 *
 * O LuckyExcel também não preenche `row`/`column`, e sem eles o editor abre com a grade padrão:
 * numa aba que vai até a linha 300, a planilha aparecia cortada e o resto dos dados ficava
 * inalcançável, embora salvo.
 */
function normalizarAba(bruta: AbaBruta, indice: number): Sheet {
  const celulas: CellWithRowAndCol[] = [];
  let ultimaLinha = 0;
  let ultimaColuna = 0;

  for (const cd of bruta.celldata ?? []) {
    if (!cd || typeof cd.r !== 'number' || typeof cd.c !== 'number') continue;
    if (!cd.v || (!temConteudo(cd.v) && !temAparencia(cd.v))) continue;
    // A extensão da grade é medida DEPOIS da poda, de propósito: uma linha 900 que só carrega
    // a fonte padrão não é conteúdo, e esticar a planilha até lá só cria rolagem vazia.
    ultimaLinha = Math.max(ultimaLinha, cd.r);
    ultimaColuna = Math.max(ultimaColuna, cd.c);
    celulas.push({ r: cd.r, c: cd.c, v: normalizarCelula(cd.v) });
  }

  return {
    ...bruta,
    name: bruta.name || `Planilha ${indice + 1}`,
    id: `aba_${indice}`,
    order: indice,
    status: indice === 0 ? 1 : 0,
    celldata: celulas,
    config: (bruta.config ?? {}) as Sheet['config'],
    // Os mínimos são os mesmos da aba em branco do editor (ver abaVazia): uma planilha
    // importada não pode abrir com menos espaço para trabalhar do que uma criada do zero.
    row: Math.max(200, ultimaLinha + 30),
    column: Math.max(30, ultimaColuna + 10),
  } as Sheet;
}

/**
 * Carimba nas células a cor que a formatação condicional pintaria.
 *
 * Na tabela da cliente é o sinal que a equipe lê primeiro: "RESERVADO" em vermelho,
 * "DISPONIVEL" em verde sobre verde-claro, na coluna DISPONIBILIDADE. O editor não tem as
 * regras do Excel, e sem este carimbo a coluna inteira chegava preta — a planilha vinha certa
 * nos números e cega justamente onde se decide o que ainda dá para vender.
 *
 * A diferença que isto introduz, e que vale saber: a cor vira ESTÁTICA. Trocar "RESERVADO" por
 * "DISPONIVEL" na célula depois de importada não repinta sozinho, como repintaria no Excel.
 *
 * As regras são aplicadas da MENOR para a MAIOR precedência (no Excel, prioridade 1 é a mais
 * forte), então a mais forte escreve por último e vence — a mesma ordem de desempate do Excel.
 */
function aplicarCondicionais(sheet: Sheet, regras: RegraCondicional[]): void {
  const porPosicao = new Map<string, CellWithRowAndCol>();
  for (const cd of sheet.celldata ?? []) porPosicao.set(`${cd.r}_${cd.c}`, cd);

  for (const regra of [...regras].sort((a, b) => b.prioridade - a.prioridade)) {
    for (const posicao of regra.alcance) {
      const cd = porPosicao.get(posicao);
      if (!cd?.v) continue;

      const texto = String((cd.v as Cell).m ?? (cd.v as Cell).v ?? '');
      if (texto === '' || !regraBate(regra, texto)) continue;

      // No Excel a regra condicional se sobrepõe à formatação direta da célula.
      Object.assign(cd.v, regra.formato);
    }
  }
}

// ── Conversão ────────────────────────────────────────────────────────

/**
 * Trava de segurança: o LuckyExcel não tem callback de erro e some em silêncio num zip ruim.
 *
 * Folgado de propósito. A pasta de trabalho da cliente — 5 MB, 85 abas — leva perto de um
 * minuto e meio só na conversão. Um limite apertado transformaria um arquivo grande, porém
 * legítimo, em "arquivo corrompido".
 */
const TEMPO_LIMITE_MS = 10 * 60 * 1000;

interface JsonDoLuckyExcel {
  sheets?: AbaBruta[];
}

function converterComLuckyExcel(arquivo: File): Promise<JsonDoLuckyExcel> {
  return new Promise((resolve, reject) => {
    let respondeu = false;
    const relogio = setTimeout(() => {
      if (respondeu) return;
      respondeu = true;
      reject(new ErroDeImportacao('A conversão demorou demais. O arquivo pode estar corrompido ou grande demais.'));
    }, TEMPO_LIMITE_MS);

    import('luckyexcel')
      .then(({ default: LuckyExcel }) => {
        LuckyExcel.transformExcelToLucky(arquivo, (json) => {
          if (respondeu) return;
          respondeu = true;
          clearTimeout(relogio);
          resolve((json ?? {}) as JsonDoLuckyExcel);
        });
      })
      .catch((e) => {
        if (respondeu) return;
        respondeu = true;
        clearTimeout(relogio);
        reject(e);
      });
  });
}

export async function importarExcel(
  arquivo: File,
  opcoes: OpcoesDeImportacao = {}
): Promise<PlanilhaImportada> {
  if (!/\.xlsx$/i.test(arquivo.name)) {
    throw new ErroDeImportacao(
      'Só dá para importar arquivos .xlsx. Se a planilha estiver em .xls ou .csv, abra no Excel e use "Salvar como → Pasta de Trabalho do Excel (.xlsx)".'
    );
  }
  if (arquivo.size > TAMANHO_MAXIMO_BYTES) {
    throw new ErroDeImportacao(
      `O arquivo tem ${(arquivo.size / 1024 / 1024).toFixed(1)} MB e o limite é ${TAMANHO_MAXIMO_BYTES / 1024 / 1024} MB.`
    );
  }

  const json = await converterComLuckyExcel(arquivo);
  const brutas = Array.isArray(json.sheets) ? json.sheets : [];
  if (brutas.length === 0) {
    throw new ErroDeImportacao('Não foi possível ler nenhuma aba deste arquivo.');
  }

  // O recorte vem ANTES de normalizar: numa pasta de trabalho de 85 abas em que a pessoa
  // escolheu três, converter as outras 82 seria gastar memória para depois jogar fora.
  const escolhidas = opcoes.abas?.length ? new Set(opcoes.abas) : null;
  const selecionadas = escolhidas ? brutas.filter((b) => escolhidas.has(b.name ?? '')) : brutas;
  if (selecionadas.length === 0) {
    throw new ErroDeImportacao('Nenhuma das abas escolhidas foi encontrada no arquivo.');
  }

  const sheets = selecionadas.map(normalizarAba);
  const avisos: string[] = [];

  // As medidas saem das abas JÁ convertidas: é a largura de coluna real que diz em que pixel a
  // imagem começa, e ela só existe depois da conversão.
  const medidasPorNome = new Map(sheets.map((s, i) => [s.name, medidasDaAba(selecionadas[i])]));
  const medidas = (nome: string): MedidasDaAba =>
    medidasPorNome.get(nome) ?? { larguraColuna: () => LARGURA_PADRAO, alturaLinha: () => ALTURA_PADRAO };

  let totalImagens = 0;
  try {
    const extras = await extrasDoXlsx(arquivo, medidas, new Set(sheets.map((s) => s.name)));

    for (const sheet of sheets) {
      const imagens: Image[] | undefined = extras.imagens.get(sheet.name);
      if (imagens?.length) {
        sheet.images = imagens;
        totalImagens += imagens.length;
      }

      const frozen = extras.congelamentos.get(sheet.name);
      if (frozen) sheet.frozen = frozen;

      const fontes = extras.fontes.get(sheet.name);
      if (fontes) {
        for (const cd of sheet.celldata ?? []) {
          const extra = fontes.get(`${cd.r}_${cd.c}`);
          if (!cd.v || !extra) continue;
          // Estritamente aditivo: só preenche o que veio em branco. Se um dia o conversor
          // passar a ler o sublinhado sozinho, esta passada deixa de ter efeito em vez de
          // começar a brigar com ele.
          if (extra.sublinhado && !cd.v.un) cd.v.un = 1;
          if (extra.italico && !cd.v.it) cd.v.it = 1;
        }
      }

      const condicionais = extras.condicionais.get(sheet.name);
      if (condicionais) aplicarCondicionais(sheet, condicionais);
    }
  } catch {
    avisos.push('Os logos e o cabeçalho travado não puderam ser lidos; os dados foram importados.');
  }

  // Só o que o backend vai auditar — ver MAXIMO_DE_CELULAS.
  const totalCelulas = sheets.reduce(
    (soma, s) => soma + (s.celldata ?? []).filter((cd) => cd.v && temConteudo(cd.v as CelulaBruta)).length,
    0
  );
  if (totalCelulas > MAXIMO_DE_CELULAS) {
    throw new ErroDeImportacao(
      `As abas escolhidas somam ${totalCelulas.toLocaleString('pt-BR')} células preenchidas e o limite é ${MAXIMO_DE_CELULAS.toLocaleString('pt-BR')}. Importe menos abas de cada vez.`
    );
  }

  /**
   * Cabe no corpo que o servidor aceita?
   *
   * Conferido AQUI, e não lá, porque lá é tarde: a pessoa teria esperado a conversão inteira
   * para receber um "request entity too large" sem explicação. A pasta de trabalho completa da
   * cliente dá 36 MB; o servidor aceita 48 MB (ver app.ts).
   *
   * `length` conta caracteres e o corpo trafega em UTF-8, onde cada acento ocupa dois bytes —
   * daí o orçamento ficar abaixo do limite real em vez de colado nele.
   */
  const caracteres = JSON.stringify(sheets).length;
  if (caracteres > ORCAMENTO_DO_CORPO) {
    const mb = (caracteres / 1024 / 1024).toFixed(0);
    throw new ErroDeImportacao(
      `As ${sheets.length} abas escolhidas geram ${mb} MB, acima do que o servidor aceita de uma vez. ` +
        'Importe menos abas por vez — por exemplo, um ano de cada vez.'
    );
  }

  return {
    sheets,
    nomeSugerido: arquivo.name.replace(/\.xlsx$/i, '').trim() || 'Planilha importada',
    totalCelulas,
    totalImagens,
    abasIgnoradas: brutas.length - sheets.length,
    avisos,
  };
}
