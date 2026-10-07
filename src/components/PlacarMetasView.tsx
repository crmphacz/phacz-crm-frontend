import { useEffect, useMemo, useState } from 'react';
import {
  ChevronLeft, ChevronRight, Download, FileText, Pencil, Check, X, Copy, Info, Target, Loader2,
} from 'lucide-react';
import { placarApi } from '../api/endpoints';
import { ApiError } from '../api/client';
import { useStore } from '../store';
import { ViewLoader } from './ViewLoader';
import type { Placar, PlacarPessoa, DefinicaoMetrica, SemanaPlacar, ValorMetrica } from '../types';

/**
 * Placar de metas — a tela que substitui a planilha "ACOMPANHAMENTO".
 *
 * O desenho copia o Excel de propósito: uma coluna por semana, Total, Meta, Faltam e
 * % atingido, com vermelho quando falta e verde quando bate. A Diretoria já lê esse formato
 * todo mês; mudar o layout só criaria trabalho de tradução.
 */

const HOJE = new Date();
const PERIODO_ATUAL = `${HOJE.getFullYear()}-${String(HOJE.getMonth() + 1).padStart(2, '0')}`;

function deslocaPeriodo(periodo: string, meses: number): string {
  const [ano, mes] = periodo.split('-').map(Number);
  const d = new Date(ano, mes - 1 + meses, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function nomeDoPeriodo(periodo: string): string {
  const [ano, mes] = periodo.split('-').map(Number);
  return new Date(ano, mes - 1, 1)
    .toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
    .replace(/^./, (c) => c.toUpperCase());
}

/** Soma o que a pessoa fez numa métrica dentro de uma semana. */
function totalDaSemana(valor: ValorMetrica, semana: SemanaPlacar): number {
  return semana.dias.reduce((soma, dia) => soma + (valor.porDia[dia] ?? 0), 0);
}

/** Mostra a meta rateada sem casas decimais quando a divisão é exata (100/4 = 25, não 25,00). */
function formatarMeta(valor: number): string {
  return Number.isInteger(valor) ? String(valor) : valor.toFixed(1).replace('.', ',');
}

function corDoAtingimento(total: number, meta: number): string {
  if (meta <= 0) return '#9ca3af';
  return total >= meta ? '#16a34a' : '#dc2626';
}

export function PlacarMetasView() {
  const currentUser = useStore((s) => s.currentUser);
  const ehDiretoria = currentUser?.cargo === 'Diretora';

  const [periodo, setPeriodo] = useState(PERIODO_ATUAL);
  const [placar, setPlacar] = useState<Placar | null>(null);
  const [catalogo, setCatalogo] = useState<DefinicaoMetrica[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [pessoaId, setPessoaId] = useState<string | null>(null);

  // Edição de metas: um rascunho local, gravado só no "Salvar" — evita uma requisição por
  // tecla digitada e deixa a Diretoria revisar tudo antes de confirmar.
  const [editando, setEditando] = useState(false);
  const [rascunho, setRascunho] = useState<Record<string, string>>({});
  const [salvando, setSalvando] = useState(false);

  // Meta geral de vendas: a Diretoria digita um número para o mês e o servidor rateia entre
  // os GVs ativos. Rascunho próprio porque grava num endpoint separado das metas de atividade.
  const [metaVendasDraft, setMetaVendasDraft] = useState('');
  const [salvandoMetaVendas, setSalvandoMetaVendas] = useState(false);

  async function salvarMetaVendas() {
    if (!placar) return;
    const valor = Number(metaVendasDraft);
    if (!Number.isFinite(valor) || valor < 0) {
      setErro('Informe um número de vendas válido para a meta do mês.');
      return;
    }
    setSalvandoMetaVendas(true);
    setErro('');
    try {
      setPlacar(await placarApi.salvarMetaVendas(periodo, valor));
      setMetaVendasDraft('');
    } catch (err) {
      setErro(err instanceof ApiError ? err.message : 'Não foi possível salvar a meta de vendas.');
    } finally {
      setSalvandoMetaVendas(false);
    }
  }

  useEffect(() => {
    placarApi.metricas().then(setCatalogo).catch(() => undefined);
  }, []);

  useEffect(() => {
    let vivo = true;
    setCarregando(true);
    setErro('');
    placarApi.get(periodo)
      .then((p) => { if (vivo) { setPlacar(p); setEditando(false); } })
      .catch((err) => { if (vivo) setErro(err instanceof ApiError ? err.message : 'Não foi possível carregar o placar.'); })
      .finally(() => { if (vivo) setCarregando(false); });
    return () => { vivo = false; };
  }, [periodo]);

  const pessoas = placar?.pessoas ?? [];
  const pessoa = useMemo(
    () => pessoas.find((p) => p.userId === pessoaId) ?? pessoas[0] ?? null,
    [pessoas, pessoaId]
  );

  const porChave = useMemo(() => new Map(catalogo.map((m) => [m.chave, m])), [catalogo]);

  function iniciarEdicao() {
    if (!placar) return;
    const inicial: Record<string, string> = {};
    for (const p of placar.pessoas) {
      for (const m of p.metricas) inicial[`${p.userId}:${m.chave}`] = String(m.meta || '');
    }
    setRascunho(inicial);
    setEditando(true);
  }

  async function salvarMetas() {
    if (!placar) return;
    setSalvando(true);
    setErro('');
    try {
      const metas = Object.entries(rascunho).map(([id, valor]) => {
        const [userId, metrica] = id.split(':');
        return { userId, metrica, valorMeta: Number(valor) || 0 };
      });
      setPlacar(await placarApi.salvarMetas(periodo, metas));
      setEditando(false);
    } catch (err) {
      setErro(err instanceof ApiError ? err.message : 'Não foi possível salvar as metas.');
    } finally {
      setSalvando(false);
    }
  }

  async function copiarDoMesAnterior() {
    const anterior = deslocaPeriodo(periodo, -1);
    setSalvando(true);
    setErro('');
    try {
      setPlacar(await placarApi.copiarMetas(anterior, periodo));
    } catch (err) {
      setErro(err instanceof ApiError ? err.message : 'Não foi possível copiar as metas.');
    } finally {
      setSalvando(false);
    }
  }

  if (carregando && !placar) return <ViewLoader label="Carregando placar…" />;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Cabeçalho: mês, exportação e edição */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 md:px-6 py-3 border-b bg-white flex-shrink-0" style={{ borderColor: '#e5e7eb' }}>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setPeriodo((p) => deslocaPeriodo(p, -1))}
            disabled={carregando}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-500 hover:bg-gray-100 border disabled:opacity-40"
            style={{ borderColor: '#e5e7eb' }}
            title="Mês anterior"
          >
            <ChevronLeft size={15} />
          </button>
          <span className="font-questrial text-base text-gray-800 min-w-[150px] text-center flex items-center justify-center gap-2">
            {nomeDoPeriodo(periodo)}
            {/* Enquanto carrega, o mês novo já aparece no cabeçalho — o spinner aqui diz que
                os números abaixo ainda são do mês anterior. */}
            {carregando && <Loader2 size={14} className="animate-spin" style={{ color: '#d55006' }} />}
          </span>
          <button
            onClick={() => setPeriodo((p) => deslocaPeriodo(p, 1))}
            disabled={carregando}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-500 hover:bg-gray-100 border disabled:opacity-40"
            style={{ borderColor: '#e5e7eb' }}
            title="Próximo mês"
          >
            <ChevronRight size={15} />
          </button>
          {periodo !== PERIODO_ATUAL && (
            <button onClick={() => setPeriodo(PERIODO_ATUAL)} className="text-xs font-semibold px-2 py-1 rounded-lg hover:bg-gray-100" style={{ color: '#d55006' }}>
              Mês atual
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => placarApi.exportarXlsx(periodo)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border text-gray-600 hover:bg-gray-50"
            style={{ borderColor: '#e5e7eb' }}
          >
            <Download size={13} /> Excel
          </button>
          <button
            onClick={() => placarApi.exportarPdf(periodo)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border text-gray-600 hover:bg-gray-50"
            style={{ borderColor: '#e5e7eb' }}
          >
            <FileText size={13} /> PDF
          </button>

          {ehDiretoria && !editando && (
            <>
              <button
                onClick={copiarDoMesAnterior}
                disabled={salvando}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border text-gray-600 hover:bg-gray-50 disabled:opacity-60"
                style={{ borderColor: '#e5e7eb' }}
                title={`Repetir as metas de ${nomeDoPeriodo(deslocaPeriodo(periodo, -1))}`}
              >
                <Copy size={13} /> Copiar mês anterior
              </button>
              <button
                onClick={iniciarEdicao}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white hover:opacity-90"
                style={{ backgroundColor: '#d55006' }}
              >
                <Pencil size={13} /> Editar metas
              </button>
            </>
          )}
          {ehDiretoria && editando && (
            <>
              <button
                onClick={() => setEditando(false)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border text-gray-600 hover:bg-gray-50"
                style={{ borderColor: '#e5e7eb' }}
              >
                <X size={13} /> Cancelar
              </button>
              <button
                onClick={salvarMetas}
                disabled={salvando}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white hover:opacity-90 disabled:opacity-60"
                style={{ backgroundColor: '#16a34a' }}
              >
                <Check size={13} /> {salvando ? 'Salvando…' : 'Salvar metas'}
              </button>
            </>
          )}
        </div>
      </div>

      {erro && <p className="text-sm text-red-500 px-4 md:px-6 py-2">{erro}</p>}

      {/* Meta de vendas do mês — um número só, rateado entre os GVs ativos. */}
      {placar && (ehDiretoria || placar.metaVendas.total > 0) && (
        <div
          className="flex flex-wrap items-center gap-3 px-4 md:px-6 py-3 border-b"
          style={{ borderColor: '#e5e7eb', backgroundColor: '#fff7ed' }}
        >
          <Target size={15} style={{ color: '#d55006' }} className="flex-shrink-0" />
          <span className="text-sm font-semibold text-gray-700">Meta de vendas do mês</span>

          {ehDiretoria ? (
            <>
              <input
                type="number"
                min={0}
                className="form-input text-sm"
                style={{ width: 110 }}
                placeholder={String(placar.metaVendas.total || 0)}
                value={metaVendasDraft}
                onChange={(e) => setMetaVendasDraft(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') salvarMetaVendas(); }}
              />
              <button
                onClick={salvarMetaVendas}
                disabled={salvandoMetaVendas || metaVendasDraft === ''}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white hover:opacity-90 disabled:opacity-50"
                style={{ backgroundColor: '#d55006' }}
              >
                {salvandoMetaVendas ? 'Salvando…' : 'Salvar'}
              </button>
            </>
          ) : (
            <span className="text-sm font-bold text-gray-800">{placar.metaVendas.total}</span>
          )}

          <span className="text-xs text-gray-500">
            {placar.metaVendas.gvsAtivos > 0 ? (
              <>
                dividida entre <strong>{placar.metaVendas.gvsAtivos}</strong>{' '}
                {placar.metaVendas.gvsAtivos === 1 ? 'GV ativo' : 'GVs ativos'} ={' '}
                <strong style={{ color: '#d55006' }}>{formatarMeta(placar.metaVendas.porGv)}</strong> para cada
              </>
            ) : (
              'nenhum GV ativo para dividir a meta'
            )}
          </span>
        </div>
      )}

      {/* `relative` ancora o véu de carregamento abaixo. */}
      <div className="flex-1 overflow-auto p-4 md:p-6 space-y-5 relative" style={{ backgroundColor: '#f6f5f3' }}>
        {carregando && placar && (
          // Véu sobre os dados do mês ANTERIOR enquanto o novo não chega: sem ele a tela
          // mostrava números velhos, sem aviso, como se já fossem do mês escolhido.
          <div
            className="absolute inset-0 z-10 flex items-start justify-center pt-16"
            style={{ backgroundColor: 'rgba(246,245,243,0.72)' }}
          >
            <div
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border shadow-sm"
              style={{ borderColor: '#e5e7eb' }}
            >
              <Loader2 size={15} className="animate-spin" style={{ color: '#d55006' }} />
              <span className="text-sm font-semibold text-gray-600">
                Carregando {nomeDoPeriodo(periodo).toLowerCase()}…
              </span>
            </div>
          </div>
        )}
        {pessoas.length === 0 ? (
          <div className="bg-white rounded-2xl border py-16 text-center" style={{ borderColor: '#e5e7eb' }}>
            <p className="text-sm font-semibold text-gray-700">Nenhum placar para {nomeDoPeriodo(periodo)}</p>
            <p className="text-xs text-gray-400 mt-1">
              O placar acompanha SDR, Gerência de Relacionamento e Gerência de Vendas.
            </p>
          </div>
        ) : (
          <>
            {/* Resumo: um cartão por pessoa, para bater o olho e ver quem está longe da meta */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {pessoas.map((p) => (
                <CartaoPessoa
                  key={p.userId}
                  pessoa={p}
                  ativo={pessoa?.userId === p.userId}
                  onClick={() => setPessoaId(p.userId)}
                />
              ))}
            </div>

            {pessoa && placar && (
              <TabelaPlacar
                pessoa={pessoa}
                semanas={placar.semanas}
                catalogo={porChave}
                editando={editando}
                rascunho={rascunho}
                onRascunho={(chave, valor) => setRascunho((r) => ({ ...r, [chave]: valor }))}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}

/** Cartão de resumo: quantas metas a pessoa já bateu no mês. */
function CartaoPessoa({ pessoa, ativo, onClick }: { pessoa: PlacarPessoa; ativo: boolean; onClick: () => void }) {
  const comMeta = pessoa.metricas.filter((m) => m.meta > 0);
  const batidas = comMeta.filter((m) => m.total >= m.meta).length;
  const percentual = comMeta.length > 0 ? Math.round((batidas / comMeta.length) * 100) : 0;

  return (
    <button
      onClick={onClick}
      className="bg-white rounded-2xl border p-4 text-left transition-all hover:shadow-md"
      style={{ borderColor: ativo ? '#d55006' : '#e5e7eb', borderWidth: ativo ? 2 : 1 }}
    >
      <div className="flex items-center gap-2 mb-2">
        <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: pessoa.cor || '#d55006' }} />
        <p className="text-sm font-bold text-gray-800 truncate">{pessoa.nome}</p>
      </div>
      <p className="text-xs text-gray-400 mb-2">{pessoa.cargo}</p>
      {comMeta.length === 0 ? (
        <p className="text-xs text-gray-400">Sem metas definidas</p>
      ) : (
        <>
          <p className="text-2xl font-bold" style={{ color: percentual >= 100 ? '#16a34a' : percentual >= 50 ? '#d55006' : '#dc2626' }}>
            {batidas}<span className="text-sm text-gray-400">/{comMeta.length}</span>
          </p>
          <p className="text-xs text-gray-500">metas batidas</p>
          <div className="h-1.5 rounded-full mt-2 overflow-hidden" style={{ backgroundColor: '#f3f4f6' }}>
            <div
              className="h-full rounded-full"
              style={{ width: `${Math.min(100, percentual)}%`, backgroundColor: percentual >= 100 ? '#16a34a' : '#d55006' }}
            />
          </div>
        </>
      )}
    </button>
  );
}

interface TabelaProps {
  pessoa: PlacarPessoa;
  semanas: SemanaPlacar[];
  catalogo: Map<string, DefinicaoMetrica>;
  editando: boolean;
  rascunho: Record<string, string>;
  onRascunho: (chave: string, valor: string) => void;
}

function TabelaPlacar({ pessoa, semanas, catalogo, editando, rascunho, onRascunho }: TabelaProps) {
  // Agrupa as métricas em blocos, na ordem do catálogo — é a ordem da planilha.
  const blocos = useMemo(() => {
    const mapa = new Map<string, ValorMetrica[]>();
    for (const m of pessoa.metricas) {
      const def = catalogo.get(m.chave);
      if (!def) continue;
      const lista = mapa.get(def.grupo) ?? [];
      lista.push(m);
      mapa.set(def.grupo, lista);
    }
    return [...mapa.entries()];
  }, [pessoa, catalogo]);

  return (
    <div className="bg-white rounded-2xl border overflow-hidden" style={{ borderColor: '#e5e7eb' }}>
      <div className="px-4 py-3 flex items-center gap-2" style={{ backgroundColor: '#d55006' }}>
        <h2 className="font-questrial text-base text-white">
          Placar de {pessoa.nome} — {pessoa.cargo}
        </h2>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr style={{ backgroundColor: '#f9fafb' }}>
              <th className="px-4 py-2.5 text-left text-xs font-bold text-gray-500 uppercase tracking-wider min-w-[220px]">Métrica</th>
              {semanas.map((s) => (
                <th key={s.numero} className="px-3 py-2.5 text-center text-xs font-bold text-gray-500 uppercase whitespace-nowrap">
                  Sem. {s.numero}
                </th>
              ))}
              <th className="px-3 py-2.5 text-center text-xs font-bold text-gray-700 uppercase">Total</th>
              <th className="px-3 py-2.5 text-center text-xs font-bold text-gray-500 uppercase">Meta</th>
              <th className="px-3 py-2.5 text-center text-xs font-bold text-gray-500 uppercase">Faltam</th>
              <th className="px-3 py-2.5 text-center text-xs font-bold text-gray-500 uppercase">%</th>
            </tr>
          </thead>
          <tbody>
            {blocos.map(([grupo, metricas]) => (
              <BlocoMetricas
                key={grupo}
                grupo={grupo}
                metricas={metricas}
                semanas={semanas}
                catalogo={catalogo}
                pessoaId={pessoa.userId}
                editando={editando}
                rascunho={rascunho}
                onRascunho={onRascunho}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function BlocoMetricas({ grupo, metricas, semanas, catalogo, pessoaId, editando, rascunho, onRascunho }: {
  grupo: string; metricas: ValorMetrica[]; semanas: SemanaPlacar[]; catalogo: Map<string, DefinicaoMetrica>;
  pessoaId: string; editando: boolean; rascunho: Record<string, string>; onRascunho: (c: string, v: string) => void;
}) {
  const colunas = semanas.length + 5;

  return (
    <>
      <tr>
        <td colSpan={colunas} className="px-4 py-1.5 text-xs font-bold uppercase tracking-wider" style={{ backgroundColor: '#fff7ed', color: '#9a3412' }}>
          {grupo}
        </td>
      </tr>
      {metricas.map((m) => {
        const def = catalogo.get(m.chave);
        const faltam = Math.max(0, m.meta - m.total);
        const cor = corDoAtingimento(m.total, m.meta);
        const idRascunho = `${pessoaId}:${m.chave}`;

        return (
          <>
            <tr key={m.chave} className="border-b hover:bg-gray-50" style={{ borderColor: '#f3f4f6' }}>
              <td className="px-4 py-2 text-gray-700">
                <span className="inline-flex items-center gap-1.5">
                  {def?.label ?? m.chave}
                  {def?.explicacao && (
                    <span title={def.explicacao} className="text-gray-300 cursor-help">
                      <Info size={12} />
                    </span>
                  )}
                </span>
              </td>
              {semanas.map((s) => {
                const v = totalDaSemana(m, s);
                return (
                  <td key={s.numero} className="px-3 py-2 text-center text-gray-600">
                    {v || <span className="text-gray-300">—</span>}
                  </td>
                );
              })}
              <td className="px-3 py-2 text-center font-bold text-gray-800">{m.total}</td>
              <td className="px-3 py-2 text-center">
                {editando ? (
                  <input
                    type="number"
                    min={0}
                    className="form-input text-sm text-center"
                    style={{ width: 72, padding: '2px 6px' }}
                    value={rascunho[idRascunho] ?? ''}
                    onChange={(e) => onRascunho(idRascunho, e.target.value)}
                  />
                ) : (
                  <span className="text-gray-500">{m.meta || '—'}</span>
                )}
              </td>
              <td className="px-3 py-2 text-center font-semibold" style={{ color: cor }}>
                {m.meta > 0 ? faltam : '—'}
              </td>
              <td className="px-3 py-2 text-center font-bold" style={{ color: cor }}>
                {m.meta > 0 ? `${Math.round((m.total / m.meta) * 100)}%` : '—'}
              </td>
            </tr>

            {/* Quebra por empreendimento — as linhas BL/HR/VB da planilha. */}
            {def?.porEmpreendimento && m.porEmpreendimento && Object.keys(m.porEmpreendimento).length > 0 &&
              Object.entries(m.porEmpreendimento)
                .sort(([a], [b]) => a.localeCompare(b, 'pt-BR'))
                .map(([empreendimento, quantidade]) => (
                  <tr key={`${m.chave}-${empreendimento}`} className="border-b" style={{ borderColor: '#f9fafb' }}>
                    <td className="px-4 py-1.5 pl-10 text-xs text-gray-500">{empreendimento}</td>
                    <td colSpan={semanas.length} />
                    <td className="px-3 py-1.5 text-center text-xs font-semibold text-gray-600">{quantidade}</td>
                    <td colSpan={3} />
                  </tr>
                ))}
          </>
        );
      })}
    </>
  );
}
