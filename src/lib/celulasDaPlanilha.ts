import type { Sheet } from '@fortune-sheet/core';
import type { CelulaAlterada } from '../types';

/**
 * As células preenchidas de cada aba, no formato normalizado que o backend audita
 * (aba, referência, valor, fórmula).
 *
 * Mora aqui, e não dentro do editor, porque há dois caminhos até o mesmo salvamento: a pessoa
 * editando célula a célula e a importação de um .xlsx inteiro. Se cada um montasse a própria
 * lista, uma planilha importada e a mesma planilha digitada à mão gerariam históricos
 * diferentes para o mesmo conteúdo.
 */

/**
 * Devolve as abas com as células em `celldata`, que é o formato que gravamos e lemos.
 *
 * O fortune-sheet tem DUAS representações para a mesma coisa. Ele recebe `celldata` — a lista
 * esparsa, só as células preenchidas — e, ao montar a planilha na tela, converte tudo para
 * `data`, uma matriz densa com `null` em cada célula vazia, deixando `celldata` para trás.
 *
 * Quem sai do editor (`getAllSheets`, `onChange`) vem nesse segundo formato. Gravar isso direto
 * salvava a aba com imagem, nome e configuração — e NENHUMA célula, porque `celldata` estava
 * vazio. O arquivo voltava com os cabeçalhos pretos e a grade em branco.
 *
 * A conversão acontece aqui, num lugar só, porque os dois consumidores precisam dela: o que
 * grava a planilha e o que monta a lista de células auditadas. Em caminhos separados, um
 * salvaria o que o outro não enxerga.
 *
 * `data` também é DESCARTADO: é a mesma informação em forma densa, com centenas de `null` por
 * aba, e guardar as duas dobraria o tamanho do que trafega e do que fica no banco.
 */
export function comCelldata(sheets: Sheet[]): Sheet[] {
  return (sheets ?? []).map((sh) => {
    const bruta = sh as unknown as { data?: unknown[][]; celldata?: unknown[] };

    // Aba que ainda não passou pela tela (recém-importada) já está no formato certo.
    if (!Array.isArray(bruta.data) || bruta.data.length === 0) return sh;

    const celldata: { r: number; c: number; v: unknown }[] = [];
    bruta.data.forEach((linha, r) => {
      if (!Array.isArray(linha)) return;
      linha.forEach((celula, c) => {
        // `null` é célula vazia — é o que a matriz densa usa para preencher o retângulo.
        if (celula === null || celula === undefined) return;
        celldata.push({ r, c, v: celula });
      });
    });

    const { data: _descartado, ...resto } = bruta;
    return { ...resto, celldata } as unknown as Sheet;
  });
}

/**
 * Uma assinatura do CONTEÚDO da planilha, para saber se ela mudou de verdade.
 *
 * O fortune-sheet dispara `onChange` por conta própria logo que monta a planilha, antes de
 * qualquer ação de quem abriu — e o editor tratava isso como edição. Abrir a tabela e sair sem
 * tocar em nada perguntava "há alterações não salvas", o que além de irritante ensina a ignorar
 * o aviso, e aí um dia ele aparece de verdade e é descartado do mesmo jeito.
 *
 * Comparar as abas inteiras não serve: o que sai do editor carrega também seleção, rolagem e
 * zoom, que mudam a cada clique sem nada ter sido editado.
 *
 * Então a assinatura leva só o que é conteúdo: nome e ordem das abas, as células com toda a sua
 * formatação, a configuração (mesclagens, bordas, larguras) e a GEOMETRIA das imagens. O
 * `src` das imagens fica de fora de propósito — é base64 de megabytes que nunca muda sozinho, e
 * incluí-lo tornaria a comparação cara sem acrescentar informação.
 */
export function assinaturaDoConteudo(sheets: Sheet[]): string {
  return JSON.stringify(
    (sheets ?? []).map((sh) => {
      const s = sh as unknown as {
        name?: string;
        order?: number;
        celldata?: unknown;
        config?: unknown;
        images?: { left?: number; top?: number; width?: number; height?: number }[];
      };
      return {
        nome: s.name ?? '',
        ordem: s.order ?? 0,
        celulas: s.celldata ?? [],
        config: s.config ?? {},
        imagens: (s.images ?? []).map((img) => [img?.left, img?.top, img?.width, img?.height]),
      };
    })
  );
}

export function letraDaColuna(c: number): string {
  let s = '';
  let n = c;
  do {
    s = String.fromCharCode(65 + (n % 26)) + s;
    n = Math.floor(n / 26) - 1;
  } while (n >= 0);
  return s;
}

export function celulasDasAbas(sheets: Sheet[]): CelulaAlterada[] {
  const out: CelulaAlterada[] = [];
  for (const sh of sheets ?? []) {
    const aba = String((sh as { name?: string })?.name ?? 'Planilha 1');
    const celldata = Array.isArray((sh as { celldata?: unknown }).celldata)
      ? ((sh as { celldata: { r: number; c: number; v: unknown }[] }).celldata)
      : [];
    for (const cd of celldata) {
      if (!cd || typeof cd.r !== 'number' || typeof cd.c !== 'number') continue;
      const raw = cd.v;
      const v = (raw && typeof raw === 'object' ? raw : { v: raw }) as {
        v?: unknown; m?: unknown; f?: unknown;
      };
      const formula = typeof v.f === 'string' && v.f.startsWith('=') ? v.f : null;
      // `m` antes de `v`: é o texto que a planilha mostra ("R$ 4.224.493,11"), e é ele que a
      // auditoria e o BI precisam ler, não o 4224493.11 cru.
      let valor = '';
      if (v.m !== undefined && v.m !== null) valor = String(v.m);
      else if (v.v !== undefined && v.v !== null) valor = String(v.v);
      if (valor === '' && !formula) continue;
      out.push({ aba, ref: `${letraDaColuna(cd.c)}${cd.r + 1}`, valor, formula });
    }
  }
  return out;
}
