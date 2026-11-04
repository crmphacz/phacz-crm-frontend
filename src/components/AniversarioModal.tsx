import { useEffect, useState } from 'react';
import { X, Cake, Sparkles, CheckCircle2, Lock } from 'lucide-react';
import { useStore } from '../store';
import { agendaApi } from '../api/endpoints';
import { ApiError } from '../api/client';
import { canSendAniversario } from '../permissions';
import { formatPhone } from '../utils';
import { paraFormatoInternacional } from '../lib/paises';
import { WhatsappIcon } from './WhatsappIcon';
import type { AniversarioAgenda, SaudacaoAniversario } from '../types';

interface AniversarioModalProps {
  aniversario: AniversarioAgenda;
  /** Ano da ocorrência do aniversário sendo tratada (o do mês exibido no calendário). */
  ano: number;
  onClose: () => void;
  onRegistered: (corretorId: string, saudacao: SaudacaoAniversario) => void;
}

function formatDataHora(iso: string): string {
  return new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}

export function AniversarioModal({ aniversario, ano, onClose, onRegistered }: AniversarioModalProps) {
  const currentUser = useStore((s) => s.currentUser);
  const showToast = useStore((s) => s.showToast);
  // O registro de parabéns é por CORRETOR (tabela AniversarioSaudacao), e a sugestão da IA é
  // gerada a partir do card dele. Para cliente final o modal vira consulta: mostra quem faz
  // aniversário e o contato, sem prometer um envio que não existe.
  const ehCorretor = aniversario.tipo === 'corretor';
  const podeEnviar = ehCorretor && canSendAniversario(currentUser);

  const [saudacao, setSaudacao] = useState<SaudacaoAniversario | null>(aniversario.saudacao);
  const [mensagem, setMensagem] = useState(aniversario.saudacao?.mensagem ?? '');
  const [carregandoSugestao, setCarregandoSugestao] = useState(ehCorretor && !aniversario.saudacao);
  const [sugestaoIA, setSugestaoIA] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    // Sem sugestão para cliente final: a rota é `/aniversarios/:corretorId/sugestao` e
    // receberia o id do corretor que o trouxe, gerando uma mensagem para a pessoa errada.
    if (saudacao || !ehCorretor) return;
    let vivo = true;
    setCarregandoSugestao(true);
    agendaApi
      .sugestao(aniversario.corretorId)
      .then((r) => {
        if (!vivo) return;
        setMensagem(r.mensagem);
        setSugestaoIA(r.gerado);
      })
      .catch(() => { if (vivo) setError('Não foi possível gerar a sugestão. Escreva a mensagem manualmente.'); })
      .finally(() => { if (vivo) setCarregandoSugestao(false); });
    return () => { vivo = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aniversario.corretorId]);

  async function handleEnviar() {
    const texto = mensagem.trim();
    if (!texto) return;
    setEnviando(true);
    setError('');

    window.open(
      `https://wa.me/${paraFormatoInternacional(aniversario.whatsapp || aniversario.telefone, aniversario.paisTelefone)}?text=${encodeURIComponent(texto)}`,
      '_blank',
      'noopener,noreferrer'
    );

    try {
      const { saudacao: nova } = await agendaApi.registrar(aniversario.corretorId, ano, texto);
      setSaudacao(nova);
      onRegistered(aniversario.corretorId, nova);
      showToast(`Parabéns registrado para ${aniversario.nome}.`);
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setError('A mensagem deste ano já foi enviada por outra pessoa. Recarregue a agenda para ver quem enviou.');
      } else {
        setError(err instanceof ApiError ? err.message : 'Abri o WhatsApp, mas não consegui registrar o envio. Tente registrar de novo.');
      }
    } finally {
      setEnviando(false);
    }
  }

  const jaEnviado = Boolean(saudacao);
  const podeEnviarAgora = podeEnviar && aniversario.hoje && !jaEnviado;
  const dataAniversarioBR = `${String(aniversario.dia).padStart(2, '0')}/${String(
    new Date(aniversario.dataNascimento).getUTCMonth() + 1,
  ).padStart(2, '0')}`;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center modal-backdrop"
      style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-2 sm:mx-4 flex flex-col" style={{ maxHeight: '90vh' }}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b" style={{ borderColor: '#e5e7eb' }}>
          <div className="flex items-center gap-3 min-w-0">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: ehCorretor ? '#fff7ed' : '#fdf2f8' }}
            >
              <Cake size={18} style={{ color: ehCorretor ? '#d55006' : '#be185d' }} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 min-w-0">
                <h2 className="font-questrial font-bold text-lg text-gray-900 truncate">{aniversario.nome}</h2>
                {/* O mesmo rótulo do selo na grade, para quem abriu pelo calendário reconhecer
                    de imediato de quem é o aniversário. */}
                <span
                  className="px-2 py-0.5 rounded-full text-[11px] font-bold flex-shrink-0"
                  style={ehCorretor
                    ? { backgroundColor: '#fff7ed', color: '#c2410c' }
                    : { backgroundColor: '#fdf2f8', color: '#be185d' }}
                >
                  {ehCorretor ? 'Corretor' : 'Cliente Final'}
                </span>
              </div>
              <p className="text-xs text-gray-400 truncate">
                Faz {aniversario.idade} anos
                {aniversario.vinculo ? ` · ${ehCorretor ? '' : 'via '}${aniversario.vinculo}` : ''}
                {aniversario.telefone ? ` · ${formatPhone(aniversario.telefone)}` : ''}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-100 transition-colors flex-shrink-0">
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="px-4 sm:px-6 py-4 space-y-3 overflow-y-auto">
          {/* Cliente final: consulta. O registro de parabéns é por corretor, e a sugestão da
              IA é gerada a partir do card dele — mostrar o formulário de envio aqui ofereceria
              algo que o servidor não faz para cliente. */}
          {!ehCorretor && (
            <div className="flex items-start gap-2 rounded-xl px-3 py-2.5" style={{ backgroundColor: '#fdf2f8', border: '1px solid #fbcfe8' }}>
              <Cake size={14} style={{ color: '#be185d', flexShrink: 0, marginTop: 1 }} />
              <p className="text-xs" style={{ color: '#9d174d' }}>
                Aniversário de cliente final, em {dataAniversarioBR}
                {aniversario.vinculo ? <> — trazido por <span className="font-semibold">{aniversario.vinculo}</span></> : null}.
                O envio de parabéns pelo CRM existe hoje só para corretor.
              </p>
            </div>
          )}

          {ehCorretor && jaEnviado && saudacao && (
            <div className="flex items-start gap-2 rounded-xl px-3 py-2.5" style={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0' }}>
              <CheckCircle2 size={15} style={{ color: '#059669', flexShrink: 0, marginTop: 1 }} />
              <p className="text-xs" style={{ color: '#166534' }}>
                Enviado por <span className="font-semibold">{saudacao.enviadoPorNome}</span> em {formatDataHora(saudacao.enviadoEm)}.
              </p>
            </div>
          )}

          {ehCorretor && !jaEnviado && !podeEnviar && (
            <div className="flex items-start gap-2 rounded-xl px-3 py-2.5" style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0' }}>
              <Lock size={14} style={{ color: '#64748b', flexShrink: 0, marginTop: 1 }} />
              <p className="text-xs text-gray-500">Apenas a Diretoria pode enviar a mensagem de parabéns. Você pode visualizar a sugestão abaixo.</p>
            </div>
          )}

          {ehCorretor && !jaEnviado && podeEnviar && !aniversario.hoje && (
            <div className="flex items-start gap-2 rounded-xl px-3 py-2.5" style={{ backgroundColor: '#fffbeb', border: '1px solid #fde68a' }}>
              <Lock size={14} style={{ color: '#b45309', flexShrink: 0, marginTop: 1 }} />
              <p className="text-xs" style={{ color: '#92400e' }}>
                O envio fica disponível <span className="font-semibold">no dia do aniversário</span> ({dataAniversarioBR}). A sugestão abaixo já fica pronta para revisar.
              </p>
            </div>
          )}

          {ehCorretor && (
          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1 flex items-center gap-1.5">
              Mensagem
              {!jaEnviado && sugestaoIA && (
                <span className="inline-flex items-center gap-1 text-[11px] font-medium" style={{ color: '#7c3aed' }}>
                  <Sparkles size={11} /> sugerida pela IA
                </span>
              )}
            </label>
            {carregandoSugestao ? (
              <div className="form-input text-sm text-gray-400" style={{ minHeight: 140, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                Gerando sugestão...
              </div>
            ) : (
              <textarea
                className="form-input resize-none disabled:opacity-70 disabled:bg-gray-50"
                style={{ minHeight: 140 }}
                value={mensagem}
                onChange={(e) => setMensagem(e.target.value)}
                disabled={jaEnviado || !podeEnviarAgora}
                placeholder="Escreva a mensagem de parabéns..."
              />
            )}
          </div>
          )}

          {error && <p className="text-xs text-red-500">{error}</p>}
        </div>

        {/* Footer */}
        <div className="flex items-center gap-3 px-4 sm:px-6 py-4 border-t bg-gray-50 rounded-b-2xl" style={{ borderColor: '#e5e7eb' }}>
          <button onClick={onClose} className="px-5 py-2.5 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-200 transition-colors">
            {podeEnviarAgora ? 'Cancelar' : 'Fechar'}
          </button>
          {podeEnviarAgora && (
            <button
              onClick={handleEnviar}
              disabled={enviando || carregandoSugestao || !mensagem.trim()}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold text-white transition-colors hover:opacity-90 disabled:opacity-50"
              style={{ backgroundColor: '#059669' }}
            >
              <WhatsappIcon size={16} />
              {enviando ? 'Registrando...' : 'Enviar parabéns no WhatsApp'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
