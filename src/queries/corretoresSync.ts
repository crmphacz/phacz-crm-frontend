import { useEffect } from 'react';
import { corretoresApi } from '../api/endpoints';
import { useStore } from '../store';

const INTERVALO_MS = 15_000;
// Teto da listagem em massa (ver corretoresApi.list): acima disso `total` do banco nunca bate
// com o tamanho da lista carregada, então a comparação inicial abaixo não vale.
const TETO_LISTAGEM = 2000;

/**
 * Mantém Pipeline, funis, Dashboard e contadores atualizados quando corretores entram no banco
 * por fora do app (automação de tráfego/Make) — sem a pessoa precisar recarregar a página.
 *
 * A cada poucos segundos (só com a aba visível) consulta uma sonda barata (total + cadastro mais
 * recente). Só quando algo mudou rebusca a listagem, que é aplicada por `reloadCorretores` sem
 * perder o histórico já carregado dos corretores abertos. Ao voltar para a aba, checa na hora.
 */
export function useCorretoresLiveSync(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;

    let ativo = true;
    let emAndamento = false;
    let assinatura: string | null = null;

    async function verificar() {
      if (emAndamento || document.visibilityState !== 'visible') return;
      emAndamento = true;
      try {
        const { total, maisRecenteId } = await corretoresApi.sonda();
        if (!ativo) return;
        const nova = `${total}:${maisRecenteId ?? ''}`;

        // Primeira sonda: se já difere do que o bootstrap carregou (lead entrou entre a carga
        // inicial e agora), atualiza; senão só grava a referência para as próximas comparações.
        const localTotal = useStore.getState().corretores.length;
        const mudou = assinatura === null
          ? total <= TETO_LISTAGEM && total !== localTotal
          : nova !== assinatura;

        if (mudou) await useStore.getState().reloadCorretores();
        assinatura = nova;
      } catch {
        // Falha de rede/sessão não deve interromper a tela — a próxima rodada tenta de novo.
      } finally {
        emAndamento = false;
      }
    }

    verificar();
    const timer = setInterval(verificar, INTERVALO_MS);
    const aoVoltar = () => { if (document.visibilityState === 'visible') verificar(); };
    document.addEventListener('visibilitychange', aoVoltar);
    window.addEventListener('online', aoVoltar);

    return () => {
      ativo = false;
      clearInterval(timer);
      document.removeEventListener('visibilitychange', aoVoltar);
      window.removeEventListener('online', aoVoltar);
    };
  }, [enabled]);
}
