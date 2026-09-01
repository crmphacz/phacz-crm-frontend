import { useState } from 'react';
import { X, ExternalLink, MessageSquare } from 'lucide-react';
import { useStore } from '../store';
import { whatsappApi } from '../api/endpoints';
import { ApiError } from '../api/client';
import { formatPhone } from '../utils';

interface WhatsappSendModalProps {
  /** Passe `corretorId` OU `clienteFinalId`. */
  alvo: { corretorId: string } | { clienteFinalId: string };
  nomeDestinatario: string;
  telefone: string;
  onClose: () => void;
  /** Chamado depois de abrir a conversa — usado para re-hidratar o card e mostrar a interação registrada. */
  onSent?: () => void;
}

/** Normaliza um telefone brasileiro para o formato do link do WhatsApp (só dígitos, com DDI 55). */
function toWaNumber(telefone: string): string {
  const digits = telefone.replace(/\D/g, '');
  return digits.startsWith('55') ? digits : `55${digits}`;
}

export function WhatsappSendModal({ alvo, nomeDestinatario, telefone, onClose, onSent }: WhatsappSendModalProps) {
  const showToast = useStore((s) => s.showToast);

  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function handleOpen() {
    const texto = message.trim();
    if (!texto) return;
    setBusy(true);
    setError('');

    // Registra o contato no card (histórico/cadência) e revalida a permissão no servidor.
    // Um 403 aqui significa que o perfil não pode falar com este destinatário — aí não abre.
    try {
      await whatsappApi.send(alvo, texto, { logOnly: true });
    } catch (err) {
      if (err instanceof ApiError && err.status === 403) {
        setError(err.message);
        setBusy(false);
        return;
      }
      // Falha de rede / log: não impede — o envio é manual pelo WhatsApp de qualquer forma.
    }

    window.open(
      `https://wa.me/${toWaNumber(telefone)}?text=${encodeURIComponent(texto)}`,
      '_blank',
      'noopener,noreferrer'
    );
    showToast('WhatsApp aberto em outra aba — revise e envie a mensagem por lá.');
    onSent?.();
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center modal-backdrop"
      style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-2 sm:mx-4 flex flex-col" style={{ maxHeight: '90vh' }}>
        <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b" style={{ borderColor: '#e5e7eb' }}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: '#ecfdf5' }}>
              <MessageSquare size={18} style={{ color: '#059669' }} />
            </div>
            <div>
              <h2 className="font-questrial font-bold text-lg text-gray-900">Enviar WhatsApp</h2>
              <p className="text-xs text-gray-400">
                Para <span className="font-semibold text-gray-600">{nomeDestinatario}</span>
                {telefone ? ` · ${formatPhone(telefone)}` : ''}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-100 transition-colors">
            <X size={16} />
          </button>
        </div>

        <div className="px-4 sm:px-6 py-4 space-y-3 overflow-y-auto">
          <p className="text-xs text-gray-500">
            A conversa abre no <span className="font-semibold text-gray-700">WhatsApp Web</span> (ou no app) com a
            mensagem já escrita — é só revisar e enviar por lá, pelo WhatsApp em que você está logado.
          </p>

          <div>
            <label className="text-xs font-semibold text-gray-500 block mb-1">Mensagem</label>
            <textarea
              className="form-input resize-none"
              style={{ minHeight: 120 }}
              placeholder="Escreva a mensagem..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
          </div>

          {error && <p className="text-xs text-red-500">{error}</p>}
        </div>

        <div className="flex items-center gap-3 px-4 sm:px-6 py-4 border-t bg-gray-50 rounded-b-2xl" style={{ borderColor: '#e5e7eb' }}>
          <button onClick={onClose} className="px-5 py-2.5 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-200 transition-colors">
            Cancelar
          </button>
          <button
            onClick={handleOpen}
            disabled={busy || !message.trim()}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold text-white transition-colors hover:opacity-90 disabled:opacity-50"
            style={{ backgroundColor: '#059669' }}
          >
            <ExternalLink size={15} />
            {busy ? 'Abrindo...' : 'Abrir no WhatsApp'}
          </button>
        </div>
      </div>
    </div>
  );
}
