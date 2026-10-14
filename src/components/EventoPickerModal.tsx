import { useEffect, useMemo, useState } from 'react';
import { X, CalendarDays, Search, MapPin, Users } from 'lucide-react';
import { agendaApi } from '../api/endpoints';
import { InlineLoader } from './Spinner';
import { formatPeriodoAtividade } from '../utils';
import type { EventoAgenda } from '../types';

/**
 * Escolha do evento em que o corretor foi captado — o equivalente, para eventos, do que o
 * RodadaPickerModal faz para as rodadas.
 *
 * Lista eventos de TODAS as agendas, não só a de quem está cadastrando: quem registra o
 * corretor com frequência não é quem organizou o evento.
 */
interface EventoPickerModalProps {
  /** Evento já vinculado, para abrir com ele marcado. */
  selecionadoId?: string | null;
  onSelect: (evento: { id: string; rotulo: string }) => void;
  onClose: () => void;
}

/** "19/10/2026, 09:00 – 18:00 · Feirão · Shopping Norte" — o bastante para reconhecer o evento. */
export function rotuloDoEvento(e: EventoAgenda): string {
  const periodo = formatPeriodoAtividade(e.dataInicio, e.dataFim) ?? '';
  return [periodo, e.titulo, e.local].filter(Boolean).join(' · ');
}

export function EventoPickerModal({ selecionadoId, onSelect, onClose }: EventoPickerModalProps) {
  const [eventos, setEventos] = useState<EventoAgenda[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [busca, setBusca] = useState('');

  useEffect(() => {
    let vivo = true;
    agendaApi.todosEventos()
      .then((lista) => { if (vivo) setEventos(lista); })
      .catch(() => undefined)
      .finally(() => { if (vivo) setCarregando(false); });
    return () => { vivo = false; };
  }, []);

  useEffect(() => {
    const aoTeclar = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', aoTeclar);
    return () => window.removeEventListener('keydown', aoTeclar);
  }, [onClose]);

  const filtrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    if (!termo) return eventos;
    return eventos.filter((e) =>
      [e.titulo, e.local, e.responsavelNome].some((campo) => campo.toLowerCase().includes(termo))
    );
  }, [eventos, busca]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(17,24,39,0.5)' }}
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl w-full max-w-lg shadow-xl overflow-hidden flex flex-col"
        style={{ maxHeight: '80vh' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 px-5 py-4 border-b" style={{ borderColor: '#f3f4f6' }}>
          <div className="min-w-0">
            <h3 className="font-questrial font-bold text-gray-800">Em qual evento?</h3>
            <p className="text-xs text-gray-500 mt-0.5">
              O corretor passa a contar como captado neste evento.
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 flex-shrink-0" aria-label="Fechar">
            <X size={18} />
          </button>
        </div>

        <div className="px-5 py-3 border-b" style={{ borderColor: '#f3f4f6' }}>
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" />
            <input
              className="form-input text-sm"
              style={{ paddingLeft: 32 }}
              placeholder="Buscar por título, local ou responsável..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              autoFocus
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {carregando ? (
            <div className="py-10"><InlineLoader /></div>
          ) : filtrados.length === 0 ? (
            <p className="px-5 py-10 text-sm text-gray-400 text-center">
              {eventos.length === 0
                ? 'Nenhum evento criado ainda. Crie um na tela de Agenda, em "Novo evento".'
                : 'Nenhum evento encontrado para essa busca.'}
            </p>
          ) : (
            filtrados.map((e) => {
              const selecionado = e.id === selecionadoId;
              return (
                <button
                  key={e.id}
                  onClick={() => onSelect({ id: e.id, rotulo: rotuloDoEvento(e) })}
                  className="w-full text-left px-5 py-3 border-b hover:bg-gray-50 transition-colors"
                  style={{
                    borderColor: '#f9fafb',
                    backgroundColor: selecionado ? '#fff7ed' : undefined,
                  }}
                >
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-gray-800">{e.titulo}</span>
                    {e.totalCorretores > 0 && (
                      <span
                        className="text-[11px] px-1.5 py-0.5 rounded-full font-bold flex items-center gap-1"
                        style={{ backgroundColor: '#eff6ff', color: '#1d4ed8' }}
                      >
                        <Users size={10} />
                        {e.totalCorretores}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
                    <CalendarDays size={11} className="flex-shrink-0" />
                    {formatPeriodoAtividade(e.dataInicio, e.dataFim)}
                  </p>
                  {e.local && (
                    <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1 truncate">
                      <MapPin size={11} className="flex-shrink-0" />
                      {e.local}
                    </p>
                  )}
                  <p className="text-[11px] text-gray-400 mt-0.5">Agenda de {e.responsavelNome}</p>
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
