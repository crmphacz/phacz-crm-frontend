import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Trophy, Building2, Ticket, Gift, Lock, RefreshCw, ArrowUp, ArrowDown, Minus,
  AlertTriangle, Dices, X,
} from 'lucide-react';
import { useStore } from '../store';
import { formatCurrency } from '../utils';
import { ApiError } from '../api/client';
import {
  sommarApi, periodoAtual, rotuloDoPeriodo,
  type SommarRanking, type SommarExtrato, type SommarCupom, type SommarPeriodo,
  type SommarLinhaCorretor, type SommarNivel, type SommarResgate,
} from '../api/sommar';

/**
 * Programa SÕMMAR Elite.
 *
 * A tela não recalcula nada: faixa, pontos que faltam, saldo resgatável e se pode resgatar vêm
 * prontos do backend. Regra repetida aqui divergiria do servidor na primeira mudança, e o
 * corretor veria um número na tela e outro no extrato — que é justamente o documento da
 * contestação (item 12.2).
 */

type Aba = 'corretores' | 'imobiliarias' | 'cupons' | 'resgates';

const ABAS: { id: Aba; label: string; icone: typeof Trophy }[] = [
  { id: 'corretores', label: 'Participantes', icone: Trophy },
  { id: 'imobiliarias', label: 'Imobiliárias', icone: Building2 },
  { id: 'cupons', label: 'Cupons', icone: Ticket },
  { id: 'resgates', label: 'Resgates', icone: Gift },
];

/** Cores das faixas, na mesma leitura visual dos cartões da política. */
const COR_NIVEL: Record<SommarNivel['chave'], { fundo: string; texto: string; borda: string }> = {
  SILVER: { fundo: '#f1f5f9', texto: '#475569', borda: '#cbd5e1' },
  GOLD: { fundo: '#fef3c7', texto: '#92400e', borda: '#fcd34d' },
  PLATINUM: { fundo: '#e5e7eb', texto: '#374151', borda: '#9ca3af' },
  DIAMOND: { fundo: '#ffedd5', texto: '#9a3412', borda: '#fb923c' },
};

function NivelTag({ nivel }: { nivel: SommarNivel }) {
  const cor = COR_NIVEL[nivel.chave] ?? COR_NIVEL.SILVER;
  return (
    <span
      className="text-xs px-2.5 py-1 rounded-full font-semibold border whitespace-nowrap"
      style={{ backgroundColor: cor.fundo, color: cor.texto, borderColor: cor.borda }}
    >
      {nivel.nome}
    </span>
  );
}

/**
 * Seta de variação de posição.
 *
 * Estreante mostra "novo", e não um traço: traço significa "manteve a posição", que é
 * afirmação diferente de "não havia no período anterior".
 */
function Variacao({ valor }: { valor: number | null }) {
  if (valor === null) {
    return <span className="text-[11px] text-sky-600 font-medium">novo</span>;
  }
  if (valor === 0) {
    return (
      <span className="inline-flex items-center gap-0.5 text-[11px] text-gray-400">
        <Minus size={12} />
      </span>
    );
  }
  const subiu = valor > 0;
  return (
    <span
      className={`inline-flex items-center gap-0.5 text-[11px] font-semibold ${
        subiu ? 'text-emerald-600' : 'text-rose-600'
      }`}
    >
      {subiu ? <ArrowUp size={12} /> : <ArrowDown size={12} />}
      {Math.abs(valor)}
    </span>
  );
}

