/**
 * Cidade/UF para autocomplete de endereço, via API pública do IBGE. Não há dataset de
 * municípios embutido no projeto — a lista é buscada uma única vez por sessão (o servidor já
 * responde comprimida, ~110KB) e cacheada em memória, já que praticamente nunca muda.
 */

export interface MunicipioBR {
  nome: string;
  uf: string;
}

interface ApiMunicipio {
  nome: string;
  microrregiao?: { mesorregiao?: { UF?: { sigla?: string } } };
}

let municipiosCache: Promise<MunicipioBR[]> | null = null;

export function fetchMunicipiosBrasil(): Promise<MunicipioBR[]> {
  if (!municipiosCache) {
    municipiosCache = fetch('https://servicodados.ibge.gov.br/api/v1/localidades/municipios')
      .then((res) => {
        if (!res.ok) throw new Error('Falha ao carregar lista de municípios');
        return res.json() as Promise<ApiMunicipio[]>;
      })
      .then((data) =>
        data
          .map((m) => ({ nome: m.nome, uf: m.microrregiao?.mesorregiao?.UF?.sigla ?? '' }))
          .filter((m): m is MunicipioBR => Boolean(m.uf))
      )
      .catch((err) => {
        municipiosCache = null; // permite tentar de novo na próxima chamada, em vez de travar num erro permanente
        throw err;
      });
  }
  return municipiosCache;
}

/** As 27 UFs — fixas, não mudam; não vale a pena outra chamada de API só pra isso. */
export const ESTADOS_BR: { sigla: string; nome: string }[] = [
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
