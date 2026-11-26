import type { Sheet } from '@fortune-sheet/core';
import { tabelasEmpreendimentosApi } from '../api/endpoints';
import { celulasDasAbas } from './celulasDaPlanilha';

/**
 * Salva uma tabela de custos EM PARTES.
 *
 * O backend roda numa instância de 512 MB. Mandar a pasta de trabalho e todas as células num
 * corpo só obrigava o servidor a ter, ao mesmo tempo, o corpo recebido, o texto descomprimido, a
 * pasta montada em objetos e dezenas de milhares de linhas a gravar — o processo era morto no
 * meio, a requisição voltava 502 e derrubava junto as outras que estivessem em voo.
 *
 * Então vai em duas etapas:
 *
 * 1. A PLANILHA, em lotes de ABAS e como texto. É o que a tela mostra, e é o que precisa estar
 *    gravado para o salvamento valer. Como texto, o servidor nunca a monta na memória — passa a
 *    string direto ao Postgres, que junta os lotes com `||` sobre jsonb.
 * 2. As CÉLULAS, em lotes e em série. São o registro de auditoria e o feed do BI. Em série de
 *    propósito: o ponto é nunca haver mais de um lote em processamento ao mesmo tempo.
 *
 * O preço é não haver mais uma transação única cobrindo tudo. Se um lote falhar, a planilha já
 * está salva e o registro de células fica pela metade até alguém salvar de novo — o próximo
 * salvamento reescreve tudo, então o estado se conserta sozinho.
 *
 * Vive aqui, e não no editor, porque importar uma planilha pela tela de listagem salva pelo
 * mesmo caminho: duplicar o laço deixaria os dois pontos livres para divergir.
 */

/**
 * Células por requisição.
 *
 * O número existe para o pico de memória do servidor não depender do tamanho da planilha: cada
 * requisição carrega um lote, e só. 2000 linhas dão um corpo de poucas centenas de KB, pequeno
 * o bastante para a instância e grande o bastante para uma pasta de 26 mil células caber em
 * treze idas, não em centenas.
 */
export const CELULAS_POR_LOTE = 2000;

/**
 * Tamanho alvo de cada lote de abas, em caracteres do JSON.
 *
 * ~1,5 MB de texto é o que mantém cada requisição barata no servidor mesmo depois de o Express
 * descomprimir, converter em string e fazer o parse — as quatro formas do mesmo conteúdo que
 * convivem na memória dele. Uma aba que sozinha passe disso vai sozinha num lote: dividir uma
 * aba ao meio quebraria o JSON.
 */
const CARACTERES_POR_LOTE_DE_ABAS = 1_500_000;

/**
 * Agrupa as abas em lotes, por TAMANHO e não por quantidade.
 *
 * As abas são muito desiguais — na pasta da casa vão de 20 KB a 840 KB —, então um número fixo
 * de abas por lote daria requisições de tamanhos imprevisíveis, que é justamente o que não pode
 * acontecer quando o limite é memória.
 *
 * Cada aba é serializada UMA vez e os pedaços são juntados como texto: serializar o lote inteiro
 * de novo dobraria o trabalho e a memória do navegador à toa.
 */
function lotesDeAbas(sheets: Sheet[]): string[] {
  const lotes: string[] = [];
  let atual: string[] = [];
  let tamanho = 0;

  const fechar = () => {
    if (atual.length > 0) lotes.push(`[${atual.join(',')}]`);
    atual = [];
    tamanho = 0;
  };

  for (const sheet of sheets) {
    const texto = JSON.stringify(sheet);
    if (atual.length > 0 && tamanho + texto.length > CARACTERES_POR_LOTE_DE_ABAS) fechar();
    atual.push(texto);
    tamanho += texto.length;
  }
  fechar();

  // Planilha sem aba nenhuma ainda precisa chegar ao servidor, para esvaziar a tabela.
  return lotes.length > 0 ? lotes : ['[]'];
}

export interface ResultadoDoSalvamento {
  atualizadoEm: string;
  atualizadoPorNome: string | null;
  /** Quantas células foram gravadas no total, somando os lotes. */
  gravadas: number;
}

export interface OpcoesDeSalvamento {
  nome?: string;
  /** Chamado antes de cada lote, para a tela mostrar em que pé está. */
  onProgresso?: (feitas: number, paginas: number) => void;
}

/**
 * Lê a planilha de volta, uma ABA por requisição.
 *
 * O espelho do salvamento, e pelo mesmo motivo: trazer a pasta inteira numa resposta obrigava o
 * servidor a montá-la em objetos e a serializá-la de novo, e abrir a tabela passou a derrubar o
 * processo assim que ela ganhou conteúdo de verdade.
 *
 * Em série, como na gravação — várias abas em paralelo recriariam o pico que se quer evitar, só
 * que distribuído entre requisições simultâneas.
 */
export async function lerTabelaEmPartes(
  id: string,
  onProgresso?: (feitas: number, total: number) => void
): Promise<{ nome: string; sheets: unknown[]; atualizadoEm: string | null; atualizadoPorNome: string | null }> {
  const cabecalho = await tabelasEmpreendimentosApi.cabecalho(id);

  const sheets: unknown[] = [];
  for (let indice = 0; indice < cabecalho.totalAbas; indice++) {
    onProgresso?.(indice, cabecalho.totalAbas);
    sheets.push(await tabelasEmpreendimentosApi.lerAba(id, indice));
  }

  return {
    nome: cabecalho.nome,
    sheets,
    atualizadoEm: cabecalho.atualizadoEm,
    atualizadoPorNome: cabecalho.atualizadoPorNome,
  };
}

export async function salvarTabelaEmPartes(
  id: string,
  sheets: Sheet[],
  { nome, onProgresso }: OpcoesDeSalvamento = {}
): Promise<ResultadoDoSalvamento> {
  const abas = lotesDeAbas(sheets);
  const celulas = celulasDasAbas(sheets);
  const paginasDeCelulas = Math.max(1, Math.ceil(celulas.length / CELULAS_POR_LOTE));
  // Progresso contado sobre o trabalho TODO: as abas e as células. Contar só as células faria a
  // barra ficar parada durante a parte mais demorada.
  const etapas = abas.length + paginasDeCelulas;
  let feitas = 0;

  let estado: { atualizadoEm?: string; atualizadoPorNome?: string | null } = {};
  for (let pagina = 0; pagina < abas.length; pagina++) {
    onProgresso?.(feitas++, etapas);
    const res = await tabelasEmpreendimentosApi.salvarAbas(id, {
      pagina,
      total: abas.length,
      // O nome vai com a primeira página, que é a que substitui a planilha anterior.
      ...(pagina === 0 && nome ? { nome } : {}),
      abasJson: abas[pagina],
    });
    if (pagina === abas.length - 1) estado = res;
  }
  // Pelo menos uma página, mesmo sem célula nenhuma: é ela que limpa o que havia antes, e uma
  // planilha esvaziada precisa chegar ao servidor como esvaziada.
  let gravadas = 0;
  for (let pagina = 0; pagina < paginasDeCelulas; pagina++) {
    onProgresso?.(feitas++, etapas);
    const lote = await tabelasEmpreendimentosApi.salvarCelulas(id, {
      pagina,
      total: paginasDeCelulas,
      celulas: celulas.slice(pagina * CELULAS_POR_LOTE, (pagina + 1) * CELULAS_POR_LOTE),
    });
    gravadas += lote.gravadas;
  }

  return {
    atualizadoEm: estado.atualizadoEm ?? new Date().toISOString(),
    atualizadoPorNome: estado.atualizadoPorNome ?? null,
    gravadas,
  };
}
