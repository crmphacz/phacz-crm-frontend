import { useQuery } from '@tanstack/react-query';
import { corretoresApi } from '../api/endpoints';
import { queryClient } from '../queryClient';
import { useStore } from '../store';

export const corretoresQueryKey = ['corretores'] as const;

// A lista de corretores continua sendo escrita em vários lugares fora do Pipeline (painel de
// detalhe, criação de corretor, etc.) direto na store do Zustand — que continua sendo a fonte
// lida por eles. Em vez de invalidar o cache do TanStack Query em cada uma dessas ações, esta
// assinatura espelha qualquer mudança de `corretores` da store pro cache assim que ela
// acontecer, então o Pipeline nunca lê uma lista desatualizada ao reabrir dentro do staleTime.
useStore.subscribe((state, prevState) => {
  if (state.corretores !== prevState.corretores) {
    queryClient.setQueryData(corretoresQueryKey, state.corretores);
  }
});

/**
 * Cache/memoização (TanStack Query) da listagem completa de corretores usada pelo Pipeline.
 * `staleTime` evita rebuscar ao trocar de tela e voltar dentro da janela; passado isso, o
 * React Query revalida em background sem travar a tela — a automação de tráfego inclui leads
 * no banco o tempo todo, então o cache não pode ficar parado por muito tempo.
 */
export function useCorretoresQuery() {
  return useQuery({
    queryKey: corretoresQueryKey,
    queryFn: corretoresApi.list,
    staleTime: 30_000,
  });
}
