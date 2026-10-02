/**
 * Países aceitos no cadastro de telefone: bandeira, DDI e como o número é digitado.
 *
 * Espelha src/lib/paises.ts do backend (mesma lista de ISO e DDI); aqui tem a mais o que só
 * interessa à tela — bandeira e formatação. Acrescentar um país exige mexer nos dois lados.
 */

export interface Pais {
  /** ISO 3166-1 alfa-2 — é o que vai gravado em Corretor.paisTelefone. */
  iso: string;
  nome: string;
  /** Código internacional, sem o "+". */
  ddi: string;
  /** Emoji da bandeira. */
  bandeira: string;
  /** Tamanhos válidos do número SEM o DDI. O maior define onde a digitação para. */
  digitosLocais: number[];
  /**
   * Em quantos dígitos cada bloco do número é quebrado na tela, do maior tamanho local.
   * Ex.: Brasil [2, 5, 4] → (47) 99737-0617; Portugal [3, 3, 3] → 912 345 678.
   */
  grupos: number[];
}

export const PAISES: Pais[] = [
  { iso: 'BR', nome: 'Brasil', ddi: '55', bandeira: '🇧🇷', digitosLocais: [10, 11], grupos: [2, 5, 4] },
  { iso: 'PT', nome: 'Portugal', ddi: '351', bandeira: '🇵🇹', digitosLocais: [9], grupos: [3, 3, 3] },
  { iso: 'US', nome: 'Estados Unidos', ddi: '1', bandeira: '🇺🇸', digitosLocais: [10], grupos: [3, 3, 4] },
  { iso: 'CA', nome: 'Canadá', ddi: '1', bandeira: '🇨🇦', digitosLocais: [10], grupos: [3, 3, 4] },
  { iso: 'AR', nome: 'Argentina', ddi: '54', bandeira: '🇦🇷', digitosLocais: [10, 11], grupos: [2, 4, 5] },
  { iso: 'UY', nome: 'Uruguai', ddi: '598', bandeira: '🇺🇾', digitosLocais: [8, 9], grupos: [3, 3, 3] },
  { iso: 'PY', nome: 'Paraguai', ddi: '595', bandeira: '🇵🇾', digitosLocais: [9], grupos: [3, 3, 3] },
  { iso: 'CL', nome: 'Chile', ddi: '56', bandeira: '🇨🇱', digitosLocais: [9], grupos: [1, 4, 4] },
  { iso: 'CO', nome: 'Colômbia', ddi: '57', bandeira: '🇨🇴', digitosLocais: [10], grupos: [3, 3, 4] },
  { iso: 'PE', nome: 'Peru', ddi: '51', bandeira: '🇵🇪', digitosLocais: [9], grupos: [3, 3, 3] },
  { iso: 'MX', nome: 'México', ddi: '52', bandeira: '🇲🇽', digitosLocais: [10], grupos: [2, 4, 4] },
  { iso: 'ES', nome: 'Espanha', ddi: '34', bandeira: '🇪🇸', digitosLocais: [9], grupos: [3, 3, 3] },
  { iso: 'IT', nome: 'Itália', ddi: '39', bandeira: '🇮🇹', digitosLocais: [9, 10], grupos: [3, 3, 4] },
  { iso: 'FR', nome: 'França', ddi: '33', bandeira: '🇫🇷', digitosLocais: [9], grupos: [1, 2, 2, 2, 2] },
  { iso: 'DE', nome: 'Alemanha', ddi: '49', bandeira: '🇩🇪', digitosLocais: [10, 11], grupos: [4, 7] },
  { iso: 'GB', nome: 'Reino Unido', ddi: '44', bandeira: '🇬🇧', digitosLocais: [10], grupos: [4, 6] },
  { iso: 'CH', nome: 'Suíça', ddi: '41', bandeira: '🇨🇭', digitosLocais: [9], grupos: [2, 3, 2, 2] },
  { iso: 'AO', nome: 'Angola', ddi: '244', bandeira: '🇦🇴', digitosLocais: [9], grupos: [3, 3, 3] },
  { iso: 'MZ', nome: 'Moçambique', ddi: '258', bandeira: '🇲🇿', digitosLocais: [9], grupos: [2, 3, 4] },
];

