import JSZip from 'jszip';
import type { Image, Sheet } from '@fortune-sheet/core';

/**
 * O que o LuckyExcel deixa para trás, lido direto do .xlsx.
 *
 * Ele faz o grosso da conversão, mas três coisas ele simplesmente não lê: as imagens
 * flutuantes (devolve `images: null` sempre), os painéis congelados e o sublinhado das fontes.
 * Na tabela da cliente isso é, respectivamente, os dois logos do cabeçalho, a linha de títulos
 * que precisa ficar travada numa tabela de 500 unidades, e o sublinhado dos percentuais.
 *
 * Tudo numa passada só. Antes eram três funções independentes, cada uma abrindo o zip e
 * relendo o XML de todas as abas: numa pasta de trabalho de 85 abas isso custava 30 segundos
 * só para repetir três vezes o mesmo trabalho.
 *
 * Nada aqui lança. O que estas funções trazem é acabamento, e acabamento não pode impedir a
 * importação dos dados.
 *
 * O .xlsx é um zip de XMLs, e chegar na imagem é uma corrente de referências:
 *
 *   workbook.xml ─(r:id)→ workbook.xml.rels ─→ worksheets/sheetN.xml
 *   sheetN.xml ─(r:id do <drawing>)→ sheetN.xml.rels ─→ drawings/drawingM.xml
 *   drawingM.xml ─(r:embed do <a:blip>)→ drawingM.xml.rels ─→ media/imagem.png
 *
 * Cada elo é percorrido aqui. O que o Excel guarda é a ÂNCORA (de qual célula até qual célula
 * a imagem vai), e o fortune-sheet quer pixels absolutos — a conversão depende das larguras de
 * coluna e alturas de linha da própria planilha, que chegam por parâmetro.
 */

/** O Excel mede em EMU; 914400 por polegada, 96 pixels por polegada. */
const EMU_POR_PIXEL = 9525;

const NS_RELACOES = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';

function emuParaPixel(emu: number): number {
  return emu / EMU_POR_PIXEL;
}

export interface MedidasDaAba {
  /** Largura em pixels da coluna `c`. */
  larguraColuna: (c: number) => number;
  /** Altura em pixels da linha `r`. */
  alturaLinha: (r: number) => number;
}

export type Congelamento = NonNullable<Sheet['frozen']>;

/** O que a passada das fontes acrescenta a uma célula. Só o que o LuckyExcel erra. */
export interface FonteDaCelula {
  sublinhado?: boolean;
  italico?: boolean;
}

/** O visual que uma regra condicional pinta na célula. */
export interface FormatoCondicional {
  fc?: string;
  bg?: string;
  bl?: 1;
  it?: 1;
}

export interface RegraCondicional {
  /** Células alcançadas, na chave "linha_coluna". */
  alcance: string[];
  tipo: 'contem' | 'naoContem' | 'comecaCom' | 'terminaCom' | 'igual';
  texto: string;
  /** No Excel, 1 é a precedência mais alta. */
  prioridade: number;
  formato: FormatoCondicional;
}

export interface ExtrasDoXlsx {
  /** Imagens de cada aba, na chave do nome da aba. */
  imagens: Map<string, Image[]>;
  /** Painel congelado de cada aba. */
  congelamentos: Map<string, Congelamento>;
  /** Sublinhado/itálico por aba e por célula, na chave "linha_coluna". */
  fontes: Map<string, Map<string, FonteDaCelula>>;
  /** Regras condicionais de texto, por aba. */
  condicionais: Map<string, RegraCondicional[]>;
}

// ── Utilitários de XML e de zip ──────────────────────────────────────

function texto(no: Element | null | undefined): string {
  return no?.textContent?.trim() ?? '';
}

/** Primeiro descendente com este nome local, ignorando o prefixo de namespace. */
function filho(pai: Element | Document, nomeLocal: string): Element | null {
  return pai.getElementsByTagNameNS('*', nomeLocal)[0] ?? null;
}

function filhos(pai: Element | Document, nomeLocal: string): Element[] {
  return Array.from(pai.getElementsByTagNameNS('*', nomeLocal));
}

