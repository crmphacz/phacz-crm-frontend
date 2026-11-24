import JSZip from 'jszip';
import type { Image } from '@fortune-sheet/core';

/**
 * As imagens flutuantes de um .xlsx (logos, selos, carimbos).
 *
 * Existe porque o LuckyExcel, que faz o resto da conversão, devolve `images: null` sempre — ele
 * nunca leu os desenhos do arquivo. Na tabela da cliente são os dois logos no alto da folha, e
 * sem eles a planilha importada abre com um vazio onde hoje está o cabeçalho.
 *
 * O .xlsx é um zip de XMLs, e chegar na imagem é uma corrente de referências:
 *
 *   workbook.xml ─(r:id)→ workbook.xml.rels ─→ worksheets/sheetN.xml
 *   sheetN.xml ─(r:id do <drawing>)→ sheetN.xml.rels ─→ drawings/drawingM.xml
 *   drawingM.xml ─(r:embed do <a:blip>)→ drawingM.xml.rels ─→ media/imagem.png
 *
 * Cada elo é percorrido aqui. O que o Excel guarda é a ÂNCORA (de qual célula até qual célula a
 * imagem vai), e o fortune-sheet quer pixels absolutos — a conversão depende das larguras de
 * coluna e alturas de linha da própria planilha, que chegam por parâmetro.
 */

/** O Excel mede em EMU; 914400 por polegada, 96 pixels por polegada. */
const EMU_POR_PIXEL = 9525;

function emuParaPixel(emu: number): number {
  return emu / EMU_POR_PIXEL;
}

export interface MedidasDaAba {
  /** Largura em pixels da coluna `c`. */
  larguraColuna: (c: number) => number;
  /** Altura em pixels da linha `r`. */
  alturaLinha: (r: number) => number;
}

/** Soma as larguras/alturas até o índice, que é onde a âncora começa. */
function somaAte(ate: number, medida: (i: number) => number): number {
  let total = 0;
  for (let i = 0; i < ate; i++) total += medida(i);
  return total;
}

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

const MIME_POR_EXTENSAO: Record<string, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  bmp: 'image/bmp',
  webp: 'image/webp',
  svg: 'image/svg+xml',
};

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

/**
 * As imagens de cada aba, na chave do NOME da aba.
 *
 * Pelo nome e não pelo índice porque é o nome que o LuckyExcel devolve, e é por ele que o
 * chamador junta as duas metades da conversão.
 *
 * Nunca lança: uma planilha sem imagem nenhuma, um zip com um XML que não reconhecemos ou um
 * desenho que é um gráfico em vez de uma figura são todos casos normais, e nenhum deles pode
 * impedir a importação do que importa, que são os dados.
 */
export async function imagensDoXlsx(
  arquivo: File | Blob,
  medidasPorAba: (nomeDaAba: string) => MedidasDaAba
): Promise<Map<string, Image[]>> {
  const resultado = new Map<string, Image[]>();

  let zip: JSZip;
  try {
    zip = await JSZip.loadAsync(arquivo);
  } catch {
    return resultado;
  }

  const workbook = zip.file('xl/workbook.xml');
  if (!workbook) return resultado;

  const docWorkbook = lerXml(await workbook.async('string'));
  const relsWorkbook = await relacoesDe(zip, 'xl/workbook.xml');

  for (const abaXml of filhos(docWorkbook, 'sheet')) {
    const nomeDaAba = abaXml.getAttribute('name');
    // O atributo tem prefixo de namespace (r:id) e `getAttribute` com o prefixo só funciona
    // porque o parser preserva o nome qualificado; o NS explícito é a saída portátil.
    const rId =
      abaXml.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships', 'id') ??
      abaXml.getAttribute('r:id');
    if (!nomeDaAba || !rId) continue;

    const caminhoDaAba = relsWorkbook.get(rId);
    const arquivoDaAba = caminhoDaAba ? zip.file(caminhoDaAba) : null;
    if (!caminhoDaAba || !arquivoDaAba) continue;

    const docAba = lerXml(await arquivoDaAba.async('string'));
    const refDesenho = filho(docAba, 'drawing');
    const rIdDesenho =
      refDesenho?.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships', 'id') ??
      refDesenho?.getAttribute('r:id');
    if (!rIdDesenho) continue;

    const relsAba = await relacoesDe(zip, caminhoDaAba);
    const caminhoDesenho = relsAba.get(rIdDesenho);
    const arquivoDesenho = caminhoDesenho ? zip.file(caminhoDesenho) : null;
    if (!caminhoDesenho || !arquivoDesenho) continue;

    const docDesenho = lerXml(await arquivoDesenho.async('string'));
    const relsDesenho = await relacoesDe(zip, caminhoDesenho);
    const medidas = medidasPorAba(nomeDaAba);

    const ancoras = [
      ...filhos(docDesenho, 'twoCellAnchor'),
      ...filhos(docDesenho, 'oneCellAnchor'),
    ];

    const daAba: Image[] = [];
    for (const [i, ancora] of ancoras.entries()) {
      const blip = filho(ancora, 'blip');
      const embed =
        blip?.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships', 'embed') ??
        blip?.getAttribute('r:embed');
      // Sem <a:blip> a âncora é um gráfico, uma forma ou uma caixa de texto — nada disso é
      // imagem, e tentar importar levaria um retângulo vazio para a planilha.
      if (!embed) continue;

      const caminhoMidia = relsDesenho.get(embed);
      const arquivoMidia = caminhoMidia ? zip.file(caminhoMidia) : null;
      if (!caminhoMidia || !arquivoMidia) continue;

      const posicao = posicaoDaAncora(ancora, medidas);
      if (!posicao) continue;

      const extensao = caminhoMidia.split('.').pop()?.toLowerCase() ?? 'png';
      const mime = MIME_POR_EXTENSAO[extensao];
      if (!mime) continue;

      const base64 = await arquivoMidia.async('base64');
      daAba.push({
        ...posicao,
        id: `img_${nomeDaAba}_${i}`,
        src: `data:${mime};base64,${base64}`,
      });
    }

    if (daAba.length > 0) resultado.set(nomeDaAba, daAba);
  }

  return resultado;
}

