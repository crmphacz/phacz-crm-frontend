import { useMemo, useState } from 'react';
import { X, Send, Users, Filter, Building2, Search, Loader2, Info } from 'lucide-react';
import { useStore, useAllClientesFinais } from '../store';
import { STAGES, EMPREENDIMENTOS } from '../data';
import { getInitials } from '../utils';
import { ApiError } from '../api/client';
import type { EmailTemplate, DestinatarioTipo, EmailDestinatario } from '../types';

interface EmailSendModalProps {
  template: EmailTemplate;
  onClose: () => void;
  onSent: () => void;
}

export function EmailSendModal({ template, onClose, onSent }: EmailSendModalProps) {
  const sendEmailCampaign = useStore((s) => s.sendEmailCampaign);
  const allClientesRaw = useAllClientesFinais();
  const allClientes = allClientesRaw.filter((c) => !!c.email);

  const [tipo, setTipo] = useState<DestinatarioTipo>('individual');
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [etapaAlvo, setEtapaAlvo] = useState<number>(STAGES[0].id);
  const [empreendimentoAlvo, setEmpreendimentoAlvo] = useState<string>(EMPREENDIMENTOS[0]);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState('');

  const individualFiltered = useMemo(() => {
    if (!search) return allClientes;
    const q = search.toLowerCase();
    return allClientes.filter(
      (c) => c.nome.toLowerCase().includes(q) || c.imobiliaria.toLowerCase().includes(q) || c.nomeCorretor.toLowerCase().includes(q)
    );
  }, [allClientes, search]);

  const funilMatches = useMemo(() => allClientes.filter((c) => c.etapaCorretor === etapaAlvo), [allClientes, etapaAlvo]);
  const funilMatchesAll = allClientesRaw.filter((c) => c.etapaCorretor === etapaAlvo).length;

  const empreendimentoMatches = useMemo(
    () => allClientes.filter((c) => c.empreendimentoInteresse === empreendimentoAlvo),
    [allClientes, empreendimentoAlvo]
  );
  const empreendimentoMatchesAll = allClientesRaw.filter((c) => c.empreendimentoInteresse === empreendimentoAlvo).length;

  function toggleCliente(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const recipients: EmailDestinatario[] = useMemo(() => {
    if (tipo === 'individual') {
      return allClientes
        .filter((c) => selectedIds.has(c.id))
        .map((c) => ({ nome: c.nome, email: c.email!, origem: `via ${c.nomeCorretor}` }));
    }
    if (tipo === 'funil') {
      const stage = STAGES.find((s) => s.id === etapaAlvo);
      return funilMatches.map((c) => ({ nome: c.nome, email: c.email!, origem: stage ? `${stage.id}. ${stage.nome}` : '' }));
    }
    return empreendimentoMatches.map((c) => ({ nome: c.nome, email: c.email!, origem: empreendimentoAlvo }));
  }, [tipo, selectedIds, allClientes, funilMatches, empreendimentoMatches, etapaAlvo, empreendimentoAlvo]);

  async function handleSend() {
    if (recipients.length === 0 || sending) return;
    setSending(true);
    setSendError('');
    try {
      await sendEmailCampaign({
        templateId: template.id,
        destinatarioTipo: tipo,
        etapaAlvo: tipo === 'funil' ? etapaAlvo : undefined,
        empreendimentoAlvo: tipo === 'empreendimento' ? empreendimentoAlvo : undefined,
        clienteIds: tipo === 'individual' ? Array.from(selectedIds) : undefined,
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
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">Quem vai receber?</p>
            <div className="grid grid-cols-3 gap-2">
              <RadioCard active={tipo === 'individual'} icon={<Users size={16} />} label="Clientes específicos" onClick={() => setTipo('individual')} />
              <RadioCard active={tipo === 'funil'} icon={<Filter size={16} />} label="Funil da pipeline" onClick={() => setTipo('funil')} />
              <RadioCard active={tipo === 'empreendimento'} icon={<Building2 size={16} />} label="Empreendimento" onClick={() => setTipo('empreendimento')} />
            </div>
          </div>

          {tipo === 'individual' && (
            <div>
              <div className="relative mb-2">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  className="form-input pl-8"
                  placeholder="Buscar cliente, corretor ou imobiliária..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <div className="border rounded-xl overflow-y-auto" style={{ borderColor: '#e5e7eb', maxHeight: 220 }}>
                {individualFiltered.length === 0 && (
                  <p className="text-xs text-gray-400 text-center py-8">Nenhum cliente com e-mail cadastrado encontrado.</p>
                )}
                {individualFiltered.map((c) => (
                  <label
                    key={c.id}
                    className="flex items-center gap-3 px-3 py-2.5 border-b last:border-b-0 cursor-pointer hover:bg-gray-50 transition-colors"
                    style={{ borderColor: '#f3f4f6' }}
                  >
                    <input
                      type="checkbox"
                      checked={selectedIds.has(c.id)}
                      onChange={() => toggleCliente(c.id)}
                      className="w-4 h-4 flex-shrink-0 accent-orange-600"
                    />
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 font-questrial" style={{ backgroundColor: '#d55006' }}>
                      {getInitials(c.nome)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-gray-800 truncate">{c.nome}</p>
                      <p className="text-xs text-gray-400 truncate">{c.email} · via {c.nomeCorretor}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )}

          {tipo === 'funil' && (
            <div>
              <label className="text-xs font-semibold text-gray-600 mb-1 block">Etapa da pipeline</label>
              <select className="form-input" value={etapaAlvo} onChange={(e) => setEtapaAlvo(Number(e.target.value))}>
                {STAGES.map((s) => (
                  <option key={s.id} value={s.id}>{s.id}. {s.nome}</option>
                ))}
              </select>
              <RecipientCountNote withEmail={funilMatches.length} total={funilMatchesAll} />
            </div>
          )}

          {tipo === 'empreendimento' && (
            <div>
              <label className="text-xs font-semibold text-gray-600 mb-1 block">Empreendimento de interesse</label>
              <select className="form-input" value={empreendimentoAlvo} onChange={(e) => setEmpreendimentoAlvo(e.target.value)}>
                {EMPREENDIMENTOS.map((e) => (
                  <option key={e} value={e}>{e}</option>
                ))}
              </select>
              <RecipientCountNote withEmail={empreendimentoMatches.length} total={empreendimentoMatchesAll} />
            </div>
          )}

          {/* Summary */}
          <div className="p-3.5 rounded-xl" style={{ backgroundColor: '#fff7ed', border: '1px solid #fed7aa' }}>
            <p className="text-sm font-bold" style={{ color: '#9a5219' }}>
              {recipients.length} destinatário{recipients.length !== 1 ? 's' : ''} selecionado{recipients.length !== 1 ? 's' : ''}
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
              O envio real depende de um provedor de e-mail (SMTP) configurado no backend. Sem ele, o envio é
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

function RadioCard({ active, icon, label, onClick }: { active: boolean; icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-col items-center gap-1.5 px-2 py-3 rounded-xl border text-center transition-all"
      style={
        active
          ? { borderColor: '#d55006', backgroundColor: '#fff7ed', color: '#d55006' }
          : { borderColor: '#e5e7eb', color: '#6b7280' }
      }
    >
      {icon}
      <span className="text-xs font-semibold leading-tight">{label}</span>
    </button>
  );
}

function RecipientCountNote({ withEmail, total }: { withEmail: number; total: number }) {
  const withoutEmail = total - withEmail;
  return (
    <p className="text-xs text-gray-400 mt-2">
      <span className="font-semibold" style={{ color: '#d55006' }}>{withEmail}</span> cliente{withEmail !== 1 ? 's' : ''} com e-mail cadastrado
      {withoutEmail > 0 ? ` (${withoutEmail} sem e-mail, não receberão este envio)` : ''}.
    </p>
  );
}