function lerXml(conteudo: string): Document {
  return new DOMParser().parseFromString(conteudo, 'application/xml');
}

/** Atributo com prefixo de namespace de relações (r:id, r:embed). */
function atributoDeRelacao(no: Element | null | undefined, nome: string): string | null {
  if (!no) return null;
  return no.getAttributeNS(NS_RELACOES, nome) ?? no.getAttribute(`r:${nome}`);
}

/**
 * Resolve um caminho relativo de .rels contra a pasta do arquivo que o declarou.
 *
 * Os alvos vêm como "../drawings/drawing1.xml" a partir de "xl/worksheets/": sem resolver o
 * "..", a busca no zip erra a pasta e a imagem simplesmente não aparece, sem erro nenhum.
 */
function resolverCaminho(base: string, alvo: string): string {
  if (alvo.startsWith('/')) return alvo.slice(1);
  const partes = base.split('/').slice(0, -1);
  for (const parte of alvo.split('/')) {
    if (parte === '.' || parte === '') continue;
    if (parte === '..') partes.pop();
    else partes.push(parte);
  }
  return partes.join('/');
}

/** Mapa rId → caminho resolvido do .rels que acompanha um arquivo. */
async function relacoesDe(zip: JSZip, caminhoDoArquivo: string): Promise<Map<string, string>> {
  const partes = caminhoDoArquivo.split('/');
  const nome = partes.pop()!;
  const caminhoRels = [...partes, '_rels', `${nome}.rels`].join('/');
  const arquivo = zip.file(caminhoRels);
  const mapa = new Map<string, string>();
  if (!arquivo) return mapa;

  const doc = lerXml(await arquivo.async('string'));
  for (const rel of filhos(doc, 'Relationship')) {
    const id = rel.getAttribute('Id');
    const alvo = rel.getAttribute('Target');
    if (id && alvo) mapa.set(id, resolverCaminho(caminhoDoArquivo, alvo));
  }
  return mapa;
}

/** As abas do arquivo, em ordem, com o caminho do XML de cada uma. */
async function abasDoZip(zip: JSZip): Promise<{ nome: string; caminho: string }[]> {
  const workbook = zip.file('xl/workbook.xml');
  if (!workbook) return [];

  const doc = lerXml(await workbook.async('string'));
  const rels = await relacoesDe(zip, 'xl/workbook.xml');

  const abas: { nome: string; caminho: string }[] = [];
  for (const abaXml of filhos(doc, 'sheet')) {
    const nome = abaXml.getAttribute('name');
    const rId = atributoDeRelacao(abaXml, 'id');
    const caminho = rId ? rels.get(rId) : undefined;
    if (nome && caminho) abas.push({ nome, caminho });
  }
  return abas;
}

/**
 * Só os nomes das abas, sem converter nada.
 *
 * Custa milissegundos, contra os minutos da conversão: é o que deixa a tela perguntar quais
 * abas trazer ANTES de começar o trabalho pesado.
 */
export async function nomesDasAbas(arquivo: File | Blob): Promise<string[]> {
  try {
    const zip = await JSZip.loadAsync(arquivo);
    return (await abasDoZip(zip)).map((a) => a.nome);
  } catch {
    return [];
  }
}

// ── Imagens ──────────────────────────────────────────────────────────

const MIME_POR_EXTENSAO: Record<string, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  bmp: 'image/bmp',
  webp: 'image/webp',
  svg: 'image/svg+xml',
};

/** Soma as larguras/alturas até o índice, que é onde a âncora começa. */
function somaAte(ate: number, medida: (i: number) => number): number {
  let total = 0;
  for (let i = 0; i < ate; i++) total += medida(i);
  return total;
}

/**
 * Uma âncora do drawing, já em pixels.
 *
 * `twoCellAnchor` prende a imagem entre duas células (ela acompanha a largura das colunas);
 * `oneCellAnchor` prende só o canto e guarda o tamanho. Os dois aparecem em planilhas reais, e
 * tratar só o primeiro deixaria metade dos logos fora.
 */
