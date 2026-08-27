/**
 * Estado (27 UFs, fixo — não precisa de API pra isso) + cidade (autocomplete via API pública
 * do IBGE, sem chave, filtrada pelo estado escolhido). Usado no cadastro/edição de corretor e
 * cliente final.
 */
import { useEffect, useState } from 'react';

export interface UfOption {
  sigla: string;
  nome: string;
}

export const UF_OPTIONS: UfOption[] = [
  { sigla: 'AC', nome: 'Acre' },
  { sigla: 'AL', nome: 'Alagoas' },
  { sigla: 'AP', nome: 'Amapá' },
  { sigla: 'AM', nome: 'Amazonas' },
  { sigla: 'BA', nome: 'Bahia' },
  { sigla: 'CE', nome: 'Ceará' },
  { sigla: 'DF', nome: 'Distrito Federal' },
  { sigla: 'ES', nome: 'Espírito Santo' },
  { sigla: 'GO', nome: 'Goiás' },
  { sigla: 'MA', nome: 'Maranhão' },
  { sigla: 'MT', nome: 'Mato Grosso' },
  { sigla: 'MS', nome: 'Mato Grosso do Sul' },
  { sigla: 'MG', nome: 'Minas Gerais' },
  { sigla: 'PA', nome: 'Pará' },
  { sigla: 'PB', nome: 'Paraíba' },
  { sigla: 'PR', nome: 'Paraná' },
  { sigla: 'PE', nome: 'Pernambuco' },
  { sigla: 'PI', nome: 'Piauí' },
  { sigla: 'RJ', nome: 'Rio de Janeiro' },
  { sigla: 'RN', nome: 'Rio Grande do Norte' },
  { sigla: 'RS', nome: 'Rio Grande do Sul' },
  { sigla: 'RO', nome: 'Rondônia' },
  { sigla: 'RR', nome: 'Roraima' },
  { sigla: 'SC', nome: 'Santa Catarina' },
  { sigla: 'SP', nome: 'São Paulo' },
  { sigla: 'SE', nome: 'Sergipe' },
  { sigla: 'TO', nome: 'Tocantins' },
];

const cidadesPorUfCache = new Map<string, Promise<string[]>>();

interface IbgeMunicipio {
  nome: string;
}

/** Busca (com cache em memória — a lista de municípios de um estado não muda na sessão) a
 * lista de cidades de uma UF na API pública do IBGE, já ordenada alfabeticamente. */
export function fetchCidadesPorUf(uf: string): Promise<string[]> {
  if (!uf) return Promise.resolve([]);

  const cached = cidadesPorUfCache.get(uf);
  if (cached) return cached;

  const promise = fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${uf}/municipios`)
    .then((res) => {
      if (!res.ok) throw new Error('Falha ao buscar cidades do IBGE');
      return res.json() as Promise<IbgeMunicipio[]>;
    })
    .then((municipios) => municipios.map((m) => m.nome).sort((a, b) => a.localeCompare(b, 'pt-BR')))
    .catch(() => {
      // Autocomplete é só uma ajuda pra digitar — se a API do IBGE falhar/estiver fora do ar,
      // o campo de cidade continua um texto livre normal, sem sugestões.
      cidadesPorUfCache.delete(uf);
      return [];
    });

  cidadesPorUfCache.set(uf, promise);
  return promise;
}

/** Refaz a busca de cidades sempre que a UF muda; devolve [] enquanto não há UF selecionada. */
export function useCidadesPorUf(uf: string): string[] {
  const [cidades, setCidades] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;
    fetchCidadesPorUf(uf).then((lista) => {
      if (!cancelled) setCidades(lista);
    });
    return () => {
      cancelled = true;
    };
  }, [uf]);

  return cidades;
}