/** O painel congelado de cada aba, na chave do nome dela. */
export type Congelamento = NonNullable<import('@fortune-sheet/core').Sheet['frozen']>;

/**
 * Os painéis congelados de cada aba.
 *
 * O LuckyExcel descarta essa informação. Numa tabela de 500 unidades isso não é enfeite: sem a
 * linha de cabeçalho travada, rolar até o apartamento 1402 deixa a pessoa olhando para uma
 * fileira de números sem saber qual coluna é entrada e qual é reforço.
 *
 * Vale a mesma regra do resto deste arquivo: não lança. Uma aba sem congelamento é o caso
 * comum, e nada aqui pode impedir a importação dos dados.
 */
export async function congelamentosDoXlsx(arquivo: File | Blob): Promise<Map<string, Congelamento>> {
  const resultado = new Map<string, Congelamento>();

  let zip: JSZip;
  try {
    zip = await JSZip.loadAsync(arquivo);
  } catch {
    return resultado;
  }

  const workbook = zip.file('xl/workbook.xml');
  if (!workbook) return resultado;

  const docWorkbook = lerXml(await workbook.async('string'));
  const relsWorkbook = await relacoesDe(zip, 'xl/workbook.xml');

  for (const abaXml of filhos(docWorkbook, 'sheet')) {
    const nomeDaAba = abaXml.getAttribute('name');
    const rId =
      abaXml.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships', 'id') ??
      abaXml.getAttribute('r:id');
    if (!nomeDaAba || !rId) continue;

    const caminhoDaAba = relsWorkbook.get(rId);
    const arquivoDaAba = caminhoDaAba ? zip.file(caminhoDaAba) : null;
    if (!arquivoDaAba) continue;

    const painel = filho(lerXml(await arquivoDaAba.async('string')), 'pane');
    // `split` (sem congelar) move a divisória mas não trava nada: só `frozen` interessa.
    if (!painel || !(painel.getAttribute('state') ?? '').startsWith('frozen')) continue;

    const colunas = Number(painel.getAttribute('xSplit')) || 0;
    const linhas = Number(painel.getAttribute('ySplit')) || 0;
    if (colunas <= 0 && linhas <= 0) continue;

    // O Excel conta quantas linhas/colunas ficam travadas; o editor quer o índice da última
    // delas. Daí o -1, e o 0 quando aquele eixo não está congelado.
    const range = { row_focus: Math.max(0, linhas - 1), column_focus: Math.max(0, colunas - 1) };
    if (colunas > 0 && linhas > 0) resultado.set(nomeDaAba, { type: 'rangeBoth', range });
    else if (linhas > 0) resultado.set(nomeDaAba, { type: 'rangeRow', range });
    else resultado.set(nomeDaAba, { type: 'rangeColumn', range });
  }

  return resultado;
}
