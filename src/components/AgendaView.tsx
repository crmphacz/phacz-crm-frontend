import { useEffect, useMemo, useState } from 'react';
import {
  startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval,
  addMonths, subMonths, format, isSameMonth, isToday,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Cake, Check } from 'lucide-react';
import { agendaApi } from '../api/endpoints';
import { ApiError } from '../api/client';
import { useStore } from '../store';
import { useViewReady } from '../navLoading';
import { ViewLoader } from './ViewLoader';
import { AniversarioModal } from './AniversarioModal';
import { TIPO_INTERACAO_CONFIG } from '../utils';
import type { AniversarioAgenda, SaudacaoAniversario, AtividadeAgenda } from '../types';

const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

/** Quantas atividades mostrar por dia antes de recolher em "+N" — evita células gigantes em dias cheios. */
const MAX_ATIVIDADES_POR_DIA = 3;

function primeiroNome(nome: string): string {
  return nome.trim().split(/\s+/)[0] || nome;
}

export function AgendaView() {
  const setSelectedCorretor = useStore((s) => s.setSelectedCorretor);
  const [currentMonth, setCurrentMonth] = useState(() => new Date());
  const [aniversarios, setAniversarios] = useState<AniversarioAgenda[]>([]);
  const [atividades, setAtividades] = useState<AtividadeAgenda[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<AniversarioAgenda | null>(null);

  // Primeira carga: dispensa o toast de navegação quando a agenda do mês chega.
  const [primeiraCargaFeita, setPrimeiraCargaFeita] = useState(false);
  useViewReady(primeiraCargaFeita);

  const ano = currentMonth.getFullYear();
  const mes = currentMonth.getMonth() + 1;

  useEffect(() => {
    let vivo = true;
    setLoading(true);
    setError('');
    Promise.all([agendaApi.aniversarios(ano, mes), agendaApi.atividades(ano, mes)])
      .then(([niver, ativ]) => { if (vivo) { setAniversarios(niver); setAtividades(ativ); } })
      .catch((err) => { if (vivo) setError(err instanceof ApiError ? err.message : 'Não foi possível carregar a agenda.'); })
      .finally(() => { if (vivo) { setLoading(false); setPrimeiraCargaFeita(true); } });
    return () => { vivo = false; };
  }, [ano, mes]);

  const diasNoMes = endOfMonth(currentMonth).getDate();

  const porDia = useMemo(() => {
    const map = new Map<number, AniversarioAgenda[]>();
    for (const a of aniversarios) {
      const dia = Math.min(a.dia, diasNoMes); // Fev 29 em ano não bissexto cai no dia 28
      const list = map.get(dia) ?? [];
      list.push(a);
      map.set(dia, list);
    }
    return map;
  }, [aniversarios, diasNoMes]);

  // A API traz uma folga de ±1 dia (por fuso); aqui descartamos o que sobrar de mês adjacente
  // e agrupamos pelo dia exato, lido em horário local do navegador (mesmo horário que o usuário digitou).
  const porDiaAtividades = useMemo(() => {
    const map = new Map<number, AtividadeAgenda[]>();
    for (const a of atividades) {
      const quando = new Date(a.data);
      if (!isSameMonth(quando, currentMonth)) continue;
      const dia = quando.getDate();
      const list = map.get(dia) ?? [];
      list.push(a);
      map.set(dia, list);
    }
    return map;
  }, [atividades, currentMonth]);

  const days = useMemo(() => {
    const gridStart = startOfWeek(startOfMonth(currentMonth), { weekStartsOn: 0 });
    const gridEnd = endOfWeek(endOfMonth(currentMonth), { weekStartsOn: 0 });
    return eachDayOfInterval({ start: gridStart, end: gridEnd });
  }, [currentMonth]);

  function handleRegistered(corretorId: string, saudacao: SaudacaoAniversario) {
    setAniversarios((prev) => prev.map((a) => (a.corretorId === corretorId ? { ...a, saudacao } : a)));
    setSelected((cur) => (cur && cur.corretorId === corretorId ? { ...cur, saudacao } : cur));
  }

  // Primeira carga: mostra só a animação até a agenda do mês chegar. Trocas de mês depois
  // disso mantêm o calendário na tela (o "Carregando…" do cabeçalho cobre esse caso).
  if (!primeiraCargaFeita) return <ViewLoader />;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="bg-white border-b px-4 md:px-6 py-4 flex-shrink-0" style={{ borderColor: '#e5e7eb' }}>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h1 className="font-questrial text-xl text-gray-800">Agenda</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {loading
                ? 'Carregando…'
                : `${aniversarios.length} aniversário(s) e ${atividades.length} compromisso(s) em ${format(currentMonth, 'MMMM', { locale: ptBR })}`}
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4 md:p-6">
        {/* Month navigator */}
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => setCurrentMonth((m) => subMonths(m, 1))}
            className="w-9 h-9 rounded-lg flex items-center justify-center text-gray-500 hover:bg-gray-100 transition-colors border"
            style={{ borderColor: '#e5e7eb' }}
          >
            <ChevronLeft size={16} />
          </button>
          <div className="flex items-center gap-3">
            <h2 className="font-questrial text-lg text-gray-800 capitalize">{format(currentMonth, 'MMMM yyyy', { locale: ptBR })}</h2>
            <button
              onClick={() => setCurrentMonth(new Date())}
              className="text-xs font-semibold px-2.5 py-1 rounded-lg hover:bg-gray-100 transition-colors"
              style={{ color: '#d55006' }}
            >
              Hoje
            </button>
          </div>
          <button
            onClick={() => setCurrentMonth((m) => addMonths(m, 1))}
            className="w-9 h-9 rounded-lg flex items-center justify-center text-gray-500 hover:bg-gray-100 transition-colors border"
            style={{ borderColor: '#e5e7eb' }}
          >
            <ChevronRight size={16} />
          </button>
        </div>

        {error && <p className="text-sm text-red-500 mb-3">{error}</p>}

        {/* Legenda */}
        <div className="flex flex-wrap items-center gap-3 mb-3 text-xs text-gray-500">
          <span className="flex items-center gap-1.5">
            <Cake size={12} style={{ color: '#c2410c' }} /> Aniversário
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ backgroundColor: '#dbeafe' }} /> Compromisso futuro
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ backgroundColor: '#f3f4f6' }} /> Realizado
          </span>
        </div>

        {/* Grid */}
        <div className="bg-white rounded-2xl border overflow-hidden" style={{ borderColor: '#e5e7eb' }}>
          <div className="grid grid-cols-7 border-b" style={{ borderColor: '#e5e7eb' }}>
            {WEEKDAYS.map((wd) => (
              <div key={wd} className="px-2 py-2.5 text-center text-xs font-bold uppercase tracking-wider text-gray-400">
                {wd}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {days.map((day) => {
              const key = format(day, 'yyyy-MM-dd');
              const inMonth = isSameMonth(day, currentMonth);
              const doDia = inMonth ? porDia.get(day.getDate()) ?? [] : [];
              const ativDia = inMonth ? porDiaAtividades.get(day.getDate()) ?? [] : [];
              const ativVisiveis = ativDia.slice(0, MAX_ATIVIDADES_POR_DIA);
              const ativOcultas = ativDia.length - ativVisiveis.length;
              return (
                <div
                  key={key}
                  className="min-h-[92px] p-1.5 border-b border-r flex flex-col gap-1"
                  style={{ borderColor: '#f3f4f6', opacity: inMonth ? 1 : 0.4 }}
                >
                  <span
                    className="text-xs font-semibold w-5 h-5 flex items-center justify-center rounded-full flex-shrink-0"
                    style={isToday(day) ? { backgroundColor: '#d55006', color: '#fff' } : { color: '#6b7280' }}
                  >
                    {format(day, 'd')}
                  </span>
                  <div className="flex flex-col gap-1 min-w-0">
                    {doDia.map((a) => (
                      <button
                        key={a.corretorId}
                        onClick={() => setSelected(a)}
                        title={`${a.nomeCorretor} — ${a.saudacao ? 'parabéns enviado' : a.hoje ? 'aniversário hoje — enviar parabéns' : 'enviar disponível no dia'}`}
                        className="flex items-center gap-1 px-1.5 py-1 rounded-md text-[11px] font-semibold text-left truncate transition-colors hover:brightness-95"
                        style={
                          a.saudacao
                            ? { backgroundColor: '#f0fdf4', color: '#166534' }
                            : a.hoje
                              ? { backgroundColor: '#d55006', color: '#fff' }
                              : { backgroundColor: '#fff7ed', color: '#c2410c' }
                        }
                      >
                        {a.saudacao ? <Check size={11} className="flex-shrink-0" /> : <Cake size={11} className="flex-shrink-0" />}
                        <span className="truncate">{primeiroNome(a.nomeCorretor)}</span>
                      </button>
                    ))}
                    {ativVisiveis.map((at) => {
                      const config = TIPO_INTERACAO_CONFIG[at.tipo];
                      const futuro = new Date(at.data).getTime() > Date.now();
                      return (
                        <button
                          key={at.id}
                          onClick={() => setSelectedCorretor(at.corretorId)}
                          title={`${format(new Date(at.data), 'HH:mm')} · ${config.label} · ${at.corretorNome} — ${at.resumo}`}
                          className="flex items-center gap-1 px-1.5 py-1 rounded-md text-[11px] font-semibold text-left truncate transition-colors hover:brightness-95"
                          style={futuro ? { backgroundColor: '#dbeafe', color: '#1d4ed8' } : { backgroundColor: '#f3f4f6', color: '#4b5563' }}
                        >
                          <span className="flex-shrink-0">{config.icon}</span>
                          <span className="truncate">{primeiroNome(at.corretorNome)}</span>
                        </button>
                      );
                    })}
                    {ativOcultas > 0 && (
                      <span className="text-[11px] font-semibold text-gray-400 px-1.5">+{ativOcultas} mais</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {!loading && aniversarios.length === 0 && atividades.length === 0 && !error && (
          <p className="text-sm text-gray-400 text-center mt-6">
            Nenhum aniversário ou compromisso em {format(currentMonth, 'MMMM', { locale: ptBR })}.
          </p>
        )}
      </div>

      {selected && (
        <AniversarioModal
          aniversario={selected}
          ano={ano}
          onClose={() => setSelected(null)}
          onRegistered={handleRegistered}
        />
      )}
    </div>
  );
}
