import { useEffect, useState } from 'react';
import { X, CalendarDays, MapPin, Users, Pencil } from 'lucide-react';
import { agendaApi } from '../api/endpoints';
import { ApiError } from '../api/client';
import { InlineLoader } from './Spinner';
import { formatPeriodoAtividade } from '../utils';
import { STAGES } from '../data';
import type { EventoAgenda, EventoAgendaDetalhe } from '../types';

/**
 * O que abre ao clicar num evento do calendário: os dados do evento e quem veio dele.
 *
 * É a razão de o vínculo existir — o evento só vale alguma coisa se der para ver o retorno
 * que ele gerou, sem ter que filtrar a lista de corretores por canal de origem na mão.
 */
interface EventoCorretoresModalProps {
  eventoId: string;
  /** Quem pode editar o evento vê o botão de editar (dono da agenda ou Diretoria). */
  podeEditar: boolean;
  onEditar: (evento: EventoAgenda) => void;
  onAbrirCorretor: (corretorId: string) => void;
  onClose: () => void;
}

export function EventoCorretoresModal({
  eventoId, podeEditar, onEditar, onAbrirCorretor, onClose,
}: EventoCorretoresModalProps) {
  const [evento, setEvento] = useState<EventoAgendaDetalhe | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');

  useEffect(() => {
    let vivo = true;
    agendaApi.evento(eventoId)
      .then((e) => { if (vivo) setEvento(e); })
      .catch((err) => {
        if (vivo) setErro(err instanceof ApiError ? err.message : 'Não foi possível carregar o evento.');
      })
      .finally(() => { if (vivo) setCarregando(false); });
    return () => { vivo = false; };
  }, [eventoId]);

  useEffect(() => {
    const aoTeclar = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', aoTeclar);
    return () => window.removeEventListener('keydown', aoTeclar);
  }, [onClose]);

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
            <h3 className="font-questrial font-bold text-gray-800 truncate">
              {evento?.titulo ?? 'Evento'}
            </h3>
            {evento && (
              <>
                <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
                  <CalendarDays size={11} className="flex-shrink-0" />
                  {formatPeriodoAtividade(evento.dataInicio, evento.dataFim)}
                </p>
                {evento.local && (
                  <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1 truncate">
                    <MapPin size={11} className="flex-shrink-0" />
                    {evento.local}
                  </p>
                )}
                <p className="text-[11px] text-gray-400 mt-0.5">Agenda de {evento.responsavelNome}</p>
              </>
            )}
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            {evento && podeEditar && (
              <button
                onClick={() => onEditar(evento)}
                title="Editar evento"
                className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
              >
                <Pencil size={14} />
              </button>
            )}
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600" aria-label="Fechar">
              <X size={18} />
            </button>
          </div>
        </div>

        {evento?.descricao && (
          <p className="px-5 py-3 text-sm text-gray-600 border-b leading-relaxed" style={{ borderColor: '#f9fafb' }}>
            {evento.descricao}
          </p>
        )}

        <div className="px-5 py-2.5 border-b flex items-center gap-1.5" style={{ borderColor: '#f3f4f6', backgroundColor: '#fafafa' }}>
          <Users size={13} className="text-gray-400" />
          <span className="text-xs font-bold uppercase tracking-wider text-gray-500">
            Corretores captados neste evento
          </span>
          {evento && (
            <span className="text-xs font-bold text-gray-700 ml-auto">{evento.corretores.length}</span>
          )}
        </div>

        <div className="flex-1 overflow-y-auto">
          {carregando ? (
            <div className="py-10"><InlineLoader /></div>
          ) : erro ? (
            <p className="px-5 py-8 text-sm text-center font-semibold" style={{ color: '#b91c1c' }}>{erro}</p>
          ) : !evento || evento.corretores.length === 0 ? (
            <p className="px-5 py-8 text-sm text-gray-400 text-center leading-relaxed">
              Nenhum corretor veio deste evento ainda.
              <br />
              <span className="text-xs">
                Para vincular, cadastre o corretor com o canal de origem <strong>Evento</strong> e escolha este aqui.
              </span>
            </p>
          ) : (
            evento.corretores.map((c) => {
              const etapa = STAGES.find((s) => s.id === c.etapa);
              return (
                <button
                  key={c.id}
                  onClick={() => onAbrirCorretor(c.id)}
                  className="w-full text-left px-5 py-3 border-b hover:bg-gray-50 transition-colors"
                  style={{ borderColor: '#f9fafb' }}
                >
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-gray-800">{c.nomeCorretor}</span>
                    {etapa && (
                      <span
                        className="text-[11px] px-1.5 py-0.5 rounded-md font-bold"
                        style={{ backgroundColor: etapa.corBg, color: etapa.cor }}
                      >
                        E{etapa.id}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 truncate">
                    {[c.imobiliaria, c.telefoneCorretor].filter(Boolean).join(' · ')}
                  </p>
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
