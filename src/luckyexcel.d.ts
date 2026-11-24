/**
 * O pacote `luckyexcel` não publica tipos. A declaração cobre só o que usamos: a conversão de
 * um .xlsx para o JSON do luckysheet (ver src/lib/importarExcel.ts).
 *
 * O callback de retorno é opcional na assinatura original e não existe callback de erro — num
 * arquivo corrompido a biblioteca escreve no console e nunca responde. É por isso que o
 * importador envolve a chamada num tempo limite em vez de só esperar.
 */
declare module 'luckyexcel' {
  interface LuckyExcelEstatico {
    transformExcelToLucky(
      excelFile: File,
      callBack?: (exportJson: unknown, luckysheetfile: string) => void
    ): void;
    transformExcelToLuckyByUrl(
      url: string,
      name: string,
      callBack?: (exportJson: unknown, luckysheetfile: string) => void
    ): void;
  }
  const LuckyExcel: LuckyExcelEstatico;
  export default LuckyExcel;
}
