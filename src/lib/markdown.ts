/**
 * Markdown mínimo para as respostas da PHACZ IA.
 *
 * O modelo responde em Markdown — títulos, listas, negrito, tabelas — e a tela mostrava o
 * texto cru, com os asteriscos à vista e as listas viradas num parágrafo só.
 *
 * Isto é um PARSER, não um renderizador: devolve uma árvore de blocos que o componente
 * transforma em elementos React. A separação existe por dois motivos.
 *
 * O primeiro é segurança. A alternativa óbvia seria converter para HTML e jogar num
 * `dangerouslySetInnerHTML`, e isso transformaria a resposta do modelo em código executável na
 * sessão de quem está logado. O conteúdo passa por dados do CRM — nome de corretor, observação
 * de card, texto vindo de formulário —, então basta alguém digitar uma tag num campo para ela
 * chegar aqui. Devolvendo estrutura, o React escapa tudo e o problema não existe.
 *
 * O segundo é que o frontend não tem infraestrutura de teste: uma função pura que recebe texto
 * e devolve estrutura pode ser verificada fora do navegador, e é o que o arnês faz.
 *
 * Cobre o que o modelo de fato emite. O que não for reconhecido cai em parágrafo — nunca
 * desaparece da tela.
 */

export type Inline =
  | { tipo: 'texto'; valor: string }
  | { tipo: 'forte'; valor: string }
  | { tipo: 'enfase'; valor: string }
  | { tipo: 'codigo'; valor: string };

export type Alinhamento = 'esquerda' | 'centro' | 'direita';

export type Bloco =
  | { tipo: 'titulo'; nivel: 1 | 2 | 3; conteudo: Inline[] }
  | { tipo: 'paragrafo'; linhas: Inline[][] }
  | { tipo: 'lista'; ordenada: boolean; itens: Inline[][] }
  | { tipo: 'tabela'; cabecalho: Inline[][]; linhas: Inline[][][]; alinhamento: Alinhamento[] }
  | { tipo: 'codigo'; valor: string };

/**
 * Marcações inline, em ordem de precedência. `**forte**` vem antes de `*ênfase*` de propósito:
 * invertido, o primeiro `*` de `**983**` casaria como ênfase e deixaria asteriscos soltos.
 */
const INLINE = /(\*\*[^*]+\*\*|__[^_]+__|`[^`]+`|\*[^*\n]+\*|_[^_\n]+_)/;

export function parseInline(texto: string): Inline[] {
  const partes = texto.split(INLINE).filter((p) => p !== '');
  return partes.map((parte): Inline => {
    if (parte.startsWith('**') && parte.endsWith('**')) return { tipo: 'forte', valor: parte.slice(2, -2) };
    if (parte.startsWith('__') && parte.endsWith('__')) return { tipo: 'forte', valor: parte.slice(2, -2) };
    if (parte.startsWith('`') && parte.endsWith('`')) return { tipo: 'codigo', valor: parte.slice(1, -1) };
    if (parte.startsWith('*') && parte.endsWith('*')) return { tipo: 'enfase', valor: parte.slice(1, -1) };
    if (parte.startsWith('_') && parte.endsWith('_')) return { tipo: 'enfase', valor: parte.slice(1, -1) };
    return { tipo: 'texto', valor: parte };
  });
}

/**
 * Até 6 cerquilhas, e não 3: o modelo usa `####` com frequência, e um `{1,3}` simplesmente não
 * casava — o título caía em parágrafo e aparecia na tela com os "####" à mostra.
 * O NÍVEL é que é limitado a 3, na hora de montar o bloco.
 */
const TITULO = /^(#{1,6})\s+(.*)$/;
const ITEM_LISTA = /^\s*[-*+]\s+(.*)$/;
const ITEM_NUMERADO = /^\s*\d+[.)]\s+(.*)$/;
const SEPARADOR_TABELA = /^\s*\|?[\s:|-]*-[\s:|-]*\|?\s*$/;

function celulasDaLinha(linha: string): string[] {
  return linha.replace(/^\s*\|/, '').replace(/\|\s*$/, '').split('|').map((c) => c.trim());
}

