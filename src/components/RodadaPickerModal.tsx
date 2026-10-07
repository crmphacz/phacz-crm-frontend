import { useEffect, useMemo, useState } from 'react';
import { X, CalendarDays, Search, MapPin } from 'lucide-react';
import { useStore } from '../store';
import { formatDateKeyBR } from '../utils';
import { isRodadaCompleta, type Rodada, type RodadaResumo } from '../types';

/**
 * Escolha da rodada em que o cliente final foi captado.
 *
 * Lista só as APROVADAS: pendente ou recusada não aconteceu, e amarrar um cliente a uma ação
 * que não existiu distorceria o retorno dela. O backend recusa pelo mesmo motivo.
 */
interface RodadaPickerModalProps {
  /** Rodada já vinculada, para abrir com ela marcada. */
  selecionadaId?: string | null;
  onSelect: (rodada: { id: string; rotulo: string }) => void;
  onClose: () => void;
}

/** "06/10/2026 · Imobiliária X · Guarujá/SP" — o suficiente para reconhecer a rodada. */
export function rotuloDaRodada(r: Rodada | RodadaResumo): string {
  const periodo = r.dataInicio === r.dataFim
    ? formatDateKeyBR(r.dataInicio)
    : `${formatDateKeyBR(r.dataInicio)} – ${formatDateKeyBR(r.dataFim)}`;
  const local = r.uf ? `${r.cidade}/${r.uf}` : r.cidade;
  return [periodo, r.imobiliaria, local].filter(Boolean).join(' · ');
}

export function RodadaPickerModal({ selecionadaId, onSelect, onClose }: RodadaPickerModalProps) {
  const rodadas = useStore((s) => s.rodadas);
  const ensureRodadasLoaded = useStore((s) => s.ensureRodadasLoaded);
  const [carregando, setCarregando] = useState(rodadas.length === 0);
  const [busca, setBusca] = useState('');

  useEffect(() => {
    ensureRodadasLoaded().catch(() => undefined).finally(() => setCarregando(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const aprovadas = useMemo(() => {
    // RodadaResumo (perfis que não veem o formulário completo) só chega quando já aprovada —
    // a API filtra isso. Por isso o `isRodadaCompleta` aqui.
    const soAprovadas = rodadas.filter((r) => !isRodadaCompleta(r) || r.statusAprovacao === 'aprovada');
    const q = busca.trim().toLowerCase();
    const filtradas = q
      ? soAprovadas.filter((r) => rotuloDaRodada(r).toLowerCase().includes(q))
      : soAprovadas;
    // Mais recentes primeiro: a rodada que acabou de acontecer é a que gera cliente novo.
    return [...filtradas].sort((a, b) => b.dataInicio.localeCompare(a.dataInicio));
  }, [rodadas, busca]);

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center modal-backdrop"
      style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-2 sm:mx-4 flex flex-col" style={{ maxHeight: '85vh' }}>
        <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b flex-shrink-0" style={{ borderColor: '#e5e7eb' }}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: '#fff7ed' }}>
              <CalendarDays size={18} style={{ color: '#d55006' }} />
            </div>
            <div>
              <h2 className="font-questrial font-bold text-lg text-gray-900">Vincular a uma rodada</h2>
              <p className="text-xs text-gray-400">Em qual rodada este cliente foi captado?</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-100 transition-colors">
            <X size={16} />
          </button>
        </div>

        <div className="px-4 sm:px-6 pt-4 flex-shrink-0">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input
              autoFocus
              className="form-input text-sm"
              style={{ paddingLeft: '2.25rem' }}
              placeholder="Buscar por imobiliária, cidade ou data..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4">
          {carregando ? (
            <p className="text-sm text-gray-400 text-center py-10">Carregando rodadas…</p>
          ) : aprovadas.length === 0 ? (
            <div className="py-10 text-center">
              <p className="text-sm font-semibold text-gray-600">
                {busca ? 'Nenhuma rodada encontrada' : 'Nenhuma rodada aprovada ainda'}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                {busca ? 'Tente outro termo.' : 'Só rodadas aprovadas pela Diretoria podem receber clientes.'}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {aprovadas.map((r) => {
                const ativa = r.id === selecionadaId;
                return (
                  <button
                    key={r.id}
                    onClick={() => onSelect({ id: r.id, rotulo: rotuloDaRodada(r) })}
                    className="w-full text-left px-3 py-2.5 rounded-xl border transition-colors hover:bg-gray-50"
                    style={{
                      borderColor: ativa ? '#d55006' : '#e5e7eb',
                      backgroundColor: ativa ? '#fff7ed' : undefined,
                      borderWidth: ativa ? 2 : 1,
                    }}
                  >
                    <p className="text-sm font-semibold text-gray-800">
                      {r.dataInicio === r.dataFim
                        ? formatDateKeyBR(r.dataInicio)
                        : `${formatDateKeyBR(r.dataInicio)} – ${formatDateKeyBR(r.dataFim)}`}
                      {r.imobiliaria ? ` · ${r.imobiliaria}` : ''}
                    </p>
                    <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                      <MapPin size={11} /> {r.uf ? `${r.cidade}/${r.uf}` : r.cidade || 'Sem cidade'}
                    </p>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex items-center gap-3 px-4 sm:px-6 py-4 border-t bg-gray-50 rounded-b-2xl flex-shrink-0" style={{ borderColor: '#e5e7eb' }}>
          <button onClick={onClose} className="px-5 py-2.5 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-200 transition-colors">
            Cancelar
          </button>
          {selecionadaId && (
            <button
              onClick={() => onSelect({ id: '', rotulo: '' })}
              className="text-sm font-semibold hover:underline"
              style={{ color: '#dc2626' }}
            >
              Remover vínculo
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
