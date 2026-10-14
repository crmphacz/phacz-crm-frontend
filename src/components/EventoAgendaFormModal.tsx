import { useEffect, useState } from 'react';
import { X, CalendarPlus, Trash2 } from 'lucide-react';
import { agendaApi } from '../api/endpoints';
import { ApiError } from '../api/client';
import { Spinner } from './Spinner';
import {
  nowForDatetimeLocal, datetimeLocalToISO, somarHorasDatetimeLocal, isoParaDatetimeLocal,
} from '../utils';
import type { EventoAgenda } from '../types';

/**
 * Criação e edição de um evento da agenda.
 *
 * O evento não pertence a um card: existe por si (um feirão, um coquetel) e é na ficha do
 * corretor que se diz "vim deste evento". Por isso aqui não há nada sobre corretor — o vínculo
 * é feito do outro lado, escolhendo "Evento" como canal de origem.
 */
interface EventoAgendaFormModalProps {
  /** Evento sendo editado; ausente = criando um novo. */
  evento?: EventoAgenda | null;
  onSalvo: () => void;
  onExcluido?: () => void;
  onClose: () => void;
}

export function EventoAgendaFormModal({ evento, onSalvo, onExcluido, onClose }: EventoAgendaFormModalProps) {
  const [titulo, setTitulo] = useState(evento?.titulo ?? '');
  const [local, setLocal] = useState(evento?.local ?? '');
  const [descricao, setDescricao] = useState(evento?.descricao ?? '');
  const [inicio, setInicio] = useState(() =>
    evento ? isoParaDatetimeLocal(evento.dataInicio) : nowForDatetimeLocal()
  );
  const [fim, setFim] = useState(() =>
    evento ? isoParaDatetimeLocal(evento.dataFim) : somarHorasDatetimeLocal(nowForDatetimeLocal(), 2)
  );
  const [salvando, setSalvando] = useState(false);
  const [excluindo, setExcluindo] = useState(false);
  const [erro, setErro] = useState('');

  useEffect(() => {
    const aoTeclar = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', aoTeclar);
    return () => window.removeEventListener('keydown', aoTeclar);
  }, [onClose]);

  // Comparar como texto funciona porque o formato tem largura fixa ("YYYY-MM-DDTHH:mm").
  const periodoInvalido = !inicio || !fim || fim <= inicio;
  const podeSalvar = titulo.trim().length > 0 && !periodoInvalido && !salvando;

  async function salvar() {
    if (!podeSalvar) return;
    setSalvando(true);
    setErro('');
    try {
      const dados = {
        titulo: titulo.trim(),
        descricao: descricao.trim(),
        local: local.trim(),
        dataInicio: datetimeLocalToISO(inicio),
        dataFim: datetimeLocalToISO(fim),
      };
      if (evento) await agendaApi.atualizarEvento(evento.id, dados);
      else await agendaApi.criarEvento(dados);
      onSalvo();
    } catch (err) {
      setErro(err instanceof ApiError ? err.message : 'Não foi possível salvar o evento.');
    } finally {
      setSalvando(false);
    }
  }

  async function excluir() {
    if (!evento) return;
    const aviso = evento.totalCorretores > 0
      ? `Excluir "${evento.titulo}"?\n\nOs ${evento.totalCorretores} corretor(es) captados nele NÃO são apagados — eles apenas deixam de ter este evento como origem.`
      : `Excluir "${evento.titulo}"?`;
    if (!window.confirm(aviso)) return;

    setExcluindo(true);
    setErro('');
    try {
      await agendaApi.excluirEvento(evento.id);
      (onExcluido ?? onSalvo)();
    } catch (err) {
      setErro(err instanceof ApiError ? err.message : 'Não foi possível excluir o evento.');
      setExcluindo(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(17,24,39,0.5)' }}
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl w-full max-w-lg shadow-xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 px-5 py-4 border-b" style={{ borderColor: '#f3f4f6' }}>
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#fff7ed' }}>
              <CalendarPlus size={16} style={{ color: '#d55006' }} />
            </div>
            <div className="min-w-0">
              <h3 className="font-questrial font-bold text-gray-800">
                {evento ? 'Editar evento' : 'Novo evento'}
              </h3>
              <p className="text-xs text-gray-500">
                Depois, no cadastro do corretor, escolha "Evento" como canal de origem para vinculá-lo aqui.
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 flex-shrink-0" aria-label="Fechar">
            <X size={18} />
          </button>
        </div>

        <div className="px-5 py-4 space-y-3 max-h-[70vh] overflow-y-auto">
          <div>
            <label className="text-xs font-semibold text-gray-500 block mb-1">Título *</label>
            <input
              className="form-input text-sm"
              placeholder="Ex: Feirão de imóveis — Shopping Norte"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              autoFocus
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-500 block mb-1">Local</label>
            <input
              className="form-input text-sm"
              placeholder="Ex: Salão de eventos, Rua X, 123"
              value={local}
              onChange={(e) => setLocal(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-500 block mb-1">Início (data e hora) *</label>
              <input
                type="datetime-local"
                className="form-input text-sm"
                value={inicio}
                onChange={(e) => {
                  setInicio(e.target.value);
                  // Término que ficou para trás é empurrado: evita salvar um período impossível.
                  if (!fim || fim <= e.target.value) setFim(somarHorasDatetimeLocal(e.target.value, 2));
                }}
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 block mb-1">Término (data e hora) *</label>
              <input
                type="datetime-local"
                className="form-input text-sm"
                min={inicio || undefined}
                value={fim}
                onChange={(e) => setFim(e.target.value)}
              />
              <p className="text-[11px] text-gray-400 mt-1">O evento pode durar vários dias.</p>
            </div>
          </div>
          {periodoInvalido && (
            <p className="text-[11px] font-semibold" style={{ color: '#b91c1c' }}>
              Informe um término depois do início.
            </p>
          )}

          <div>
            <label className="text-xs font-semibold text-gray-500 block mb-1">Descrição</label>
            <textarea
              className="form-input resize-none text-sm"
              style={{ minHeight: 72 }}
              placeholder="O que é o evento, quem participa, o que esperar dele..."
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
            />
          </div>

          {erro && <p className="text-xs font-semibold" style={{ color: '#b91c1c' }}>{erro}</p>}
        </div>

        <div className="flex items-center justify-between gap-2 px-5 py-3 border-t" style={{ borderColor: '#f3f4f6', backgroundColor: '#fafafa' }}>
          {evento ? (
            <button
              onClick={excluir}
              disabled={excluindo || salvando}
              className="flex items-center gap-1.5 text-xs font-semibold text-gray-400 hover:text-red-600 transition-colors disabled:opacity-50"
            >
              <Trash2 size={13} />
              Excluir
            </button>
          ) : (
            <span />
          )}
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              disabled={salvando || excluindo}
              className="px-4 py-2 rounded-xl text-sm text-gray-500 hover:bg-gray-100 transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              onClick={salvar}
              disabled={!podeSalvar || excluindo}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white disabled:opacity-50"
              style={{ backgroundColor: '#d55006' }}
            >
              {salvando && <Spinner size={14} />}
              {salvando ? 'Salvando…' : 'Salvar evento'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
