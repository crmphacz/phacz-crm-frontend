/**
 * Rascunho do formulário de rodada, guardado no navegador.
 *
 * O formulário tem onze seções. Fechar a janela a meio caminho — porque faltou um dado que só
 * a imobiliária tem — significava redigitar tudo depois. O rascunho resolve isso.
 *
 * Fica no `localStorage`, e não no servidor, porque é um esboço pessoal e descartável: não
 * precisa ser visto por mais ninguém, não entra em relatório e não vale a pena custar uma
 * tabela, uma migração e um endpoint. O preço é que ele é POR NAVEGADOR — quem começa no
 * desktop não encontra o rascunho no celular. É um preço aceitável para o problema descrito;
 * se um dia for preciso atravessar máquinas, aí sim vale levar para o servidor.
 */

const CHAVE = 'phacz_rascunho_rodada';

/**
 * Sobe sempre que o formato do formulário mudar (campo novo, campo que virou lista). Rascunho
 * de versão antiga é DESCARTADO em vez de restaurado: meio formulário preenchido com um campo
 * no formato errado quebra a tela de um jeito que ninguém relaciona a um rascunho velho.
 *
 * v1 → formato de 26/10/2026, já com `vinculos` como lista.
 * v2 → 27/10/2026: convidado passou a ter `email` e `telefone`. Um rascunho v1 restaurado aqui
 *      traria convidados sem esses campos, e a validação de contato quebraria ao ler
 *      `email.trim()` de um valor inexistente.
 */
const VERSAO = 2;

interface RascunhoGuardado<T> {
  versao: number;
  /** De quem é o rascunho. Duas pessoas no mesmo computador não veem o esboço uma da outra. */
  userId: string;
  salvoEm: string;
  form: T;
}

export interface RascunhoLido<T> {
  form: T;
  salvoEm: Date;
}

/**
 * O acesso ao localStorage pode lançar — aba anônima, armazenamento bloqueado, cota cheia. Em
 * qualquer um desses casos o rascunho simplesmente não existe, e o formulário abre vazio: é
 * uma conveniência, nunca um caminho obrigatório.
 */
export function lerRascunhoRodada<T>(userId: string): RascunhoLido<T> | null {
  try {
    const bruto = localStorage.getItem(CHAVE);
    if (!bruto) return null;

    const guardado = JSON.parse(bruto) as RascunhoGuardado<T>;
    if (guardado.versao !== VERSAO || guardado.userId !== userId || !guardado.form) {
      return null;
    }

    const salvoEm = new Date(guardado.salvoEm);
    if (Number.isNaN(salvoEm.getTime())) return null;

    return { form: guardado.form, salvoEm };
  } catch {
    return null;
  }
}

export function salvarRascunhoRodada<T>(userId: string, form: T): void {
  try {
    const guardado: RascunhoGuardado<T> = {
      versao: VERSAO,
      userId,
      salvoEm: new Date().toISOString(),
      form,
    };
    localStorage.setItem(CHAVE, JSON.stringify(guardado));
  } catch {
    // Sem espaço ou sem permissão: perder o rascunho é ruim, mas travar o fechamento da
    // janela por causa disso seria pior.
  }
}

export function apagarRascunhoRodada(): void {
  try {
    localStorage.removeItem(CHAVE);
  } catch {
    // Idem.
  }
}
