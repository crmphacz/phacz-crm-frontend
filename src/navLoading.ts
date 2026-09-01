import { useEffect } from 'react';
import { useStore } from './store';

/**
 * Dispensa o toast de "Carregando informações…" (disparado em `setView` na store ao abrir uma
 * tela que busca dados) assim que `ready` fica `true`.
 *
 * Uso: a tela passa o próprio sinal de carregamento concluído — normalmente `!loading`, ou um
 * estado que vira `true` no `.finally()` da chamada de API feita no `useEffect` de montagem.
 * O `seq` da navegação é capturado no efeito: se a pessoa trocar de menu de novo antes desta
 * tela terminar, o sinal atrasado é ignorado pela store (ver `finishNavLoading`).
 */
export function useViewReady(ready: boolean) {
  const navLoadSeq = useStore((s) => s.navLoadSeq);
  const finishNavLoading = useStore((s) => s.finishNavLoading);

  useEffect(() => {
    if (ready) finishNavLoading(navLoadSeq);
  }, [ready, navLoadSeq, finishNavLoading]);
}