export const PAIS_PADRAO = 'BR';

const PAIS_POR_ISO = new Map(PAISES.map((p) => [p.iso, p]));

export function paisPorIso(iso: string | null | undefined): Pais {
  return PAIS_POR_ISO.get((iso || PAIS_PADRAO).toUpperCase()) ?? PAIS_POR_ISO.get(PAIS_PADRAO)!;
}

/** Quantos dígitos o número pode ter, no máximo, naquele país. */
export function maxDigitos(pais: Pais): number {
  return Math.max(...pais.digitosLocais);
}

/**
 * Formata o número enquanto se digita, conforme o país.
 *
 * O Brasil mantém o formato que a equipe já conhece — (47) 99737-0617, com o parêntese do DDD
 * — e os demais países usam blocos separados por espaço, que é como se escreve número
 * estrangeiro. Antes isto era fixo no padrão brasileiro: um número português de 9 dígitos
 * saía como "(91) 2345-678", que não é nada.
 */
export function maskTelefone(valor: string, iso: string | null | undefined): string {
  const pais = paisPorIso(iso);
  const digitos = valor.replace(/\D/g, '').slice(0, maxDigitos(pais));
  if (digitos.length === 0) return '';

  if (pais.iso === 'BR') return mascaraBrasil(digitos);

  const partes: string[] = [];
  let resto = digitos;
  for (const tamanho of pais.grupos) {
    if (resto.length === 0) break;
    partes.push(resto.slice(0, tamanho));
    resto = resto.slice(tamanho);
  }
  // Sobra quando o número é maior que a soma dos grupos (ex.: Itália com 10 dígitos).
  if (resto.length > 0) partes.push(resto);
  return partes.join(' ');
}

/** (47) 99737-0617 — o formato que a equipe já usa, com DDD entre parênteses. */
function mascaraBrasil(digitos: string): string {
  if (digitos.length <= 2) return `(${digitos}`;
  if (digitos.length <= 6) return `(${digitos.slice(0, 2)}) ${digitos.slice(2)}`;
  if (digitos.length <= 10) return `(${digitos.slice(0, 2)}) ${digitos.slice(2, 6)}-${digitos.slice(6)}`;
  return `(${digitos.slice(0, 2)}) ${digitos.slice(2, 7)}-${digitos.slice(7)}`;
}

/** Exemplo de como fica um número completo daquele país — vai no placeholder do campo. */
export function exemploTelefone(iso: string | null | undefined): string {
  const pais = paisPorIso(iso);
  return maskTelefone('9'.repeat(maxDigitos(pais)), pais.iso);
}

/** O número está com um tamanho válido para o país? Vazio conta como "ainda não preenchido". */
export function telefoneCompleto(valor: string, iso: string | null | undefined): boolean {
  const digitos = valor.replace(/\D/g, '');
  if (digitos.length === 0) return true;
  return paisPorIso(iso).digitosLocais.includes(digitos.length);
}

/**
 * DDI + número, só dígitos — o formato dos links `tel:` e `wa.me`. Espelha
 * `paraFormatoInternacional` do backend, inclusive a decisão por COMPRIMENTO: um celular com
 * DDD 55 (Santa Maria/RS) começa com os mesmos dígitos do DDI do Brasil, e decidir por prefixo
 * mandaria o link para um número de 11 dígitos, que não existe.
 */
export function paraFormatoInternacional(valor: string, iso: string | null | undefined): string | null {
  const digitos = valor.replace(/\D/g, '');
  if (digitos.length < 8) return null;

  const { ddi, digitosLocais } = paisPorIso(iso);
  if (digitosLocais.includes(digitos.length)) return `${ddi}${digitos}`;
  if (digitos.startsWith(ddi) && digitosLocais.includes(digitos.length - ddi.length)) return digitos;
  return digitos.startsWith(ddi) ? digitos : `${ddi}${digitos}`;
}
