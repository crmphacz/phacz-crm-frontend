import { QueryClient } from '@tanstack/react-query';

/**
 * Instância única, compartilhada entre o Provider (main.tsx) e qualquer sincronização de cache
 * feita fora de componentes React (ver src/queries/corretores.ts) — precisa ser a mesma
 * instância nos dois lugares, senão a sincronização escreve num cache que a UI não lê.
 */
export const queryClient = new QueryClient();