export function SommarView() {
  const currentUser = useStore((s) => s.currentUser);
  const ehDiretora = currentUser?.cargo === 'Diretora';

  const [aba, setAba] = useState<Aba>('corretores');
  const [periodo, setPeriodo] = useState(periodoAtual());
  const [periodos, setPeriodos] = useState<SommarPeriodo[]>([]);
  const [ranking, setRanking] = useState<SommarRanking | null>(null);
  const [cupons, setCupons] = useState<SommarCupom[]>([]);
  const [extrato, setExtrato] = useState<SommarExtrato | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErro(null);
    try {
      const [r, ps] = await Promise.all([sommarApi.ranking(periodo), sommarApi.periodos()]);
      setRanking(r);
      setPeriodos(ps);
    } catch (e) {
      setErro(e instanceof ApiError ? e.message : 'Não foi possível carregar o ranking');
    } finally {
      setCarregando(false);
    }
  }, [periodo]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  useEffect(() => {
    if (aba !== 'cupons') return;
    sommarApi.cupons(periodo).then(setCupons).catch(() => setCupons([]));
  }, [aba, periodo]);

  const consolidado = ranking?.consolidadoEm ?? null;

  const periodosDisponiveis = useMemo(() => {
    const lista = periodos.map((p) => p.periodo);
    if (!lista.includes(periodo)) lista.unshift(periodo);
    return lista;
  }, [periodos, periodo]);

  const sorteioDoPeriodo = periodos.find((p) => p.periodo === periodo)?.sorteioEm ?? null;

  async function consolidar() {
    if (
      !window.confirm(
        `Fechar ${rotuloDoPeriodo(periodo)}?\n\n` +
          'O ranking deste mês fica congelado e passa a ser o que a landing page publica. ' +
          'Estornos lançados depois não mudam mais este resultado.'
      )
    ) {
      return;
    }
    try {
      await sommarApi.consolidar(periodo);
      await carregar();
    } catch (e) {
      setErro(e instanceof ApiError ? e.message : 'Não foi possível consolidar o período');
    }
  }

  async function sortear() {
    if (
      !window.confirm(
        `Sortear o ganhador de ${rotuloDoPeriodo(periodo)} entre ${cupons.length} cupons?\n\n` +
          'O sorteio é registrado e não pode ser refeito.'
      )
    ) {
      return;
    }
    try {
      const r = await sommarApi.sortear(periodo);
      window.alert(`Cupom sorteado: nº ${r.cupom.numero} (entre ${r.totalCupons} cupons).`);
      await carregar();
    } catch (e) {
      setErro(e instanceof ApiError ? e.message : 'Não foi possível realizar o sorteio');
    }
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-6xl mx-auto px-4 md:px-6 py-6 md:py-8 space-y-6">
        <header className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">SÕMMAR Elite</h1>
            <p className="text-sm text-gray-500 mt-1">
              Pontuação, níveis, cupons e ranking do programa de relacionamento.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={periodo}
              onChange={(e) => setPeriodo(e.target.value)}
              className="text-sm border rounded-full px-3 py-1.5 bg-white"
            >
              {periodosDisponiveis.map((p) => (
                <option key={p} value={p}>
                  {rotuloDoPeriodo(p)}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={() => void carregar()}
              disabled={carregando}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border font-medium disabled:opacity-60"
            >
              <RefreshCw size={13} className={carregando ? 'animate-spin' : ''} />
              Atualizar
            </button>
          </div>
        </header>

        {/* O estado de consolidação muda o significado de tudo na tela: antes é parcial, depois
            é resultado divulgado. Fica no topo, e não escondido num canto. */}
        <div
          className={`rounded-2xl border px-4 py-3 flex flex-wrap items-center justify-between gap-3 ${
            consolidado ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200'
          }`}
        >
          <div className="flex items-start gap-2">
            {consolidado ? (
              <Lock size={16} className="text-emerald-700 mt-0.5 flex-shrink-0" />
            ) : (
              <AlertTriangle size={16} className="text-amber-700 mt-0.5 flex-shrink-0" />
            )}
            <div className="text-sm">
              <p className={`font-semibold ${consolidado ? 'text-emerald-900' : 'text-amber-900'}`}>
                {consolidado
                  ? `Período fechado em ${new Date(consolidado).toLocaleDateString('pt-BR')}`
                  : 'Período em andamento'}
              </p>
              <p className={`text-xs mt-0.5 ${consolidado ? 'text-emerald-800' : 'text-amber-800'}`}>
                {consolidado
                  ? 'Este é o ranking divulgado. Lançamentos novos entram no mês seguinte.'
                  : 'Os números ainda mudam até o fechamento, e a landing page não publica este mês.'}
              </p>
            </div>
          </div>

          {ehDiretora && !consolidado && (
            <button
              type="button"
              onClick={() => void consolidar()}
              className="text-xs px-3 py-1.5 rounded-full font-semibold text-white bg-amber-700 hover:opacity-90"
            >
              Fechar {rotuloDoPeriodo(periodo)}
            </button>
          )}
        </div>

        {erro && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
            {erro}
          </div>
        )}

        <nav className="flex flex-wrap gap-2">
          {ABAS.map(({ id, label, icone: Icone }) => (
            <button
              key={id}
              type="button"
              onClick={() => setAba(id)}
              className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full font-semibold border transition-colors ${
                aba === id ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-600'
              }`}
            >
              <Icone size={13} />
              {label}
            </button>
          ))}
        </nav>

        {aba === 'corretores' && (
          <RankingCorretores
            linhas={ranking?.corretores ?? []}
            carregando={carregando}
            onAbrirExtrato={(id) => {
              sommarApi.extrato(id).then(setExtrato).catch(() => setExtrato(null));
            }}
          />
        )}

        {aba === 'imobiliarias' && <RankingImobiliarias ranking={ranking} carregando={carregando} />}

        {aba === 'cupons' && (
          <PainelCupons
            cupons={cupons}
            periodo={periodo}
            sorteioEm={sorteioDoPeriodo}
            podeSortear={ehDiretora}
            onSortear={() => void sortear()}
          />
        )}

        {aba === 'resgates' && <PainelResgates />}
      </div>

      {extrato && (
        <ExtratoPainel
          extrato={extrato}
          ehDiretora={ehDiretora}
          onFechar={() => setExtrato(null)}
          onRecarregar={() => sommarApi.extrato(extrato.participante.id).then(setExtrato)}
        />
      )}
    </div>
  );
}

function Vazio({ texto }: { texto: string }) {
  return (
    <div className="bg-white rounded-2xl border px-6 py-12 text-center text-sm text-gray-500">
      {texto}
    </div>
  );
}

function RankingCorretores({
  linhas,
  carregando,
  onAbrirExtrato,
}: {
  linhas: SommarLinhaCorretor[];
  carregando: boolean;
  onAbrirExtrato: (id: string) => void;
}) {
  if (carregando) return <Vazio texto="Carregando…" />;
  if (linhas.length === 0) {
    return <Vazio texto="Nenhum participante pontuou neste período ainda." />;
  }

  return (
    <div className="bg-white rounded-2xl border overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
          <tr>
            <th className="text-left font-medium px-4 py-3 w-20">Pos.</th>
            <th className="text-left font-medium px-4 py-3">Participante</th>
            <th className="text-left font-medium px-4 py-3">Nível</th>
            <th className="text-right font-medium px-4 py-3">Pontos no mês</th>
            <th className="text-right font-medium px-4 py-3">Acumulado</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {linhas.map((l) => (
            <tr
              key={l.corretorId}
              className="hover:bg-gray-50 cursor-pointer"
              onClick={() => onAbrirExtrato(l.corretorId)}
            >
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-gray-900 tabular-nums">{l.posicao}º</span>
                  <Variacao valor={l.variacao} />
                </div>
              </td>
              <td className="px-4 py-3">
                <p className="font-medium text-gray-900">{l.nome}</p>
                <p className="text-xs text-gray-500">
                  {[l.imobiliaria, [l.cidade, l.uf].filter(Boolean).join('/')]
                    .filter(Boolean)
                    .join(' · ')}
                </p>
              </td>
              <td className="px-4 py-3">
                <NivelTag nivel={l.nivel} />
              </td>
              <td className="px-4 py-3 text-right font-semibold tabular-nums">
                {l.pontos.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </td>
              <td className="px-4 py-3 text-right text-gray-500 tabular-nums">
                {l.pontuacaoTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function RankingImobiliarias({
  ranking,
  carregando,
}: {
  ranking: SommarRanking | null;
  carregando: boolean;
}) {
  const linhas = ranking?.imobiliarias ?? [];
  if (carregando) return <Vazio texto="Carregando…" />;
  if (linhas.length === 0) return <Vazio texto="Nenhuma imobiliária pontuou neste período ainda." />;

  return (
    <div className="bg-white rounded-2xl border overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
          <tr>
            <th className="text-left font-medium px-4 py-3 w-20">Pos.</th>
            <th className="text-left font-medium px-4 py-3">Imobiliária</th>
            <th className="text-right font-medium px-4 py-3">VGV</th>
            <th className="text-right font-medium px-4 py-3">Unidades</th>
            <th className="text-right font-medium px-4 py-3">Participantes</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {linhas.map((l) => (
            <tr key={l.nome} className="hover:bg-gray-50">
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-gray-900 tabular-nums">{l.posicao}º</span>
                  <Variacao valor={l.variacao} />
                </div>
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-gray-900">{l.nome}</span>
                  {/* O piso de R$ 25 milhões do item 7.7: ser o primeiro não basta. */}
                  {l.concorreAoBonus && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-amber-100 text-amber-800 border border-amber-300">
                      Concorre ao Bônus Destaque
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-500">
                  {[l.cidade, l.uf].filter(Boolean).join('/')}
                </p>
              </td>
              <td className="px-4 py-3 text-right font-semibold tabular-nums">
                {formatCurrency(l.vgv)}
              </td>
              <td className="px-4 py-3 text-right tabular-nums">{l.unidades}</td>
              <td className="px-4 py-3 text-right text-gray-500 tabular-nums">{l.participantes}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PainelCupons({
  cupons,
  periodo,
  sorteioEm,
  podeSortear,
  onSortear,
}: {
  cupons: SommarCupom[];
  periodo: string;
  sorteioEm: string | null;
  podeSortear: boolean;
  onSortear: () => void;
}) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-gray-600">
          <strong>{cupons.length}</strong> cupom(ns) em {rotuloDoPeriodo(periodo)}.{' '}
          <span className="text-xs text-gray-500">
            A partir de 2 atendimentos qualificados, cada atendimento vale 1 cupom — inclusive os
            dois primeiros.
          </span>
        </p>

        {podeSortear && cupons.length > 0 && !sorteioEm && (
          <button
            type="button"
            onClick={onSortear}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full font-semibold text-white bg-gray-900 hover:opacity-90"
          >
            <Dices size={13} />
            Sortear ganhador
          </button>
        )}
        {sorteioEm && (
          <span className="text-xs px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 font-medium">
            Sorteado em {new Date(sorteioEm).toLocaleDateString('pt-BR')}
          </span>
        )}
      </div>

      {cupons.length === 0 ? (
        <Vazio texto="Nenhum cupom gerado neste período." />
      ) : (
        <div className="bg-white rounded-2xl border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
              <tr>
                <th className="text-left font-medium px-4 py-3 w-20">Nº</th>
                <th className="text-left font-medium px-4 py-3">Participante</th>
                <th className="text-left font-medium px-4 py-3">Atendimento que gerou</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {cupons.map((c) => (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-bold tabular-nums">{c.numero}</td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">{c.corretor?.nomeCorretor ?? '—'}</p>
                    <p className="text-xs text-gray-500">{c.corretor?.imobiliaria}</p>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-600">
                    {c.interacao ? (
                      <>
                        <span className="font-medium">{c.interacao.tipo}</span> ·{' '}
                        {new Date(c.interacao.data).toLocaleDateString('pt-BR')}
                        {c.interacao.resumo && <p className="text-gray-500">{c.interacao.resumo}</p>}
                      </>
                    ) : (
                      '—'
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function PainelResgates() {
  const [resgates, setResgates] = useState<SommarResgate[] | null>(null);

  useEffect(() => {
    sommarApi.resgates().then(setResgates).catch(() => setResgates([]));
  }, []);

  if (!resgates) return <Vazio texto="Carregando…" />;
  if (resgates.length === 0) return <Vazio texto="Nenhum resgate solicitado até agora." />;

  return (
    <div className="bg-white rounded-2xl border overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
          <tr>
            <th className="text-left font-medium px-4 py-3">Participante</th>
            <th className="text-left font-medium px-4 py-3">Prêmio</th>
            <th className="text-right font-medium px-4 py-3">Pontos</th>
            <th className="text-left font-medium px-4 py-3">Prazo de escolha</th>
            <th className="text-left font-medium px-4 py-3">Situação</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {resgates.map((r) => (
            <tr key={r.id} className="hover:bg-gray-50">
              <td className="px-4 py-3">
                <p className="font-medium text-gray-900">{r.corretor.nomeCorretor}</p>
                <p className="text-xs text-gray-500">{r.corretor.imobiliaria}</p>
              </td>
              <td className="px-4 py-3 text-xs text-gray-700">
                {r.opcao === 'BEM' ? r.premio : `Valor de Referência — ${formatCurrency(r.valorReferencia)}`}
              </td>
              <td className="px-4 py-3 text-right font-semibold tabular-nums">{r.pontos}</td>
              <td className="px-4 py-3 text-xs text-gray-600">
                {new Date(r.prazoAte).toLocaleDateString('pt-BR')}
              </td>
              <td className="px-4 py-3">
                <span className="text-xs px-2.5 py-1 rounded-full bg-gray-100 text-gray-700 font-medium">
                  {r.status}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const ROTULO_ORIGEM: Record<string, string> = {
  PROPOSTA: 'Proposta',
  VENDA: 'Venda',
  AJUSTE: 'Ajuste',
};

function ExtratoPainel({
  extrato,
  ehDiretora,
  onFechar,
  onRecarregar,
}: {
  extrato: SommarExtrato;
  ehDiretora: boolean;
  onFechar: () => void;
  onRecarregar: () => void;
}) {
  const [estornando, setEstornando] = useState<string | null>(null);

  async function estornar(lancamentoId: string) {
    const motivo = window.prompt(
      'Motivo do estorno (aparece no extrato do participante):\n\n' +
        'Ex.: distrato, rescisão, inadimplência acima de 30 dias, ação judicial.'
    );
    if (!motivo || motivo.trim().length < 5) return;

    setEstornando(lancamentoId);
    try {
      await sommarApi.estornar(lancamentoId, motivo.trim());
      onRecarregar();
    } catch (e) {
      window.alert(e instanceof ApiError ? e.message : 'Não foi possível estornar');
    } finally {
      setEstornando(null);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/30" onClick={onFechar}>
      <aside
        className="w-full max-w-2xl bg-white h-full overflow-y-auto shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="sticky top-0 bg-white border-b px-5 py-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-gray-900">{extrato.participante.nome}</h2>
            <p className="text-xs text-gray-500">
              {extrato.participante.imobiliaria} · participa desde{' '}
              {new Date(extrato.participante.aderiuEm).toLocaleDateString('pt-BR')}
            </p>
          </div>
          <button type="button" onClick={onFechar} className="p-1 text-gray-400 hover:text-gray-700">
            <X size={18} />
          </button>
        </header>

        <div className="px-5 py-4 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border px-4 py-3">
              <p className="text-xs text-gray-500">Nível confirmado</p>
              <div className="mt-1.5">
                <NivelTag nivel={extrato.nivelConfirmado} />
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Comissão {extrato.nivelConfirmado.comissaoPct.toLocaleString('pt-BR')}%
              </p>
            </div>
            <div className="rounded-xl border px-4 py-3">
              <p className="text-xs text-gray-500">Pontuação</p>
              <p className="text-xl font-bold text-gray-900 tabular-nums mt-1">
                {extrato.pontuacaoTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                VGV confirmado {formatCurrency(extrato.vgvConfirmado)}
              </p>
            </div>
          </div>

          {/* Itens 3.q e 7.2: proposta leva a pontuação adiante, mas só venda confirma a faixa. */}
          {extrato.temPendencia && (
            <div className="rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900">
              A pontuação já alcança <strong>{extrato.nivelPendente.nome}</strong>, mas a faixa só é
              confirmada por venda efetiva — propostas contam para os pontos, não para o nível.
            </div>
          )}

          {/* Item 5.2.e: pontos de venda só liberam para resgate após a quitação do sinal. */}
          {extrato.pontosBloqueadosPorSinal > 0 && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              <strong>
                {extrato.pontosBloqueadosPorSinal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </strong>{' '}
              ponto(s) aguardam a quitação integral do sinal de 15% para liberar resgate. Saldo
              resgatável hoje:{' '}
              <strong>
                {extrato.saldoResgatavel.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </strong>
              .
            </div>
          )}

          <section>
            <h3 className="text-sm font-semibold text-gray-900 mb-2">
              De onde veio cada ponto
            </h3>
            <div className="space-y-2">
              {extrato.lancamentos.map((l) => {
                const anulado = l.estornadoEm !== null;
                const ehEstorno = l.tipo === 'ESTORNO';
                return (
                  <div
                    key={l.id}
                    className={`rounded-xl border px-4 py-3 text-sm ${
                      ehEstorno ? 'bg-rose-50 border-rose-200' : anulado ? 'bg-gray-50 opacity-70' : 'bg-white'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-medium text-gray-900">
                          {ROTULO_ORIGEM[l.origem] ?? l.origem}
                          {ehEstorno && ' estornada'}
                          {l.empreendimento && ` — ${l.empreendimento}`}
                          {l.unidade && ` / ${l.unidade}`}
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {[
                            l.clienteNome,
                            new Date(l.createdAt).toLocaleDateString('pt-BR'),
                            l.valorTotal > 0 ? formatCurrency(l.valorTotal) : null,
                            l.valorPermuta > 0 ? `permuta ${formatCurrency(l.valorPermuta)}` : null,
                            l.participantes > 1 ? `dividido entre ${l.participantes}` : null,
                          ]
                            .filter(Boolean)
                            .join(' · ')}
                        </p>
                        {l.motivo && <p className="text-xs text-gray-600 mt-1 italic">{l.motivo}</p>}
                        {anulado && (
                          <p className="text-xs text-rose-700 mt-1">
                            Estornado em {new Date(l.estornadoEm!).toLocaleDateString('pt-BR')}
                          </p>
                        )}
                      </div>

                      <div className="text-right flex-shrink-0">
                        <p
                          className={`font-bold tabular-nums ${
                            l.pontos < 0 ? 'text-rose-700' : 'text-emerald-700'
                          }`}
                        >
                          {l.pontos > 0 ? '+' : ''}
                          {l.pontos.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </p>
                        {ehDiretora && !anulado && !ehEstorno && (
                          <button
                            type="button"
                            onClick={() => void estornar(l.id)}
                            disabled={estornando === l.id}
                            className="text-[11px] text-rose-700 hover:underline mt-1 disabled:opacity-50"
                          >
                            Estornar
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
              {extrato.lancamentos.length === 0 && (
                <p className="text-sm text-gray-500">Nenhum ponto lançado ainda.</p>
              )}
            </div>
          </section>

          <section>
            <h3 className="text-sm font-semibold text-gray-900 mb-2">
              Cupons ({extrato.cupons.length})
            </h3>
            {extrato.cupons.length === 0 ? (
              <p className="text-sm text-gray-500">Nenhum cupom até agora.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {extrato.cupons.map((c) => (
                  <span
                    key={c.id}
                    className="text-xs px-2.5 py-1 rounded-full bg-gray-100 border font-medium"
                    title={c.interacao ? `${c.interacao.tipo} · ${new Date(c.interacao.data).toLocaleDateString('pt-BR')}` : undefined}
                  >
                    nº {c.numero} · {c.periodo}
                  </span>
                ))}
              </div>
            )}
          </section>
        </div>
      </aside>
    </div>
  );
}
