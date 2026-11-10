import { useCallback, useEffect, useRef, useState } from 'react';
import { BellRing, Clock, X } from 'lucide-react';
import type { LembreteCompromisso } from '../types';
import { notificacoesApi } from '../api/endpoints';
import { useStore } from '../store';

/**
 * Aviso de compromisso prestes a começar.
 *
 * Abre sozinho quando o backend cria um lembrete (15 minutos antes do horário) e só sai com o
 * "Ciente" — ou com o X, que reconhece do mesmo jeito. Reconhecer é definitivo: o backend
 * grava `cienteEm` e aquele compromisso não volta a abrir modal.
 *
 * O que ele lista são os lembretes PENDENTES, que podem ser mais de um: quem tem duas visitas
 * coladas recebe os dois avisos e dá ciência de uma vez, em vez de fechar um modal e ver outro
 * logo atrás.
 */

/** De quanto em quanto tempo a tela pergunta se há lembrete novo. */
const INTERVALO_MS = 60_000;

const ROTULO_TIPO: Record<string, string> = {
  ligacao: 'Ligação',
  whatsapp: 'WhatsApp',
  reuniao: 'Reunião',
  treinamento: 'Treinamento',
  atendimento_cliente: 'Atendimento ao cliente',
  atendimento_corretor: 'Atendimento ao corretor',
  visita: 'Visita',
  visita_obra: 'Visita na obra',
  visita_imobiliaria: 'Visita na imobiliária',
  almoco: 'Almoço/Jantar',
  evento: 'Evento',
};

/** Hora de relógio em São Paulo — a mesma que o backend usa no texto do aviso. */
function hora(iso: string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso));
}

/** "daqui a 12 min", "agora", "há 3 min" — o que a pessoa precisa saber de relance. */
function quando(iso: string): string {
  const minutos = Math.round((new Date(iso).getTime() - Date.now()) / 60_000);
  if (minutos > 1) return `daqui a ${minutos} min`;
  if (minutos >= -1) return 'agora';
  return `há ${Math.abs(minutos)} min`;
}

export function LembreteCompromissoModal() {
  const currentUser = useStore((s) => s.currentUser);
  const loadNotificacoes = useStore((s) => s.loadNotificacoes);

  const [lembretes, setLembretes] = useState<LembreteCompromisso[]>([]);
  const [enviando, setEnviando] = useState(false);
  // Evita duas buscas sobrepostas quando a aba volta do segundo plano e o intervalo coincide.
  const buscando = useRef(false);

  const buscar = useCallback(async () => {
    if (buscando.current) return;
    buscando.current = true;
    try {
      const pendentes = await notificacoesApi.lembretes();
      setLembretes(pendentes.filter((l) => l.interacao));
    } catch {
      // Falha de rede não pode derrubar a tela inteira: na próxima passagem tenta de novo.
    } finally {
      buscando.current = false;
    }
  }, []);

  useEffect(() => {
    if (!currentUser) {
      setLembretes([]);
      return;
    }
    void buscar();
    const t = setInterval(() => void buscar(), INTERVALO_MS);

    // Quem deixa a aba de lado e volta vê o aviso na hora, sem esperar o próximo ciclo.
    const aoVoltar = () => {
      if (document.visibilityState === 'visible') void buscar();
    };
    document.addEventListener('visibilitychange', aoVoltar);

    return () => {
      clearInterval(t);
      document.removeEventListener('visibilitychange', aoVoltar);
    };
  }, [currentUser, buscar]);

  async function darCiente() {
    const ids = lembretes.map((l) => l.id);
    if (ids.length === 0) return;

    setEnviando(true);
    try {
      await notificacoesApi.darCiente(ids);
      // Tira da tela só o que foi reconhecido: um lembrete que chegou enquanto o modal estava
      // aberto não entrou na lista enviada e continua pendente, como deve.
      setLembretes((atual) => atual.filter((l) => !ids.includes(l.id)));
      // O sininho também perde esses itens — o backend marcou como lidos junto.
      loadNotificacoes().catch(() => undefined);
    } catch {
      // Sem ciência registrada, o modal segue aberto: é melhor insistir do que engolir o aviso.
    } finally {
      setEnviando(false);
    }
  }

  if (!currentUser || lembretes.length === 0) return null;

  const varios = lembretes.length > 1;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="lembrete-titulo"
    >
      <div className="bg-white rounded-2xl w-full max-w-md shadow-xl">
        <div className="flex items-start gap-3 p-5 pb-3">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: '#fff2e8' }}
          >
            <BellRing size={18} style={{ color: '#d55006' }} />
          </div>
          <div className="min-w-0 flex-1">
            <h2 id="lembrete-titulo" className="text-base font-bold">
              {varios ? `${lembretes.length} compromissos chegando` : 'Compromisso chegando'}
            </h2>
            <p className="text-sm text-gray-500 mt-0.5">
              {varios ? 'Começam nos próximos minutos.' : 'Começa nos próximos minutos.'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => void darCiente()}
            disabled={enviando}
            aria-label="Marcar como ciente e fechar"
            className="text-gray-300 hover:text-gray-500 transition-colors disabled:opacity-40"
          >
            <X size={18} />
          </button>
        </div>

        <div className="px-5 pb-4 space-y-2 max-h-[55vh] overflow-y-auto">
          {lembretes.map((l) => {
            const i = l.interacao!;
            return (
              <div key={l.id} className="rounded-xl p-3 text-sm border bg-gray-50">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="font-semibold">{ROTULO_TIPO[i.tipo] ?? 'Compromisso'}</span>
                  <span className="flex items-center gap-1 text-xs text-gray-500 flex-shrink-0">
                    <Clock size={12} />
                    {hora(i.data)} · {quando(i.data)}
                  </span>
                </div>
                {i.resumo?.trim() && (
                  <p className="mt-1 text-gray-700 break-words">{i.resumo.trim()}</p>
                )}
                {i.corretor && (
                  <p className="mt-0.5 text-xs text-gray-500">com {i.corretor.nomeCorretor}</p>
                )}
              </div>
            );
          })}
        </div>

        <div className="px-5 pb-5">
          <button
            type="button"
            onClick={() => void darCiente()}
            disabled={enviando}
            className="w-full py-2.5 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
            style={{ backgroundColor: '#d55006' }}
          >
            {enviando ? 'Registrando…' : 'Ciente'}
          </button>
        </div>
      </div>
    </div>
  );
}
