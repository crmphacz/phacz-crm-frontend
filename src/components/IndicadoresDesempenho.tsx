import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Info, Save, RotateCcw } from 'lucide-react';
import { useStore } from '../store';
import { placarApi } from '../api/endpoints';
import { ApiError } from '../api/client';
import { formatCurrency } from '../utils';
import { Spinner } from './Spinner';
import type {
  ApuracaoBimestre, CatalogoIndicadores, DefinicaoIndicador, IndicadoresPessoa, ValorIndicador,
} from '../types';

/**
 * Indicadores de Desempenho — a "Política de desempenho comercial" apurada por bimestre.
 *
 * Vive ao lado do placar mensal, e não dentro dele, porque mede outra coisa: o placar mostra
 * volume de trabalho na semana, isto mostra resultado no bimestre, com peso e nota ponderada.
 *
 * O CRM calcula o que consegue e a Diretoria ajusta. Quando há ajuste, a tela mostra os DOIS
 * números — o que vale e o que o sistema tinha calculado —, porque a diferença entre eles é
 * justamente o que uma auditoria precisa enxergar.
 */

/** Bimestre atual no formato "YYYY-Bn". */
function bimestreAtual(): string {
  const hoje = new Date();
  return `${hoje.getFullYear()}-B${Math.ceil((hoje.getMonth() + 1) / 2)}`;
}

function deslocaBimestre(bimestre: string, passos: number): string {
  const [ano, b] = bimestre.split('-B').map(Number);
  const total = ano * 6 + (b - 1) + passos;
  return `${Math.floor(total / 6)}-B${(total % 6) + 1}`;
}

const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
function rotuloDoBimestre(bimestre: string): string {
  const [ano, b] = bimestre.split('-B').map(Number);
  return `${MESES[b * 2 - 2]}–${MESES[b * 2 - 1]} de ${ano}`;
}

function formatarValor(valor: number, formato: DefinicaoIndicador['formato']): string {
  if (formato === 'moeda') return formatCurrency(valor);
  if (formato === 'percentual') return `${valor.toFixed(0)}%`;
  return String(Math.round(valor));
}

