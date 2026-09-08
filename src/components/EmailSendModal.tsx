import { useMemo, useState } from 'react';
import { X, Send, Users, Filter, Tag, Search, Loader2, Info } from 'lucide-react';
import { useStore } from '../store';
import { STAGES } from '../data';
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
  const corretores = useStore((s) => s.corretores);
  const tiposInteresseOptions = useStore((s) => s.tiposInteresseOptions);

  // Todo envio de e-mail marketing vai para corretores com e-mail válido.
  const elegiveis = useMemo(
    () => corretores.filter((c) => c.status !== 'arquivado' && !!c.emailCorretor && c.emailCorretor.includes('@')),
    [corretores]
  );

  const tiposAtivos = useMemo(() => tiposInteresseOptions.filter((t) => t.ativo).map((t) => t.nome), [tiposInteresseOptions]);

  const [tipo, setTipo] = useState<DestinatarioTipo>('individual');
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [etapaAlvo, setEtapaAlvo] = useState<number>(STAGES[0].id);
  const [tipoInteresseAlvo, setTipoInteresseAlvo] = useState<string>('');
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState('');

  const buscaCorretores = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return [];
    return elegiveis
      .filter((c) => c.nomeCorretor.toLowerCase().includes(q) || c.emailCorretor.toLowerCase().includes(q))
      .slice(0, 50);
  }, [elegiveis, search]);

  const funilMatches = useMemo(() => elegiveis.filter((c) => c.etapa === etapaAlvo), [elegiveis, etapaAlvo]);
  const funilTotal = useMemo(
    () => corretores.filter((c) => c.status !== 'arquivado' && c.etapa === etapaAlvo).length,
    [corretores, etapaAlvo]
  );

  const qualifMatches = useMemo(
    () => (tipoInteresseAlvo ? elegiveis.filter((c) => c.tiposInteresse.includes(tipoInteresseAlvo)) : []),
    [elegiveis, tipoInteresseAlvo]
  );
  const qualifTotal = useMemo(
    () =>
      tipoInteresseAlvo
        ? corretores.filter((c) => c.status !== 'arquivado' && c.tiposInteresse.includes(tipoInteresseAlvo)).length
        : 0,
    [corretores, tipoInteresseAlvo]
  );

  function toggleCorretor(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const recipients: EmailDestinatario[] = useMemo(() => {
    if (tipo === 'individual') {
      return elegiveis
        .filter((c) => selectedIds.has(c.id))
        .map((c) => ({ nome: c.nomeCorretor, email: c.emailCorretor, origem: c.imobiliaria || 'Seleção manual' }));
    }
    if (tipo === 'funil') {
      const stage = STAGES.find((s) => s.id === etapaAlvo);
      return funilMatches.map((c) => ({ nome: c.nomeCorretor, email: c.emailCorretor, origem: stage ? `${stage.id}. ${stage.nome}` : '' }));
    }
    return qualifMatches.map((c) => ({ nome: c.nomeCorretor, email: c.emailCorretor, origem: tipoInteresseAlvo }));
  }, [tipo, selectedIds, elegiveis, funilMatches, qualifMatches, etapaAlvo, tipoInteresseAlvo]);

  async function handleSend() {
    if (recipients.length === 0 || sending) return;
    setSending(true);
    setSendError('');
    try {
      await sendEmailCampaign({
        templateId: template.id,
        destinatarioTipo: tipo,
        etapaAlvo: tipo === 'funil' ? etapaAlvo : undefined,
        tipoInteresseAlvo: tipo === 'empreendimento' ? tipoInteresseAlvo : undefined,
        corretorIds: tipo === 'individual' ? Array.from(selectedIds) : undefined,
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
              <RadioCard active={tipo === 'individual'} icon={<Users size={16} />} label="Corretores específicos" onClick={() => setTipo('individual')} />
              <RadioCard active={tipo === 'funil'} icon={<Filter size={16} />} label="Funil da pipeline" onClick={() => setTipo('funil')} />
              <RadioCard active={tipo === 'empreendimento'} icon={<Tag size={16} />} label="Perfil de qualificação" onClick={() => setTipo('empreendimento')} />
            </div>
          </div>

          {tipo === 'individual' && (
            <div>
              <div className="relative mb-2">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                <input
                  className="form-input"
                  style={{ paddingLeft: '2.25rem' }}
                  placeholder="Buscar corretor por nome ou e-mail..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              {search.trim() ? (
                <div className="border rounded-xl overflow-y-auto" style={{ borderColor: '#e5e7eb', maxHeight: 220 }}>
                  {buscaCorretores.length === 0 && (
                    <p className="text-xs text-gray-400 text-center py-8">Nenhum corretor com e-mail encontrado para "{search.trim()}".</p>
                  )}
                  {buscaCorretores.map((c) => (
                    <label
                      key={c.id}
                      className="flex items-center gap-3 px-3 py-2.5 border-b last:border-b-0 cursor-pointer hover:bg-gray-50 transition-colors"
                      style={{ borderColor: '#f3f4f6' }}
                    >
                      <input
                        type="checkbox"
                        checked={selectedIds.has(c.id)}
                        onChange={() => toggleCorretor(c.id)}
                        className="w-4 h-4 flex-shrink-0 accent-orange-600"
                      />
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 font-questrial" style={{ backgroundColor: '#d55006' }}>
                        {getInitials(c.nomeCorretor)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-gray-800 truncate">{c.nomeCorretor}</p>
                        <p className="text-xs text-gray-400 truncate">{c.emailCorretor}{c.imobiliaria ? ` · ${c.imobiliaria}` : ''}</p>
                      </div>
                    </label>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-gray-400 px-1">Comece a digitar o nome ou o e-mail para listar os corretores.</p>
              )}
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
              <RecipientCountNote comEmail={funilMatches.length} total={funilTotal} />
            </div>
          )}

          {tipo === 'empreendimento' && (
            <div>
              <label className="text-xs font-semibold text-gray-600 mb-1 block">Perfil de qualificação (tipo de interesse)</label>
              <select className="form-input" value={tipoInteresseAlvo} onChange={(e) => setTipoInteresseAlvo(e.target.value)}>
                <option value="">Selecionar...</option>
                {tiposAtivos.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
              {tipoInteresseAlvo && <RecipientCountNote comEmail={qualifMatches.length} total={qualifTotal} />}
            </div>
          )}

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

function RecipientCountNote({ comEmail, total }: { comEmail: number; total: number }) {
  const semEmail = total - comEmail;
  return (
    <p className="text-xs text-gray-400 mt-2">
      <span className="font-semibold" style={{ color: '#d55006' }}>{comEmail}</span> corretor{comEmail !== 1 ? 'es' : ''} com e-mail cadastrado
      {semEmail > 0 ? ` (${semEmail} sem e-mail, não receberão este envio)` : ''}.
    </p>
  );
}
