import { useMemo, useState } from 'react';
import { X, Send, Loader2, Info } from 'lucide-react';
import { useStore } from '../store';
import { ApiError } from '../api/client';
import { PublicoAlvoPicker } from './PublicoAlvoPicker';
import {
  corretoresElegiveis, resolveDestinatarios, descreveOrigem, PUBLICO_ALVO_INICIAL, type PublicoAlvo,
} from '../lib/publicoAlvo';
import type { EmailTemplate, EmailDestinatario } from '../types';

interface EmailSendModalProps {
  template: EmailTemplate;
  onClose: () => void;
  onSent: () => void;
}

export function EmailSendModal({ template, onClose, onSent }: EmailSendModalProps) {
  const sendEmailCampaign = useStore((s) => s.sendEmailCampaign);
  const corretores = useStore((s) => s.corretores);

  // Mesma seleção de público do disparo de WhatsApp — a regra vive em lib/publicoAlvo.ts e a
  // interface no PublicoAlvoPicker; aqui o canal é e-mail (elegível = quem tem e-mail).
  const elegiveis = useMemo(() => corretoresElegiveis(corretores, 'email'), [corretores]);
  const [publico, setPublico] = useState<PublicoAlvo>(PUBLICO_ALVO_INICIAL);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState('');

  const recipients: EmailDestinatario[] = useMemo(
    () =>
      resolveDestinatarios(elegiveis, publico).map((c) => ({
        nome: c.nomeCorretor,
        email: c.emailCorretor,
        origem: descreveOrigem(publico, c),
      })),
    [elegiveis, publico]
  );

  async function handleSend() {
    if (recipients.length === 0 || sending) return;
    setSending(true);
    setSendError('');
    try {
      await sendEmailCampaign({
        templateId: template.id,
        destinatarioTipo: publico.tipo,
        etapaAlvo: publico.tipo === 'funil' ? publico.etapaAlvo : undefined,
        tipoInteresseAlvo: publico.tipo === 'empreendimento' ? publico.tipoInteresseAlvo : undefined,
        corretorIds: publico.tipo === 'individual' ? publico.corretorIds : undefined,
      });
      onSent();
    } catch (err) {
      setSendError(err instanceof ApiError ? err.message : 'Não foi possível enviar a campanha.');
    } finally {
      setSending(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center modal-backdrop"
      style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl mx-2 sm:mx-4 flex flex-col" style={{ maxHeight: '90vh' }}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-4 sm:py-5 border-b" style={{ borderColor: '#e5e7eb' }}>
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#fff7ed' }}>
              <Send size={18} style={{ color: '#d55006' }} />
            </div>
            <div className="min-w-0">
              <h2 className="font-questrial font-bold text-lg text-gray-900 truncate">Enviar e-mail</h2>
              <p className="text-xs text-gray-400 truncate">{template.nome}</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-100 transition-colors flex-shrink-0">
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 sm:py-5 space-y-5">
          <PublicoAlvoPicker canal="email" elegiveis={elegiveis} valor={publico} onChange={setPublico} />

          {/* Summary */}
          <div className="p-3.5 rounded-xl" style={{ backgroundColor: '#fff7ed', border: '1px solid #fed7aa' }}>
            <p className="text-sm font-bold" style={{ color: '#9a5219' }}>
              {recipients.length} corretor{recipients.length !== 1 ? 'es' : ''} selecionado{recipients.length !== 1 ? 's' : ''}
            </p>
            {recipients.length > 0 && (
              <p className="text-xs mt-1" style={{ color: '#b7691f' }}>
                {recipients.slice(0, 4).map((r) => r.nome).join(', ')}
                {recipients.length > 4 ? ` e mais ${recipients.length - 4}` : ''}
              </p>
            )}
          </div>

          {sendError && (
            <p className="text-xs text-red-500 flex items-center gap-1.5">
              <span>⚠</span> {sendError}
            </p>
          )}

          <div className="flex items-start gap-2 px-1">
            <Info size={13} className="text-gray-400 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-gray-400">
              O envio real depende de um provedor de e-mail configurado no backend. Sem ele, o envio é
              registrado no histórico de campanhas em modo simulado.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center gap-3 px-4 sm:px-6 py-4 border-t bg-gray-50 rounded-b-2xl" style={{ borderColor: '#e5e7eb' }}>
          <button onClick={onClose} className="px-5 py-2.5 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-200 transition-colors">
            Cancelar
          </button>
          <button
            onClick={handleSend}
            disabled={recipients.length === 0 || sending}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold text-white transition-colors hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ backgroundColor: '#d55006' }}
          >
            {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
            {sending ? 'Enviando...' : 'Enviar agora'}
          </button>
        </div>
      </div>
    </div>
  );
}
