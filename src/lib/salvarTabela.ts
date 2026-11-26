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
 * 1. A PLANILHA, como texto. É o que a tela mostra, e é o que precisa estar gravado para o
 *    salvamento valer. Como texto, o servidor nunca a monta na memória — passa a string direto
 *    ao Postgres.
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

export async function salvarTabelaEmPartes(
  id: string,
  sheets: Sheet[],
  { nome, onProgresso }: OpcoesDeSalvamento = {}
): Promise<ResultadoDoSalvamento> {
  const res = await tabelasEmpreendimentosApi.salvarPlanilha(id, {
    nome,
    dadosJson: JSON.stringify(sheets),
  });

  const celulas = celulasDasAbas(sheets);
  // Pelo menos uma página, mesmo sem célula nenhuma: é ela que limpa o que havia antes, e uma
  // planilha esvaziada precisa chegar ao servidor como esvaziada.
  const paginas = Math.max(1, Math.ceil(celulas.length / CELULAS_POR_LOTE));

  let gravadas = 0;
  for (let pagina = 0; pagina < paginas; pagina++) {
    onProgresso?.(pagina, paginas);
    const lote = await tabelasEmpreendimentosApi.salvarCelulas(id, {
      pagina,
      total: paginas,
      celulas: celulas.slice(pagina * CELULAS_POR_LOTE, (pagina + 1) * CELULAS_POR_LOTE),
    });
    gravadas += lote.gravadas;
  }

  return { atualizadoEm: res.atualizadoEm, atualizadoPorNome: res.atualizadoPorNome, gravadas };
}
