import type { Sheet, Cell, CellWithRowAndCol, Image } from '@fortune-sheet/core';
import { update } from '@fortune-sheet/core';
import { imagensDoXlsx, congelamentosDoXlsx, fontesDoXlsx, type MedidasDaAba } from './extrasDoXlsx';

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

/** Teto do backend para o diff de células (ver saveSchema em tabelasEmpreendimentos/routes). */
const MAXIMO_DE_CELULAS = 200_000;

export interface PlanilhaImportada {
  sheets: Sheet[];
  /** Nome do arquivo sem a extensão — vira o nome da tabela. */
  nomeSugerido: string;
  totalCelulas: number;
  totalImagens: number;
  /** O que não veio como no Excel, para a tela avisar em vez de deixar a pessoa descobrir. */
  avisos: string[];
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
 * Converte uma aba e dimensiona a grade.
 *
 * O LuckyExcel não preenche `row`/`column`, e sem eles o editor abre com a grade padrão: numa
 * aba que vai até a linha 300, a planilha aparecia cortada e o resto dos dados ficava
 * inalcançável, embora salvo. A folga extra é para a pessoa continuar digitando abaixo do que
 * veio do Excel.
 */
function normalizarAba(bruta: AbaBruta, indice: number): Sheet {
  const celulas: CellWithRowAndCol[] = [];
  let ultimaLinha = 0;
  let ultimaColuna = 0;

  for (const cd of bruta.celldata ?? []) {
    if (!cd || typeof cd.r !== 'number' || typeof cd.c !== 'number') continue;
    ultimaLinha = Math.max(ultimaLinha, cd.r);
    ultimaColuna = Math.max(ultimaColuna, cd.c);
    celulas.push({ r: cd.r, c: cd.c, v: cd.v ? normalizarCelula(cd.v) : null });
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

// ── Conversão ────────────────────────────────────────────────────────

/** Trava de segurança: o LuckyExcel não tem callback de erro e some em silêncio num zip ruim. */
const TEMPO_LIMITE_MS = 120_000;

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

export async function importarExcel(arquivo: File): Promise<PlanilhaImportada> {
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

  const sheets = brutas.map(normalizarAba);
  const avisos: string[] = [];

  // As medidas saem das abas JÁ convertidas: é a largura de coluna real que diz em que pixel a
  // imagem começa, e ela só existe depois da conversão.
  const medidasPorNome = new Map(sheets.map((s, i) => [s.name, medidasDaAba(brutas[i])]));
  const medidas = (nome: string): MedidasDaAba =>
    medidasPorNome.get(nome) ?? { larguraColuna: () => LARGURA_PADRAO, alturaLinha: () => ALTURA_PADRAO };

  let totalImagens = 0;
  try {
    const imagens = await imagensDoXlsx(arquivo, medidas);
    for (const sheet of sheets) {
      const daAba: Image[] | undefined = imagens.get(sheet.name);
      if (daAba?.length) {
        sheet.images = daAba;
        totalImagens += daAba.length;
      }
    }
  } catch {
    avisos.push('As imagens do arquivo (logos, selos) não puderam ser lidas; o resto foi importado.');
  }

  try {
    const congelados = await congelamentosDoXlsx(arquivo);
    for (const sheet of sheets) {
      const frozen = congelados.get(sheet.name);
      if (frozen) sheet.frozen = frozen;
    }
  } catch {
    // Painel congelado é conforto de leitura: se falhar, não vale um aviso na cara da pessoa.
  }

  try {
    const fontes = await fontesDoXlsx(arquivo);
    for (const sheet of sheets) {
      const daAba = fontes.get(sheet.name);
      if (!daAba) continue;
      for (const cd of sheet.celldata ?? []) {
        const extra = daAba.get(`${cd.r}_${cd.c}`);
        if (!cd.v || !extra) continue;
        // Estritamente aditivo: só preenche o que veio em branco. Se um dia o conversor
        // passar a ler o sublinhado sozinho, esta passada deixa de ter efeito em vez de
        // começar a brigar com ele.
        if (extra.sublinhado && !cd.v.un) cd.v.un = 1;
        if (extra.italico && !cd.v.it) cd.v.it = 1;
      }
    }
  } catch {
    // Acabamento de fonte: nunca vale derrubar a importação.
  }

  const totalCelulas = sheets.reduce((soma, s) => soma + (s.celldata?.length ?? 0), 0);
  if (totalCelulas > MAXIMO_DE_CELULAS) {
    throw new ErroDeImportacao(
      `A planilha tem ${totalCelulas.toLocaleString('pt-BR')} células preenchidas e o limite é ${MAXIMO_DE_CELULAS.toLocaleString('pt-BR')}. Separe em mais de um arquivo.`
    );
  }

  return {
    sheets,
    nomeSugerido: arquivo.name.replace(/\.xlsx$/i, '').trim() || 'Planilha importada',
    totalCelulas,
    totalImagens,
    avisos,
  };
}