export function IndicadoresDesempenho() {
  const currentUser = useStore((s) => s.currentUser);
  const showToast = useStore((s) => s.showToast);
  const ehDiretoria = currentUser?.cargo === 'Diretora';

  const [bimestre, setBimestre] = useState(bimestreAtual);
  const [catalogo, setCatalogo] = useState<CatalogoIndicadores | null>(null);
  const [apuracao, setApuracao] = useState<ApuracaoBimestre | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState(false);

  /** Ajustes em edição, por "userId:indicador". Só o que a Diretoria mexeu nesta sessão. */
  const [rascunho, setRascunho] = useState<Record<string, { meta?: string; realizado?: string }>>({});

  useEffect(() => {
    placarApi.catalogoIndicadores().then(setCatalogo).catch(() => setErro('Não foi possível carregar o catálogo.'));
  }, []);

  useEffect(() => {
    let vivo = true;
    setCarregando(true);
    setErro('');
    setRascunho({});
    placarApi
      .indicadores(bimestre)
      .then((a) => { if (vivo) setApuracao(a); })
      .catch((e) => { if (vivo) setErro(e instanceof ApiError ? e.message : 'Não foi possível carregar a apuração.'); })
      .finally(() => { if (vivo) setCarregando(false); });
    return () => { vivo = false; };
  }, [bimestre]);

  const defPorChave = useMemo(
    () => new Map((catalogo?.indicadores ?? []).map((i) => [i.chave, i])),
    [catalogo]
  );

  const temRascunho = Object.keys(rascunho).length > 0;

  function editar(userId: string, chave: string, campo: 'meta' | 'realizado', valor: string) {
    setRascunho((r) => ({ ...r, [`${userId}:${chave}`]: { ...r[`${userId}:${chave}`], [campo]: valor } }));
  }

  async function salvar() {
    setSalvando(true);
    try {
      const ajustes = Object.entries(rascunho).map(([chaveComposta, campos]) => {
        const [userId, indicador] = chaveComposta.split(':');
        // Campo apagado volta a `null`, que no servidor devolve a linha ao valor calculado.
        // `Number('')` seria 0 — um zero que a Diretoria não digitou.
        const num = (v: string | undefined) => (v === undefined || v.trim() === '' ? null : Number(v));
        return { userId, indicador, meta: num(campos.meta), realizado: num(campos.realizado) };
      });
      setApuracao(await placarApi.salvarIndicadores(bimestre, ajustes));
      setRascunho({});
      showToast('Apuração salva.');
    } catch (e) {
      showToast(e instanceof ApiError ? e.message : 'Não foi possível salvar.', 'error');
    } finally {
      setSalvando(false);
    }
  }

  if (carregando && !apuracao) {
    return (
      <div className="flex items-center justify-center py-16 text-gray-400 gap-2">
        <Spinner size={16} /> Apurando o bimestre…
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setBimestre((b) => deslocaBimestre(b, -1))}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-500 hover:bg-gray-100 transition-colors"
            aria-label="Bimestre anterior"
          >
            <ChevronLeft size={16} />
          </button>
          <span className="font-questrial font-bold text-base text-gray-900 min-w-[150px] text-center">
            {rotuloDoBimestre(bimestre)}
          </span>
          <button
            onClick={() => setBimestre((b) => deslocaBimestre(b, 1))}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-500 hover:bg-gray-100 transition-colors"
            aria-label="Próximo bimestre"
          >
            <ChevronRight size={16} />
          </button>
          {bimestre !== bimestreAtual() && (
            <button onClick={() => setBimestre(bimestreAtual())} className="text-xs font-semibold" style={{ color: '#d55006' }}>
              Bimestre atual
            </button>
          )}
        </div>

        {ehDiretoria && temRascunho && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setRascunho({})}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-gray-500 hover:bg-gray-100"
            >
              <RotateCcw size={13} /> Descartar
            </button>
            <button
              onClick={salvar}
              disabled={salvando}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white disabled:opacity-60"
              style={{ backgroundColor: '#d55006' }}
            >
              {salvando ? <Spinner size={13} className="text-white" /> : <Save size={13} />}
              Salvar apuração
            </button>
          </div>
        )}
      </div>

      {apuracao && (
        <div
          className="flex items-start gap-2 rounded-xl px-3 py-2.5 text-xs"
          style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', color: '#475569' }}
        >
          <Info size={14} className="flex-shrink-0 mt-0.5" style={{ color: '#64748b' }} />
          <p>
            VGV total do bimestre: <strong>{formatCurrency(apuracao.vgvTotal)}</strong>. As metas de
            VGV do canal (SDR e GR) são 20% deste valor, conforme a política — por isso elas só
            ficam definidas depois que o bimestre acontece.
            {ehDiretoria && ' Os campos de meta e realizado podem ser ajustados; em branco, vale o que o sistema calculou.'}
          </p>
        </div>
      )}

      {erro && <p className="text-sm text-red-500">{erro}</p>}

      {apuracao?.pessoas.length === 0 && (
        <p className="text-sm text-gray-400 py-10 text-center">
          Nenhuma pessoa com indicadores neste bimestre.
        </p>
      )}

      {apuracao?.pessoas.map((pessoa) => (
        <CartaoPessoa
          key={pessoa.userId}
          pessoa={pessoa}
          defPorChave={defPorChave}
          editavel={ehDiretoria}
          rascunho={rascunho}
          onEditar={editar}
        />
      ))}
    </div>
  );
}