function posicaoDaAncora(ancora: Element, medidas: MedidasDaAba): Image | null {
  const de = filho(ancora, 'from');
  if (!de) return null;

  const colDe = Number(texto(filho(de, 'col'))) || 0;
  const linDe = Number(texto(filho(de, 'row'))) || 0;
  const colOffDe = Number(texto(filho(de, 'colOff'))) || 0;
  const linOffDe = Number(texto(filho(de, 'rowOff'))) || 0;

  const left = somaAte(colDe, medidas.larguraColuna) + emuParaPixel(colOffDe);
  const top = somaAte(linDe, medidas.alturaLinha) + emuParaPixel(linOffDe);

  let width = 0;
  let height = 0;

  const ate = filho(ancora, 'to');
  if (ate) {
    const colAte = Number(texto(filho(ate, 'col'))) || 0;
    const linAte = Number(texto(filho(ate, 'row'))) || 0;
    const colOffAte = Number(texto(filho(ate, 'colOff'))) || 0;
    const linOffAte = Number(texto(filho(ate, 'rowOff'))) || 0;
    width = somaAte(colAte, medidas.larguraColuna) + emuParaPixel(colOffAte) - left;
    height = somaAte(linAte, medidas.alturaLinha) + emuParaPixel(linOffAte) - top;
  } else {
    const ext = filho(ancora, 'ext');
    width = emuParaPixel(Number(ext?.getAttribute('cx')) || 0);
    height = emuParaPixel(Number(ext?.getAttribute('cy')) || 0);
  }

  if (width <= 0 || height <= 0) return null;

  return {
    id: '',
    src: '',
    left: Math.round(left),
    top: Math.round(top),
    width: Math.round(width),
    height: Math.round(height),
  };
}

async function imagensDaAba(
  zip: JSZip,
  docAba: Document,
  caminhoDaAba: string,
  nomeDaAba: string,
  medidas: MedidasDaAba
): Promise<Image[]> {
  const rIdDesenho = atributoDeRelacao(filho(docAba, 'drawing'), 'id');
  if (!rIdDesenho) return [];

  const relsAba = await relacoesDe(zip, caminhoDaAba);
  const caminhoDesenho = relsAba.get(rIdDesenho);
  const arquivoDesenho = caminhoDesenho ? zip.file(caminhoDesenho) : null;
  if (!caminhoDesenho || !arquivoDesenho) return [];

  const docDesenho = lerXml(await arquivoDesenho.async('string'));
  const relsDesenho = await relacoesDe(zip, caminhoDesenho);

  const ancoras = [...filhos(docDesenho, 'twoCellAnchor'), ...filhos(docDesenho, 'oneCellAnchor')];
  const saida: Image[] = [];

  for (const [i, ancora] of ancoras.entries()) {
    const embed = atributoDeRelacao(filho(ancora, 'blip'), 'embed');
    // Sem <a:blip> a âncora é um gráfico, uma forma ou uma caixa de texto — nada disso é
    // imagem, e tentar importar levaria um retângulo vazio para a planilha.
    if (!embed) continue;

    const caminhoMidia = relsDesenho.get(embed);
    const arquivoMidia = caminhoMidia ? zip.file(caminhoMidia) : null;
    if (!caminhoMidia || !arquivoMidia) continue;

    const posicao = posicaoDaAncora(ancora, medidas);
    if (!posicao) continue;

    const mime = MIME_POR_EXTENSAO[caminhoMidia.split('.').pop()?.toLowerCase() ?? 'png'];
    if (!mime) continue;

    saida.push({
      ...posicao,
      id: `img_${nomeDaAba}_${i}`,
      src: `data:${mime};base64,${await arquivoMidia.async('base64')}`,
    });
  }

  return saida;
}

// ── Painel congelado ─────────────────────────────────────────────────

/**
 * Numa tabela de 500 unidades, o cabeçalho travado não é enfeite: sem ele, rolar até o
 * apartamento 1402 deixa a pessoa olhando para uma fileira de números sem saber qual coluna é
 * entrada e qual é reforço.
 */
