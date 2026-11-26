import { ApiError } from '../api/client';

/**
 * Comprime o corpo JSON de uma requisição grande.
 *
 * O ganho é de rede e de servidor ao mesmo tempo: este JSON é extremamente repetitivo — a mesma
 * formatação descrita célula a célula — e costuma cair a menos de um quinto do tamanho. Medido
 * numa planilha real da casa: 13,8 MB viram 2,3 MB.
 *
 * O servidor não precisa de nada para isso: `express.json` descomprime `Content-Encoding: gzip`
 * sozinho, e o limite de tamanho dele passa a valer sobre o conteúdo descomprimido.
 *
 * NOTA SOBRE O QUE ISTO **NÃO** RESOLVE, porque já foi mal diagnosticado uma vez: não existe
 * aqui um teto de ~4,5 MB por requisição. O backend roda no Render atrás da Cloudflare, e um
 * corpo de 10,8 MB sem compressão nenhuma atravessa os dois em 3,4 s. O que derrubava o
 * salvamento era MEMÓRIA do servidor (instância de 512 MB), e quem resolve isso é mandar a
 * planilha como texto e as células em lotes — ver lib/salvarTabela.
 */

/**
 * Teto do corpo DESCOMPRIMIDO.
 *
 * O limite é de memória do servidor, não de rede: comprimido ou não, o `express.json` precisa
 * ter o texto inteiro para entregá-lo à rota, e a instância tem 512 MB. 25 MB de texto já pedem
 * mais de 100 MB entre o buffer recebido, a string montada e o valor extraído.
 *
 * Acima disso a tela recusa antes de enviar: é melhor saber na hora, com um caminho a seguir,
 * do que esperar o envio inteiro para o processo morrer do outro lado.
 */
export const LIMITE_DO_CORPO_BYTES = 25 * 1024 * 1024;

export interface CorpoPronto {
  body: Blob | string;
  headers?: Record<string, string>;
  /** Tamanho antes de comprimir — é ele que dita o custo no servidor. */
  bytesCru: number;
  /** Quanto de fato trafega. */
  bytes: number;
}

/** `CompressionStream` existe no Chrome/Edge 80+, Safari 16.4+ e Firefox 113+. */
function suportaGzip(): boolean {
  return typeof CompressionStream !== 'undefined';
}

/**
 * Serializa e comprime. Sem suporte a gzip no navegador, devolve o texto puro — o corpo chega
 * do mesmo jeito, só mais devagar.
 */
export async function corpoJsonComprimido(valor: unknown): Promise<CorpoPronto> {
  const texto = JSON.stringify(valor);
  const bytesCru = new Blob([texto]).size;

  if (!suportaGzip()) {
    return { body: texto, bytesCru, bytes: bytesCru };
  }

  const fluxo = new Blob([texto]).stream().pipeThrough(new CompressionStream('gzip'));
  const comprimido = await new Response(fluxo).blob();

  return {
    body: comprimido,
    headers: { 'Content-Encoding': 'gzip' },
    bytesCru,
    bytes: comprimido.size,
  };
}

/** Em MB com uma casa, para caber numa mensagem lida por quem não é da área. */
function emMB(bytes: number): string {
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

/**
 * Recusa aqui o que o servidor não conseguiria processar — mas com uma mensagem que diz o que
 * fazer, em vez de deixar a pessoa esperar o envio inteiro para receber uma falha sem
 * explicação.
 */
export function conferirTamanho(corpo: CorpoPronto, oQueFazer: string): void {
  if (corpo.bytesCru <= LIMITE_DO_CORPO_BYTES) return;
  throw new ApiError(
    413,
    `O conteúdo ficou grande demais para enviar de uma vez (${emMB(corpo.bytesCru)}, ` +
      `o limite é ${emMB(LIMITE_DO_CORPO_BYTES)}). ${oQueFazer}`
  );
}
