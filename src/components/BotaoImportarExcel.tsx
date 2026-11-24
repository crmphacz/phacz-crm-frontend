import { useRef, useState } from 'react';
import { Upload } from 'lucide-react';
import { Spinner } from './Spinner';
import { ApiError } from '../api/client';
import type { PlanilhaImportada } from '../lib/importarExcel';

/**
 * Botão que lê um .xlsx e entrega a planilha já convertida para quem chamou.
 *
 * A conversão fica aqui e a gravação fica com a tela: a lista cria uma tabela nova com o
 * conteúdo importado, enquanto o editor substitui o conteúdo da tabela aberta. São destinos
 * diferentes para o mesmo arquivo, e só o caminho até o JSON é comum.
 *
 * O aviso em tela cheia não é enfeite. A leitura roda na própria aba do navegador e trava a
 * interface por alguns segundos numa pasta de trabalho grande — sem ele, a tela ficaria
 * congelada sem explicação e a pessoa clicaria de novo.
 */
export function BotaoImportarExcel({
  onImportado,
  onErro,
  rotulo = 'Importar Excel',
  variante = 'secundario',
}: {
  /** Recebe a planilha convertida; o que for devolvido é aguardado antes de fechar o aviso. */
  onImportado: (planilha: PlanilhaImportada) => Promise<void> | void;
  onErro: (mensagem: string) => void;
  rotulo?: string;
  variante?: 'primario' | 'secundario';
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [etapa, setEtapa] = useState<'lendo' | 'gravando' | null>(null);

  async function aoEscolherArquivo(e: React.ChangeEvent<HTMLInputElement>) {
    const arquivo = e.target.files?.[0];
    // Limpa já: sem isto, escolher o MESMO arquivo de novo não dispara `change` e o botão
    // parece quebrado justamente em quem está tentando reimportar depois de um erro.
    e.target.value = '';
    if (!arquivo) return;

    setEtapa('lendo');

    // O conversor carrega só agora, e não junto com a tela: ele arrasta o leitor de zip e o
    // parser de .xlsx, que pesam mais que a tela inteira e não servem para quem só veio
    // consultar uma tabela.
    let importador: typeof import('../lib/importarExcel');
    try {
      importador = await import('../lib/importarExcel');
    } catch {
      setEtapa(null);
      onErro('Não foi possível carregar o leitor de planilhas. Verifique a conexão e tente de novo.');
      return;
    }

    // A fase também vive numa variável local: o `etapa` do estado fica desatualizado dentro
    // deste mesmo fluxo, e é ela que decide se a falha foi ao LER o arquivo ou ao GRAVAR.
    // Dizer "confira se o arquivo abre no Excel" depois de uma recusa do servidor manda a
    // pessoa procurar defeito numa planilha que estava perfeita.
    let fase: 'lendo' | 'gravando' = 'lendo';
    try {
      const planilha = await importador.importarExcel(arquivo);
      fase = 'gravando';
      setEtapa('gravando');
      await onImportado(planilha);
    } catch (err) {
      if (err instanceof importador.ErroDeImportacao || err instanceof ApiError) {
        onErro(err.message);
      } else if (fase === 'lendo') {
        onErro('Não foi possível ler esta planilha. Confira se o arquivo abre no Excel sem erro.');
      } else {
        onErro('A planilha foi lida, mas não foi possível gravá-la no CRM. Tente de novo.');
      }
    } finally {
      setEtapa(null);
    }
  }

  const primario = variante === 'primario';

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        className="hidden"
        onChange={aoEscolherArquivo}
      />

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={etapa !== null}
        className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg transition-colors flex-shrink-0 disabled:opacity-50 ${
          primario ? 'text-white hover:opacity-90' : 'border text-gray-700 bg-white hover:bg-gray-50'
        }`}
        style={primario ? { backgroundColor: '#d55006' } : { borderColor: '#e5e7eb' }}
      >
        {etapa ? <Spinner size={15} /> : <Upload size={16} />}
        <span className="hidden sm:inline">{rotulo}</span>
      </button>

      {etapa && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="bg-white rounded-2xl shadow-2xl px-6 py-5 w-full max-w-sm mx-3 text-center">
            <Spinner size={26} className="text-[#d55006] mx-auto" />
            <p className="mt-3 text-sm font-semibold text-gray-800">
              {etapa === 'lendo' ? 'Lendo a planilha…' : 'Gravando no CRM…'}
            </p>
            <p className="mt-1 text-xs text-gray-500">
              {etapa === 'lendo'
                ? 'Pastas de trabalho grandes levam alguns segundos. Não feche esta aba.'
                : 'Guardando as abas, os valores e a formatação.'}
            </p>
          </div>
        </div>
      )}
    </>
  );
}