function CartaoPessoa({ pessoa, defPorChave, editavel, rascunho, onEditar }: {
  pessoa: IndicadoresPessoa;
  defPorChave: Map<string, DefinicaoIndicador>;
  editavel: boolean;
  rascunho: Record<string, { meta?: string; realizado?: string }>;
  onEditar: (userId: string, chave: string, campo: 'meta' | 'realizado', valor: string) => void;
}) {
  const corDaNota = pessoa.nota >= 100 ? '#166534' : pessoa.nota >= 70 ? '#854d0e' : '#b91c1c';

  return (
    <div className="bg-white rounded-2xl border overflow-hidden" style={{ borderColor: '#e5e7eb' }}>
      <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: '#f3f4f6' }}>
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: pessoa.cor }} />
          <h3 className="font-questrial font-bold text-sm text-gray-900 truncate">{pessoa.nome}</h3>
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ backgroundColor: '#f1f5f9', color: '#475569' }}>
            {pessoa.cargo}
          </span>
        </div>
        <div className="text-right flex-shrink-0">
          <p className="text-lg font-bold leading-none" style={{ color: corDaNota }}>{pessoa.nota.toFixed(0)}</p>
          <p className="text-[10px] text-gray-400 mt-0.5">
            {/* Quando algum indicador ficou fora por falta de meta, dizer com quanto peso a
                nota foi calculada evita que ela pareça comparável com a de quem teve todos. */}
            {pessoa.pesoConsiderado < 100 ? `de ${pessoa.pesoConsiderado}% do peso` : 'nota ponderada'}
          </p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-gray-400" style={{ backgroundColor: '#fafafa' }}>
              <th className="text-left font-bold px-4 py-2">Indicador</th>
              <th className="text-right font-bold px-3 py-2 whitespace-nowrap">Meta</th>
              <th className="text-right font-bold px-3 py-2 whitespace-nowrap">Realizado</th>
              <th className="text-right font-bold px-3 py-2">Ating.</th>
              <th className="text-right font-bold px-3 py-2">Peso</th>
              <th className="text-right font-bold px-4 py-2">Pontos</th>
            </tr>
          </thead>
          <tbody>
            {pessoa.indicadores.map((valor) => (
              <LinhaIndicador
                key={valor.chave}
                valor={valor}
                def={defPorChave.get(valor.chave)}
                userId={pessoa.userId}
                editavel={editavel}
                rascunho={rascunho[`${pessoa.userId}:${valor.chave}`]}
                onEditar={onEditar}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function LinhaIndicador({ valor, def, userId, editavel, rascunho, onEditar }: {
  valor: ValorIndicador;
  def?: DefinicaoIndicador;
  userId: string;
  editavel: boolean;
  rascunho?: { meta?: string; realizado?: string };
  onEditar: (userId: string, chave: string, campo: 'meta' | 'realizado', valor: string) => void;
}) {
  if (!def) return null;

  const pontos = valor.atingimento === null ? null : valor.atingimento * def.peso;
  // A meta de canal não é digitada: é 20% do VGV do bimestre, e deixar o campo editável
  // sugeriria que a Diretoria escolhe um número que a política já define.
  const metaEditavel = editavel && def.metaFracaoDoVgvTotal === undefined;

  return (
    <tr className="border-t" style={{ borderColor: '#f9fafb' }}>
      <td className="px-4 py-2.5">
        <span className="font-semibold text-gray-800" title={def.explicacao}>{def.label}</span>
        {valor.ajustado && (
          <span
            className="ml-2 text-[10px] font-bold px-1.5 py-0.5 rounded"
            style={{ backgroundColor: '#fff7ed', color: '#9a3412' }}
            title={`O sistema calculou ${formatarValor(valor.calculado, def.formato)}. ${valor.observacao || 'Ajustado pela Diretoria.'}`}
          >
            ajustado
          </span>
        )}
      </td>

      <td className="px-3 py-2.5 text-right whitespace-nowrap">
        {metaEditavel ? (
          <input
            type="number"
            min={0}
            className="w-28 text-right text-xs rounded-lg px-2 py-1 border"
            style={{ borderColor: '#e5e7eb' }}
            placeholder={formatarValor(valor.meta, def.formato)}
            value={rascunho?.meta ?? ''}
            onChange={(e) => onEditar(userId, valor.chave, 'meta', e.target.value)}
          />
        ) : (
          <span className="text-gray-600">{formatarValor(valor.meta, def.formato)}</span>
        )}
      </td>

      <td className="px-3 py-2.5 text-right whitespace-nowrap">
        {editavel ? (
          <input
            type="number"
            min={0}
            className="w-28 text-right text-xs rounded-lg px-2 py-1 border"
            style={{ borderColor: '#e5e7eb' }}
            placeholder={formatarValor(valor.calculado, def.formato)}
            value={rascunho?.realizado ?? ''}
            onChange={(e) => onEditar(userId, valor.chave, 'realizado', e.target.value)}
          />
        ) : (
          <span className="font-semibold text-gray-800">{formatarValor(valor.realizado, def.formato)}</span>
        )}
      </td>

      <td className="px-3 py-2.5 text-right whitespace-nowrap">
        {valor.atingimento === null ? (
          <span className="text-gray-300" title="Sem meta definida para este bimestre — a linha fica fora da nota.">—</span>
        ) : (
          <span style={{ color: valor.atingimento >= 1 ? '#166534' : '#6b7280' }}>
            {(valor.atingimento * 100).toFixed(0)}%
          </span>
        )}
      </td>

      <td className="px-3 py-2.5 text-right text-gray-400">{def.peso}%</td>
      <td className="px-4 py-2.5 text-right font-semibold text-gray-700">
        {pontos === null ? <span className="text-gray-300">—</span> : pontos.toFixed(1)}
      </td>
    </tr>
  );
}