function congelamentoDaAba(docAba: Document): Congelamento | null {
  const painel = filho(docAba, 'pane');
  // `split` (sem congelar) move a divisória mas não trava nada: só `frozen` interessa.
  if (!painel || !(painel.getAttribute('state') ?? '').startsWith('frozen')) return null;

  const colunas = Number(painel.getAttribute('xSplit')) || 0;
  const linhas = Number(painel.getAttribute('ySplit')) || 0;
  if (colunas <= 0 && linhas <= 0) return null;

  // O Excel conta quantas linhas/colunas ficam travadas; o editor quer o índice da última
  // delas. Daí o -1, e o 0 quando aquele eixo não está congelado.
  const range = { row_focus: Math.max(0, linhas - 1), column_focus: Math.max(0, colunas - 1) };
  if (colunas > 0 && linhas > 0) return { type: 'rangeBoth', range };
  if (linhas > 0) return { type: 'rangeRow', range };
  return { type: 'rangeColumn', range };
}

// ── Sublinhado e itálico ─────────────────────────────────────────────

/** "AB12" → { linha: 11, coluna: 27 }, em índices de base zero. */
function posicaoDaReferencia(ref: string): { linha: number; coluna: number } | null {
  const casa = /^([A-Z]+)(\d+)$/.exec(ref);
  if (!casa) return null;
  let coluna = 0;
  for (const letra of casa[1]) coluna = coluna * 26 + (letra.charCodeAt(0) - 64);
  return { linha: Number(casa[2]) - 1, coluna: coluna - 1 };
}

/**
 * A tabela de fontes do arquivo, resumida ao que o LuckyExcel erra.
 *
 * Ele lê negrito, cor, tamanho e nome da fonte, mas devolve `un: 0` mesmo quando o arquivo traz
 * `<u/>` — na tabela da cliente são os percentuais do cabeçalho (20%, 48X MENSAL, 20% - 4
 * ANUAIS, 15%), que no Excel aparecem sublinhados.
 */
async function tabelaDeFontes(zip: JSZip): Promise<{ porEstilo: number[]; fontes: FonteDaCelula[] } | null> {
  const estilos = zip.file('xl/styles.xml');
  if (!estilos) return null;

  const doc = lerXml(await estilos.async('string'));

  // `<u val="none"/>` existe e quer dizer o contrário de sublinhado; só a ausência do atributo
  // ou um valor diferente de "none" conta.
  const marcada = (fonte: Element, nome: string): boolean => {
    const no = fonte.getElementsByTagNameNS('*', nome)[0];
    return Boolean(no) && (no.getAttribute('val') ?? 'single') !== 'none';
  };

  const listaDeFontes = filho(doc, 'fonts');
  const fontes = listaDeFontes
    ? Array.from(listaDeFontes.getElementsByTagNameNS('*', 'font')).map((f) => ({
        sublinhado: marcada(f, 'u'),
        italico: marcada(f, 'i'),
      }))
    : [];

  // Nenhuma fonte sublinhada nem itálica: não há o que acrescentar, e varrer as células de 85
  // abas para não achar nada é desperdício puro.
  if (!fontes.some((f) => f.sublinhado || f.italico)) return null;

  const listaDeFormatos = filho(doc, 'cellXfs');
  const porEstilo = listaDeFormatos
    ? Array.from(listaDeFormatos.getElementsByTagNameNS('*', 'xf')).map((xf) => Number(xf.getAttribute('fontId')) || 0)
    : [];

  return { porEstilo, fontes };
}

function fontesDaAba(
  docAba: Document,
  tabela: { porEstilo: number[]; fontes: FonteDaCelula[] }
): Map<string, FonteDaCelula> {
  const daAba = new Map<string, FonteDaCelula>();

  for (const celula of filhos(docAba, 'c')) {
    const indiceDoEstilo = Number(celula.getAttribute('s'));
    if (!Number.isFinite(indiceDoEstilo)) continue;
    const fonte = tabela.fontes[tabela.porEstilo[indiceDoEstilo] ?? 0];
    if (!fonte || (!fonte.sublinhado && !fonte.italico)) continue;

    const ref = celula.getAttribute('r');
    const posicao = ref ? posicaoDaReferencia(ref) : null;
    if (!posicao) continue;

    daAba.set(`${posicao.linha}_${posicao.coluna}`, {
      ...(fonte.sublinhado ? { sublinhado: true } : {}),
      ...(fonte.italico ? { italico: true } : {}),
    });
  }

  return daAba;
}

