/**
 * Guarda o último estado (filtros, página, ordenação) e os dados já carregados de telas que
 * buscam a própria lista ao montar. Sem isto, trocar de menu e voltar remontava a tela do zero:
 * filtros resetados, tela cheia de "Carregando…" e nenhum dado até a nova resposta chegar.
 * Com o cache a tela reabre na hora com o que já tinha e revalida em segundo plano.
 */
const cache = new Map<string, unknown>();

export function getViewCache<T>(key: string): T | undefined {
  return cache.get(key) as T | undefined;
}

export function setViewCache<T>(key: string, value: T): void {
  cache.set(key, value);
}

/** Chamado no logout: nada de uma sessão pode aparecer para quem logar em seguida. */
export function clearViewCache(): void {
  cache.clear();
}
