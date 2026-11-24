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
