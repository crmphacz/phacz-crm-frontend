import { ApiError } from '../api/client';

/**
 * Comprime o corpo JSON de uma requisição grande, porque a API roda como Vercel Function e
 * elas recusam qualquer requisição cujo corpo passe de ~4,5 MB.
 *
 * O limite é da PLATAFORMA, não do Express: a recusa acontece antes de o nosso código rodar,
 * então `express.json({ limit })` não tem como afrouxá-lo. Pior, a resposta de recusa não
 * carrega os cabeçalhos de CORS que o nosso app acrescenta — o navegador então não consegue
 * nem ler o status, o `fetch` rejeita como se fosse falha de rede, e a tela só tem como dizer
 * "não foi possível salvar". Era o que acontecia ao salvar uma pasta de trabalho importada do
 * Excel: nenhuma requisição chegava ao servidor e nada no erro dizia por quê.
 *
 * A saída é mandar menos bytes. Este JSON é extremamente repetitivo — a mesma formatação
 * descrita célula a célula —, então o gzip costuma deixá-lo perto de um décimo do tamanho. E o
 * servidor não precisa de nada novo: `express.json` já descomprime `Content-Encoding: gzip`
 * sozinho, e o teto de 48 MB de lá passa a valer sobre o conteúdo descomprimido, que é onde ele
 * sempre quis valer.
 */

/**
 * Teto da plataforma, com margem. A Vercel documenta ~4,5 MB por requisição; 4 MB deixa espaço
 * para cabeçalhos e para o overhead do multipart do próprio protocolo.
 */
export const LIMITE_DO_CORPO_BYTES = 4 * 1024 * 1024;

export interface CorpoPronto {
  body: Blob | string;
  headers?: Record<string, string>;
  /** Quanto vai de fato pela rede — usado nas mensagens de erro. */
  bytes: number;
}

/** `CompressionStream` existe no Chrome/Edge 80+, Safari 16.4+ e Firefox 113+. */
function suportaGzip(): boolean {
  return typeof CompressionStream !== 'undefined';
}

/**
 * Serializa e comprime. Sem suporte a gzip no navegador, devolve o texto puro — vale tentar: o
 * corpo pode estar abaixo do limite mesmo sem compressão, e recusar antes de tentar seria pior.
 */
export async function corpoJsonComprimido(valor: unknown): Promise<CorpoPronto> {
  const texto = JSON.stringify(valor);

  if (!suportaGzip()) {
    return { body: texto, bytes: new Blob([texto]).size };
  }

  const fluxo = new Blob([texto]).stream().pipeThrough(new CompressionStream('gzip'));
  const comprimido = await new Response(fluxo).blob();

  return {
    body: comprimido,
    headers: { 'Content-Encoding': 'gzip' },
    bytes: comprimido.size,
  };
}

/** Em MB com uma casa, para caber numa mensagem lida por quem não é da área. */
function emMB(bytes: number): string {
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

/**
 * Recusa aqui o que a plataforma recusaria lá — mas com uma mensagem que diz o que fazer.
 *
 * Sem isto, o corpo grande demais sai do navegador, morre no caminho e volta como falha de
 * rede: a pessoa espera o envio inteiro para receber um erro que não explica nada e não sugere
 * nada. A conta é feita sobre o tamanho JÁ COMPRIMIDO, que é o que de fato trafega.
 */
export function conferirTamanho(corpo: CorpoPronto, oQueFazer: string): void {
  if (corpo.bytes <= LIMITE_DO_CORPO_BYTES) return;
  throw new ApiError(
    413,
    `O conteúdo ficou grande demais para enviar de uma vez (${emMB(corpo.bytes)} comprimidos, ` +
      `o limite do servidor é ${emMB(LIMITE_DO_CORPO_BYTES)}). ${oQueFazer}`
  );
}