/**
 * O alinhamento de cada coluna sai da linha separadora: `---:` à direita, `:-:` ao centro.
 * Vale a pena ler: numa resposta de CRM quase toda tabela tem uma coluna de números, e número
 * alinhado à esquerda obriga quem lê a comparar grandezas olhando o fim de cada célula.
 */
function alinhamentoDasColunas(separador: string): Alinhamento[] {
  return celulasDaLinha(separador).map((c) => {
    const direita = c.endsWith(':');
    const esquerda = c.startsWith(':');
    if (direita && esquerda) return 'centro';
    if (direita) return 'direita';
    return 'esquerda';
  });
}

export function parseMarkdown(texto: string): Bloco[] {
  const linhas = texto.replace(/\r\n/g, '\n').split('\n');
  const blocos: Bloco[] = [];
  let i = 0;

  while (i < linhas.length) {
    const linha = linhas[i];

    if (linha.trim() === '') {
      i++;
      continue;
    }

    // Bloco de código cercado: tudo lá dentro é literal, inclusive o que pareceria marcação.
    if (linha.trim().startsWith('```')) {
      const corpo: string[] = [];
      i++;
      while (i < linhas.length && !linhas[i].trim().startsWith('```')) {
        corpo.push(linhas[i]);
        i++;
      }
      i++; // fecha a cerca
      blocos.push({ tipo: 'codigo', valor: corpo.join('\n') });
      continue;
    }

    const titulo = TITULO.exec(linha);
    if (titulo) {
      blocos.push({
        tipo: 'titulo',
        nivel: Math.min(titulo[1].length, 3) as 1 | 2 | 3,
        conteudo: parseInline(titulo[2]),
      });
      i++;
      continue;
    }

    // Tabela: só é tabela se a linha seguinte for o separador. Sem essa checagem, qualquer
    // frase com uma barra viraria uma tabela de uma coluna.
    if (linha.includes('|') && i + 1 < linhas.length && SEPARADOR_TABELA.test(linhas[i + 1])) {
      const cabecalho = celulasDaLinha(linha).map(parseInline);
      const alinhamento = alinhamentoDasColunas(linhas[i + 1]);
      i += 2;
      const corpo: Inline[][][] = [];
      while (i < linhas.length && linhas[i].includes('|') && linhas[i].trim() !== '') {
        corpo.push(celulasDaLinha(linhas[i]).map(parseInline));
        i++;
      }
      blocos.push({ tipo: 'tabela', cabecalho, linhas: corpo, alinhamento });
      continue;
    }

    const ehItem = (l: string) => ITEM_LISTA.test(l) || ITEM_NUMERADO.test(l);
    if (ehItem(linha)) {
      const ordenada = ITEM_NUMERADO.test(linha);
      const itens: Inline[][] = [];
      // Uma lista termina quando a linha deixa de ser item. Trocar de marcador (de "-" para
      // "1.") abre uma lista nova, senão números e bolinhas se misturariam na mesma.
      while (i < linhas.length && ehItem(linhas[i]) && ITEM_NUMERADO.test(linhas[i]) === ordenada) {
        const m = ordenada ? ITEM_NUMERADO.exec(linhas[i])! : ITEM_LISTA.exec(linhas[i])!;
        itens.push(parseInline(m[1]));
        i++;
      }
      blocos.push({ tipo: 'lista', ordenada, itens });
      continue;
    }

    // Parágrafo: linhas seguidas até uma linha em branco ou o começo de outro bloco. As
    // quebras internas são preservadas — o modelo as usa para separar frases curtas.
    const linhasDoParagrafo: Inline[][] = [];
    while (
      i < linhas.length &&
      linhas[i].trim() !== '' &&
      !ehItem(linhas[i]) &&
      !TITULO.test(linhas[i]) &&
      !linhas[i].trim().startsWith('```')
    ) {
      linhasDoParagrafo.push(parseInline(linhas[i].trim()));
      i++;
    }
    blocos.push({ tipo: 'paragrafo', linhas: linhasDoParagrafo });
  }

  return blocos;
}
