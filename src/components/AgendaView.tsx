import { useEffect, useMemo, useState } from 'react';
import {
  startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval,
  addMonths, subMonths, format, isSameMonth, isToday,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Cake, Check } from 'lucide-react';
import { agendaApi } from '../api/endpoints';
import { ApiError } from '../api/client';
import { AniversarioModal } from './AniversarioModal';
import type { AniversarioAgenda, SaudacaoAniversario } from '../types';

const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

function primeiroNome(nome: string): string {
  return nome.trim().split(/\s+/)[0] || nome;
}

export function AgendaView() {
  const [currentMonth, setCurrentMonth] = useState(() => new Date());
  const [aniversarios, setAniversarios] = useState<AniversarioAgenda[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<AniversarioAgenda | null>(null);

  const ano = currentMonth.getFullYear();
  const mes = currentMonth.getMonth() + 1;

  useEffect(() => {
    let vivo = true;
    setLoading(true);
    setError('');
    agendaApi
      .aniversarios(ano, mes)
      .then((r) => { if (vivo) setAniversarios(r); })
      .catch((err) => { if (vivo) setError(err instanceof ApiError ? err.message : 'Não foi possível carregar a agenda.'); })
      .finally(() => { if (vivo) setLoading(false); });
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

  const days = useMemo(() => {
    const gridStart = startOfWeek(startOfMonth(currentMonth), { weekStartsOn: 0 });
    const gridEnd = endOfWeek(endOfMonth(currentMonth), { weekStartsOn: 0 });
    return eachDayOfInterval({ start: gridStart, end: gridEnd });
  }, [currentMonth]);

  function handleRegistered(corretorId: string, saudacao: SaudacaoAniversario) {
    setAniversarios((prev) => prev.map((a) => (a.corretorId === corretorId ? { ...a, saudacao } : a)));
    setSelected((cur) => (cur && cur.corretorId === corretorId ? { ...cur, saudacao } : cur));
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="bg-white border-b px-4 md:px-6 py-4 flex-shrink-0" style={{ borderColor: '#e5e7eb' }}>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h1 className="font-questrial text-xl text-gray-800">Agenda de Aniversários</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {loading ? 'Carregando…' : `${aniversarios.length} aniversário(s) em ${format(currentMonth, 'MMMM', { locale: ptBR })}`}
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
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {!loading && aniversarios.length === 0 && !error && (
          <p className="text-sm text-gray-400 text-center mt-6">
            Nenhum corretor faz aniversário em {format(currentMonth, 'MMMM', { locale: ptBR })}.
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
