import { useEffect, useState } from 'react';
import { X, Building2, User, Mail, Tag, ChevronRight, AlertTriangle } from 'lucide-react';
import { useStore } from '../store';
import { ApiError } from '../api/client';
import { corretoresApi, type ImobiliariaMatch } from '../api/endpoints';
import { maskPhone, maskCPF, maskCurrencyBRLInput, parseCurrencyBRL } from '../utils';
import { UF_OPTIONS, useCidadesPorUf } from '../lib/ibge';
import { Combobox } from './Combobox';
import type { TipoInteresse, CanalOrigem } from '../types';

function responsavelLabel(m: ImobiliariaMatch): string {
  const nomes = [m.responsavelGV?.nome, m.responsavelSDR?.nome, m.responsavelGR?.nome].filter(Boolean);
  return nomes.length > 0 ? nomes.join(' / ') : 'sem responsável definido';
}

export function NewCorretorModal() {
  const setShowNewCorretorModal = useStore((s) => s.setShowNewCorretorModal);
  const addCorretor = useStore((s) => s.addCorretor);
  const setSelectedCorretor = useStore((s) => s.setSelectedCorretor);
  const users = useStore((s) => s.users);
  const sdrUsers = users.filter((u) => u.cargo === 'SDR' && u.ativo);
  const canaisOrigem = useStore((s) => s.canaisOrigem).filter((c) => c.ativo);
  const tiposInteresseOptions = useStore((s) => s.tiposInteresseOptions).filter((t) => t.ativo);
  const imobiliariasOptions = useStore((s) => s.imobiliariasOptions).filter((i) => i.ativo);

  const [nome, setNome] = useState('');
  const [telefone, setTelefone] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [email, setEmail] = useState('');
  const [imobiliaria, setImobiliaria] = useState('');
  const [ticketMedio, setTicketMedio] = useState('');
  const [cpf, setCpf] = useState('');
  const [creci, setCreci] = useState('');
  const [dataNascimento, setDataNascimento] = useState('');
  const [uf, setUf] = useState('');
  const [cidade, setCidade] = useState('');
  const cidadesOptions = useCidadesPorUf(uf);
  const [canal, setCanal] = useState<CanalOrigem>('');
  const [responsavelSDRId, setResponsavelSDRId] = useState('');
  const [interesses, setInteresses] = useState<TipoInteresse[]>([]);
  const [possuiInvestidores, setPossuiInvestidores] = useState(false);
  const [potencialParceria, setPotencialParceria] = useState(false);
  const [treinamento, setTreinamento] = useState(false);
  const [observacoes, setObservacoes] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [imobiliariaMatches, setImobiliariaMatches] = useState<ImobiliariaMatch[]>([]);

  useEffect(() => {
    if (!canal && canaisOrigem.length > 0) setCanal(canaisOrigem[0].nome);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canaisOrigem]);

  async function handleImobiliariaChange(nome: string) {
    setImobiliaria(nome);
    setImobiliariaMatches([]);
    if (!nome.trim()) return;
    try {
      const { existentes } = await corretoresApi.checkImobiliaria(nome.trim());
      setImobiliariaMatches(existentes);
    } catch {
      // checagem é apenas informativa — falha silenciosa não deve travar o cadastro
    }
  }

  function toggleInteresse(id: TipoInteresse) {
    setInteresses((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  }

  function validate() {
    const e: Record<string, string> = {};
    if (!nome.trim()) e.nome = 'Nome é obrigatório';
    if (!telefone.trim()) e.telefone = 'Telefone é obrigatório';
    if (!canal) e.canal = 'Canal de origem é obrigatório';
    return e;
  }

  async function handleSubmit() {
    const e = validate();
    if (Object.keys(e).length > 0) {
      setErrors(e);
      return;
    }

    setSubmitting(true);
    try {
      const id = await addCorretor({
        nomeCorretor: nome.trim(),
        telefoneCorretor: telefone.trim(),
        whatsappCorretor: whatsapp.trim() || telefone.trim(),
        emailCorretor: email.trim(),
        imobiliaria: imobiliaria.trim(),
        ticketMedio: ticketMedio ? parseCurrencyBRL(ticketMedio) : undefined,
        cpf: cpf.trim() || undefined,
        creci: creci.trim() || undefined,
        dataNascimento: dataNascimento || undefined,
        cidade: cidade.trim() || undefined,
        uf: uf || undefined,
        canalOrigem: canal,
        responsavelSDRId: responsavelSDRId || undefined,
        tiposInteresse: interesses,
        possuiInvestidores,
        potencialParceria,
        treinamento,
        observacoes: observacoes.trim(),
      });

      setShowNewCorretorModal(false);
      setSelectedCorretor(id);
    } catch (err) {
      alert(err instanceof ApiError ? err.message : 'Não foi possível criar o corretor. Tente novamente.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center modal-backdrop"
      style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
      onClick={(e) => { if (e.target === e.currentTarget) setShowNewCorretorModal(false); }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl mx-2 sm:mx-4 flex flex-col" style={{ maxHeight: '90vh' }}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-4 sm:py-5 border-b" style={{ borderColor: '#e5e7eb' }}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: '#fff7ed' }}>
              <User size={18} style={{ color: '#d55006' }} />
            </div>
            <div>
              <h2 className="font-questrial font-bold text-lg text-gray-900">Novo Corretor</h2>
              <p className="text-xs text-gray-400">Preencha os dados do corretor</p>
            </div>
          </div>
          <button onClick={() => setShowNewCorretorModal(false)} className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-100 transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 sm:py-5 space-y-5">
          {/* Corretor */}
          <FormSection title="Dados do Corretor" icon={<Building2 size={14} style={{ color: '#d55006' }} />}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <FormLabel required>Nome completo</FormLabel>
                <input
                  className={`form-input ${errors.nome ? 'border-red-400' : ''}`}
                  placeholder="Nome do corretor"
                  value={nome}
                  onChange={(e) => { setNome(e.target.value); setErrors((er) => ({ ...er, nome: '' })); }}
                />
                {errors.nome && <p className="text-xs text-red-500 mt-1">{errors.nome}</p>}
              </div>
              <div>
                <FormLabel required>Telefone</FormLabel>
                <input
                  className={`form-input ${errors.telefone ? 'border-red-400' : ''}`}
                  placeholder="(11) 99999-9999"
                  inputMode="numeric"
                  maxLength={15}
                  value={telefone}
                  onChange={(e) => { setTelefone(maskPhone(e.target.value)); setErrors((er) => ({ ...er, telefone: '' })); }}
                />
                {errors.telefone && <p className="text-xs text-red-500 mt-1">{errors.telefone}</p>}
              </div>
              <div>
                <FormLabel>WhatsApp</FormLabel>
                <input
                  className="form-input"
                  placeholder="(11) 99999-9999"
                  inputMode="numeric"
                  maxLength={15}
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(maskPhone(e.target.value))}
                />
              </div>
              <div>
                <FormLabel>E-mail</FormLabel>
                <input
                  className="form-input"
                  placeholder="email@imobiliaria.com"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div>
                <FormLabel>Imobiliária</FormLabel>
                <select
                  className="form-input"
                  value={imobiliaria}
                  onChange={(e) => handleImobiliariaChange(e.target.value)}
                >
                  <option value="">Selecionar...</option>
                  {imobiliariasOptions.map((i) => <option key={i.id} value={i.nome}>{i.nome}</option>)}
                </select>
              </div>
              {imobiliariaMatches.length > 0 && (
                <div
                  className="sm:col-span-2 rounded-xl border px-3 py-2.5 flex items-start gap-2"
                  style={{ borderColor: '#fde68a', backgroundColor: '#fffbeb' }}
                >
                  <AlertTriangle size={15} style={{ color: '#b45309', flexShrink: 0, marginTop: 1 }} />
                  <div className="text-xs" style={{ color: '#92400e' }}>
                    <p className="font-semibold mb-1">Esta imobiliária já tem corretor(es) cadastrado(s):</p>
                    <ul className="space-y-0.5">
                      {imobiliariaMatches.map((m) => (
                        <li key={m.id}>
                          <strong>{m.nomeCorretor}</strong> — cadastrado na base de {responsavelLabel(m)}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
              <div>
                <FormLabel>Ticket médio</FormLabel>
                <input
                  className="form-input"
                  placeholder="R$ 0,00"
                  inputMode="numeric"
                  value={ticketMedio}
                  onChange={(e) => setTicketMedio(maskCurrencyBRLInput(e.target.value))}
                />
              </div>
              <div>
                <FormLabel>CPF</FormLabel>
                <input
                  className="form-input"
                  placeholder="000.000.000-00"
                  inputMode="numeric"
                  maxLength={14}
                  value={cpf}
                  onChange={(e) => setCpf(maskCPF(e.target.value))}
                />
              </div>
              <div>
                <FormLabel>CRECI</FormLabel>
                <input
                  className="form-input"
                  placeholder="Ex: 123456-F"
                  value={creci}
                  onChange={(e) => setCreci(e.target.value)}
                />
              </div>
              <div>
                <FormLabel>Data de nascimento</FormLabel>
                <input
                  type="date"
                  className="form-input"
                  value={dataNascimento}
                  onChange={(e) => setDataNascimento(e.target.value)}
                />
              </div>
              <div>
                <FormLabel>Estado</FormLabel>
                <select
                  className="form-input"
                  value={uf}
                  onChange={(e) => { setUf(e.target.value); setCidade(''); }}
                >
                  <option value="">Selecionar...</option>
                  {UF_OPTIONS.map((u) => <option key={u.sigla} value={u.sigla}>{u.nome}</option>)}
                </select>
              </div>
              <div>
                <FormLabel>Cidade</FormLabel>
                <Combobox
                  value={cidade}
                  onChange={setCidade}
                  options={cidadesOptions.map((c) => ({ id: c, label: c }))}
                  placeholder={uf ? 'Buscar cidade...' : 'Selecione o estado primeiro'}
                  disabled={!uf}
                />
              </div>
            </div>
          </FormSection>

          {/* Pipeline */}
          <FormSection title="Pipeline & Qualificação" icon={<Tag size={14} style={{ color: '#d55006' }} />}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <FormLabel required>Canal de origem</FormLabel>
                <select
                  className={`form-input ${errors.canal ? 'border-red-400' : ''}`}
                  value={canal}
                  onChange={(e) => setCanal(e.target.value as CanalOrigem)}
                >
                  {canaisOrigem.map((c) => <option key={c.id} value={c.nome}>{c.nome}</option>)}
                </select>
              </div>
              <div>
                <FormLabel>SDR Responsável</FormLabel>
                <select className="form-input" value={responsavelSDRId} onChange={(e) => setResponsavelSDRId(e.target.value)}>
                  <option value="">Selecionar...</option>
                  {sdrUsers.map((u) => <option key={u.id} value={u.id}>{u.nome}</option>)}
                </select>
              </div>
            </div>

            {/* Interesses */}
            <div className="mt-3">
              <FormLabel>Tipos de interesse</FormLabel>
              <div className="flex flex-wrap gap-2 mt-1">
                {tiposInteresseOptions.map(({ id, nome }) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => toggleInteresse(nome)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                      interesses.includes(nome) ? 'text-white border-transparent' : 'text-gray-600 border-gray-200 hover:border-gray-300'
                    }`}
                    style={interesses.includes(nome) ? { backgroundColor: '#d55006', borderColor: '#d55006' } : {}}
                  >
                    {nome}
                  </button>
                ))}
              </div>
            </div>

            {/* Qualificação booleans */}
            <div className="grid grid-cols-3 gap-3 mt-3">
              {[
                { label: 'Possui investidores', value: possuiInvestidores, set: setPossuiInvestidores },
                { label: 'Potencial +2.5M', value: potencialParceria, set: setPotencialParceria },
                { label: 'No treinamento', value: treinamento, set: setTreinamento },
              ].map(({ label, value, set }) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => set(!value)}
                  className={`py-2 px-3 rounded-lg text-xs font-semibold border transition-all ${
                    value ? 'text-white border-transparent' : 'text-gray-600 border-gray-200'
                  }`}
                  style={value ? { backgroundColor: '#059669', borderColor: '#059669' } : {}}
                >
                  {value ? '✓ ' : ''}{label}
                </button>
              ))}
            </div>
          </FormSection>

          {/* Observações */}
          <FormSection title="Observações" icon={<Mail size={14} style={{ color: '#d55006' }} />}>
            <textarea
              className="form-input resize-none"
              style={{ minHeight: 72 }}
              placeholder="Informações adicionais sobre o corretor..."
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
            />
          </FormSection>
        </div>

        {/* Footer */}
        <div className="flex items-center gap-3 px-4 sm:px-6 py-4 border-t bg-gray-50 rounded-b-2xl" style={{ borderColor: '#e5e7eb' }}>
          <button
            onClick={() => setShowNewCorretorModal(false)}
            className="px-5 py-2.5 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-200 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold text-white transition-colors hover:opacity-90 disabled:opacity-60"
            style={{ backgroundColor: '#d55006' }}
          >
            {submitting ? 'Criando...' : 'Criar Corretor'}
            {!submitting && <ChevronRight size={16} />}
          </button>
        </div>
      </div>
    </div>
  );
}

function FormSection({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        {icon}
        <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400">{title}</h3>
      </div>
      <div className="p-4 rounded-xl border space-y-3" style={{ borderColor: '#e5e7eb', backgroundColor: '#fafafa' }}>
        {children}
      </div>
    </div>
  );
}

function FormLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="text-xs font-semibold text-gray-600 mb-1 block">
      {children}
      {required && <span className="text-red-400 ml-0.5">*</span>}
    </label>
  );
}