// ── Formatação condicional de texto ──────────────────────────────────

/** "FFC6EFCE" → "#C6EFCE". Cores de tema são ignoradas: resolvê-las exigiria o theme1.xml. */
function corDoNo(no: Element | null): string | undefined {
  const rgb = no?.getAttribute('rgb');
  if (!rgb) return undefined;
  const hex = rgb.length === 8 ? rgb.slice(2) : rgb;
  return /^[0-9A-Fa-f]{6}$/.test(hex) ? `#${hex.toUpperCase()}` : undefined;
}

/** Os formatos diferenciais (`<dxfs>`), que é o que cada regra condicional pinta. */
function formatosDiferenciais(docEstilos: Document): FormatoCondicional[] {
  const bloco = filho(docEstilos, 'dxfs');
  if (!bloco) return [];

  return Array.from(bloco.getElementsByTagNameNS('*', 'dxf')).map((dxf) => {
    const fonte = filho(dxf, 'font');
    const preenchimento = filho(dxf, 'patternFill');
    const padrao = preenchimento?.getAttribute('patternType') ?? 'none';

    // Num `<dxf>` o Excel costuma repetir a cor em fgColor e bgColor; quando difere, a que
    // pinta a célula é a de frente.
    const fundo =
      padrao !== 'none'
        ? corDoNo(preenchimento ? filho(preenchimento, 'fgColor') : null) ??
          corDoNo(preenchimento ? filho(preenchimento, 'bgColor') : null)
        : undefined;

    return {
      ...(fonte && corDoNo(filho(fonte, 'color')) ? { fc: corDoNo(filho(fonte, 'color')) } : {}),
      ...(fundo ? { bg: fundo } : {}),
      ...(fonte && filho(fonte, 'b') ? { bl: 1 as const } : {}),
      ...(fonte && filho(fonte, 'i') ? { it: 1 as const } : {}),
    };
  });
}

/** Quantas células uma regra pode alcançar antes de virar desperdício de memória. */
const ALCANCE_MAXIMO = 50_000;

/** "Q9:Q60 AB11:AB12" → as chaves "linha_coluna" de cada célula. */
function expandirAlcance(sqref: string): string[] {
  const saida: string[] = [];
  for (const faixa of sqref.trim().split(/\s+/)) {
    const [de, ate] = faixa.split(':');
    const inicio = posicaoDaReferencia(de);
    const fim = ate ? posicaoDaReferencia(ate) : inicio;
    if (!inicio || !fim) continue;

    const linhas = Math.abs(fim.linha - inicio.linha) + 1;
    const colunas = Math.abs(fim.coluna - inicio.coluna) + 1;
    // Uma regra aplicada à COLUNA inteira (Q1:Q1048576) é comum e geraria um milhão de
    // chaves para nada: as células que importam são as que têm texto.
    if (linhas * colunas > ALCANCE_MAXIMO) continue;

    for (let r = Math.min(inicio.linha, fim.linha); r <= Math.max(inicio.linha, fim.linha); r++) {
      for (let c = Math.min(inicio.coluna, fim.coluna); c <= Math.max(inicio.coluna, fim.coluna); c++) {
        saida.push(`${r}_${c}`);
      }
    }
  }
  return saida;
}

const TIPOS_DE_TEXTO: Record<string, RegraCondicional['tipo']> = {
  containsText: 'contem',
  notContainsText: 'naoContem',
  beginsWith: 'comecaCom',
  endsWith: 'terminaCom',
};

/**
 * As regras condicionais de TEXTO de uma aba.
 *
 * Na tabela da cliente é o que pinta a coluna DISPONIBILIDADE: "RESERVADO" em vermelho,
 * "DISPONIVEL" em verde sobre fundo verde-claro. É o sinal que a equipe lê primeiro, e sem ele
 * a coluna inteira chega preta.
 *
 * Só as regras de texto, de propósito. As de valor (`cellIs`) desta planilha comparam com
 * OUTRA célula (`$W$13`), e decidir se elas batem exigiria recalcular a planilha aqui dentro —
 * um resultado errado pintaria a célula errada, que é pior do que não pintar.
 */
