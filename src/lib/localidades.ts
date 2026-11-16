/**
 * Estado e cidade de QUALQUER país — a camada que a tela usa para preencher endereço.
 *
 * O Brasil continua vindo do IBGE (ver ibge.ts): é a fonte oficial, traz os nomes em português
 * e já atende a quase toda a base. Para o resto do mundo, a lista vem de uma API pública sem
 * chave, e os nomes vêm em inglês ("Lisbon District", "Bavaria") — é como a fonte os publica.
 *
 * Sugestão, não validação: se a API estiver fora do ar ou não conhecer o país, a lista volta
 * vazia e os campos seguem como texto livre, exatamente como o de cidade já se comporta quando
 * o IBGE falha. Endereço de cliente não pode ficar impossível de cadastrar porque um serviço de
 * terceiro caiu.
 */
import { useEffect, useState } from 'react';
import { UF_OPTIONS, fetchCidadesPorUf } from './ibge';

const API = 'https://countriesnow.space/api/v0.1/countries';

/**
 * Como cada país se chama na API de localidades.
 *
 * Fica AQUI e não em paises.ts porque paises.ts é espelhado com o backend — acrescentar um
 * campo que só esta API usa obrigaria a mexer nos dois lados por um detalhe de integração.
 * Espelha os ISOs de PAISES; país sem entrada aqui simplesmente não oferece sugestão.
 */
const NOME_NA_API: Record<string, string> = {
  BR: 'Brazil',
  PT: 'Portugal',
  US: 'United States',
  CA: 'Canada',
  AR: 'Argentina',
  UY: 'Uruguay',
  PY: 'Paraguay',
  CL: 'Chile',
  CO: 'Colombia',
  PE: 'Peru',
  MX: 'Mexico',
  ES: 'Spain',
  IT: 'Italy',
  FR: 'France',
  DE: 'Germany',
  GB: 'United Kingdom',
  CH: 'Switzerland',
  AO: 'Angola',
  MZ: 'Mozambique',
};

export interface EstadoOption {
  /** O que vai gravado em `uf`: a sigla no Brasil, o nome do estado fora dele. */
  valor: string;
  /** O que a pessoa lê na lista. */
  label: string;
}

/** O Brasil tem campo próprio (sigla de duas letras); o resto do mundo grava o nome. */
export function ehBrasil(pais: string | null | undefined): boolean {
  return (pais || 'BR').toUpperCase() === 'BR';
}

const estadosCache = new Map<string, Promise<EstadoOption[]>>();
const cidadesCache = new Map<string, Promise<string[]>>();

interface RespostaEstados {
  error?: boolean;
  data?: { states?: { name: string; state_code?: string }[] };
}

interface RespostaCidades {
  error?: boolean;
  data?: string[];
}

/** Estados/províncias do país. No Brasil responde na hora, da lista fixa das 27 UFs. */
export function fetchEstados(pais: string): Promise<EstadoOption[]> {
  if (ehBrasil(pais)) {
    return Promise.resolve(UF_OPTIONS.map((u) => ({ valor: u.sigla, label: u.nome })));
  }

  const nome = NOME_NA_API[(pais || '').toUpperCase()];
  if (!nome) return Promise.resolve([]);

  const cached = estadosCache.get(pais);
  if (cached) return cached;

  const promise = fetch(`${API}/states/q?country=${encodeURIComponent(nome)}`)
    .then((res) => {
      if (!res.ok) throw new Error('Falha ao buscar estados');
      return res.json() as Promise<RespostaEstados>;
    })
    .then((json) => {
      if (json.error || !json.data?.states) return [];
      return json.data.states
        .map((e) => ({ valor: e.name, label: e.name }))
        .sort((a, b) => a.label.localeCompare(b.label));
    })
    .catch(() => {
      // Some do cache para a próxima tentativa valer: uma falha de rede momentânea não pode
      // deixar o campo sem sugestão pelo resto da sessão.
      estadosCache.delete(pais);
      return [];
    });

  estadosCache.set(pais, promise);
  return promise;
}

/** Cidades do estado. No Brasil é o IBGE, pela sigla da UF. */
export function fetchCidades(pais: string, estado: string): Promise<string[]> {
  if (!estado) return Promise.resolve([]);
  if (ehBrasil(pais)) return fetchCidadesPorUf(estado);

  const nome = NOME_NA_API[(pais || '').toUpperCase()];
  if (!nome) return Promise.resolve([]);

  const chave = `${pais}|${estado}`;
  const cached = cidadesCache.get(chave);
  if (cached) return cached;

  const url = `${API}/state/cities/q?country=${encodeURIComponent(nome)}&state=${encodeURIComponent(estado)}`;
  const promise = fetch(url)
    .then((res) => {
      if (!res.ok) throw new Error('Falha ao buscar cidades');
      return res.json() as Promise<RespostaCidades>;
    })
    .then((json) => {
      // `error: true` também cobre o estado digitado à mão que a API não conhece — nesse caso
      // não há sugestão, e o campo de cidade segue aceitando texto livre.
      if (json.error || !Array.isArray(json.data)) return [];
      return [...json.data].sort((a, b) => a.localeCompare(b));
    })
    .catch(() => {
      cidadesCache.delete(chave);
      return [];
    });

  cidadesCache.set(chave, promise);
  return promise;
}

/** Estados do país escolhido; [] enquanto carrega ou quando não há sugestão. */
export function useEstados(pais: string): EstadoOption[] {
  const [estados, setEstados] = useState<EstadoOption[]>([]);

  useEffect(() => {
    let cancelado = false;
    fetchEstados(pais).then((lista) => {
      if (!cancelado) setEstados(lista);
    });
    return () => { cancelado = true; };
  }, [pais]);

  return estados;
}

/** Cidades do estado escolhido, no país escolhido. */
export function useCidades(pais: string, estado: string): string[] {
  const [cidades, setCidades] = useState<string[]>([]);

  useEffect(() => {
    let cancelado = false;
    fetchCidades(pais, estado).then((lista) => {
      if (!cancelado) setCidades(lista);
    });
    return () => { cancelado = true; };
  }, [pais, estado]);

  return cidades;
}