function condicionaisDaAba(docAba: Document, formatos: FormatoCondicional[]): RegraCondicional[] {
  const regras: RegraCondicional[] = [];

  for (const bloco of filhos(docAba, 'conditionalFormatting')) {
    const sqref = bloco.getAttribute('sqref');
    if (!sqref) continue;

    const alcance = expandirAlcance(sqref);
    if (alcance.length === 0) continue;

    for (const regra of filhos(bloco, 'cfRule')) {
      const tipo = TIPOS_DE_TEXTO[regra.getAttribute('type') ?? ''];
      const texto = regra.getAttribute('text');
      if (!tipo || !texto) continue;

      const formato = formatos[Number(regra.getAttribute('dxfId'))];
      if (!formato || Object.keys(formato).length === 0) continue;

      regras.push({
        alcance,
        tipo,
        texto,
        prioridade: Number(regra.getAttribute('priority')) || 999,
        formato,
      });
    }
  }

  return regras;
}

/** A regra bate neste texto? */
export function regraBate(regra: RegraCondicional, valor: string): boolean {
  // O Excel compara ignorando maiúsculas; e o texto da regra pode vir com espaço no fim
  // ("DISPONIVEL "), igualzinho ao da célula.
  const alvo = valor.toLowerCase();
  const procurado = regra.texto.trim().toLowerCase();
  if (procurado === '') return false;

  switch (regra.tipo) {
    case 'contem': return alvo.includes(procurado);
    case 'naoContem': return !alvo.includes(procurado);
    case 'comecaCom': return alvo.trimStart().startsWith(procurado);
    case 'terminaCom': return alvo.trimEnd().endsWith(procurado);
    case 'igual': return alvo.trim() === procurado;
  }
}

// ── A passada ────────────────────────────────────────────────────────

/**
 * Lê o arquivo UMA vez e devolve tudo que o LuckyExcel não traz.
 *
 * `abasDesejadas` evita o trabalho que seria jogado fora: numa pasta de trabalho de 85 abas em
 * que a pessoa escolheu três, não faz sentido extrair os logos das outras 82.
 */
export async function extrasDoXlsx(
  arquivo: File | Blob,
  medidasPorAba: (nomeDaAba: string) => MedidasDaAba,
  abasDesejadas?: Set<string>
): Promise<ExtrasDoXlsx> {
  const vazio: ExtrasDoXlsx = {
    imagens: new Map(),
    congelamentos: new Map(),
    fontes: new Map(),
    condicionais: new Map(),
  };

  let zip: JSZip;
  try {
    zip = await JSZip.loadAsync(arquivo);
  } catch {
    return vazio;
  }

  const abas = await abasDoZip(zip);
  if (abas.length === 0) return vazio;

  const tabela = await tabelaDeFontes(zip);

  const arquivoDeEstilos = zip.file('xl/styles.xml');
  const formatos = arquivoDeEstilos
    ? formatosDiferenciais(lerXml(await arquivoDeEstilos.async('string')))
    : [];

  for (const { nome, caminho } of abas) {
    if (abasDesejadas && !abasDesejadas.has(nome)) continue;

    const arquivoDaAba = zip.file(caminho);
    if (!arquivoDaAba) continue;

    let docAba: Document;
    try {
      docAba = lerXml(await arquivoDaAba.async('string'));
    } catch {
      continue;
    }

    const congelado = congelamentoDaAba(docAba);
    if (congelado) vazio.congelamentos.set(nome, congelado);

    if (tabela) {
      const daAba = fontesDaAba(docAba, tabela);
      if (daAba.size > 0) vazio.fontes.set(nome, daAba);
    }

    if (formatos.length > 0) {
      const regras = condicionaisDaAba(docAba, formatos);
      if (regras.length > 0) vazio.condicionais.set(nome, regras);
    }

    try {
      const imagens = await imagensDaAba(zip, docAba, caminho, nome, medidasPorAba(nome));
      if (imagens.length > 0) vazio.imagens.set(nome, imagens);
    } catch {
      // Uma aba com desenho ilegível não derruba o resto do arquivo.
    }
  }

  return vazio;
}
