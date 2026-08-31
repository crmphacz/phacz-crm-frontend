import { useMemo, useState } from 'react';
import { X, User, Search, ChevronRight } from 'lucide-react';
import { useStore } from '../store';
import type { ClienteFinalComContexto } from '../store';
import { ApiError } from '../api/client';
import { maskPhone, maskCurrencyBRLInput, parseCurrencyBRL, formatCurrencyBRL, getInitials } from '../utils';
import { UF_OPTIONS, useCidadesPorUf } from '../lib/ibge';
import { Combobox } from './Combobox';

interface NewClienteModalProps {
  onClose: () => void;
  onCreated?: (corretorId: string) => void;
  /** Presente = modo edição (dados + corretor responsável de um cliente já existente). */
  cliente?: ClienteFinalComContexto;
  /**
   * Em modo criação, já deixa esse corretor selecionado — usado ao abrir o modal pelo card
   * do Pipeline / painel do corretor, onde o responsável já está definido pelo contexto.
   */
  corretorId?: string;
}

export function NewClienteModal({ onClose, onCreated, cliente, corretorId: initialCorretorId }: NewClienteModalProps) {
  const isEdit = Boolean(cliente);
  // Ao editar um cliente já existente, o modal abre TRAVADO (só leitura) — clicar em "Editar"
  // libera os campos. Ao criar um novo, já abre liberado.
  const [editing, setEditing] = useState(!isEdit);
  const corretores = useStore((s) => s.corretores);
  const addClienteFinal = useStore((s) => s.addClienteFinal);
  const updateClienteFinal = useStore((s) => s.updateClienteFinal);

  const corretorOptions = useMemo(
    () =>
      corretores
        .filter((c) => c.status !== 'arquivado' && c.status !== 'perdido')
        .sort((a, b) => a.nomeCorretor.localeCompare(b.nomeCorretor)),
    [corretores]
  );

  const [corretorSearch, setCorretorSearch] = useState('');
  const [corretorId, setCorretorId] = useState(cliente?.corretorId ?? initialCorretorId ?? '');

  const [nome, setNome] = useState(cliente?.nome ?? '');
  const [telefone, setTelefone] = useState(cliente ? maskPhone(cliente.telefone) : '');
  const [email, setEmail] = useState(cliente?.email ?? '');
  const [uf, setUf] = useState(cliente?.uf ?? '');
  const [cidade, setCidade] = useState(cliente?.cidade ?? '');
  const cidadesOptions = useCidadesPorUf(uf);
  const [interesse, setInteresse] = useState(cliente?.interesse ?? '');
  const [orcamento, setOrcamento] = useState(cliente?.orcamento ? formatCurrencyBRL(cliente.orcamento) : '');
  const [observacoes, setObservacoes] = useState(cliente?.observacoes ?? '');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const filteredCorretores = useMemo(() => {
    if (!corretorSearch) return corretorOptions;
    const q = corretorSearch.toLowerCase();
    return corretorOptions.filter(
      (c) => c.nomeCorretor.toLowerCase().includes(q) || c.imobiliaria.toLowerCase().includes(q)
    );
  }, [corretorOptions, corretorSearch]);

  // Busca na lista completa (não só nas opções filtradas) pra um corretor pré-selecionado
  // pelo contexto — ex.: card arquivado/perdido — ainda aparecer como selecionado.
  const selectedCorretor = corretores.find((c) => c.id === corretorId);

  function validate() {
    const e: Record<string, string> = {};
    if (!corretorId) e.corretor = 'Selecione o corretor responsável';
    if (!nome.trim()) e.nome = 'Nome é obrigatório';
    if (!telefone.trim()) e.telefone = 'Telefone é obrigatório';
    return e;
  }

  async function handleSubmit() {
    const e = validate();
    if (Object.keys(e).length > 0) {
      setErrors(e);
      return;
    }

    setSubmitting(true);
    setSubmitError('');
    const data = {
      nome: nome.trim(),
      telefone: telefone.trim(),
      email: email.trim() || undefined,
      cidade: cidade.trim() || undefined,
      uf: uf || undefined,
      interesse: interesse.trim(),
      orcamento: orcamento ? parseCurrencyBRL(orcamento) : undefined,
      observacoes: observacoes.trim() || undefined,
    };
    try {
      if (cliente) {
        await updateClienteFinal(cliente.corretorId, cliente.id, data, corretorId);
      } else {
        await addClienteFinal(corretorId, data);
      }
      onCreated?.(corretorId);
      onClose();
    } catch (err) {
      setSubmitError(
        err instanceof ApiError ? err.message : `Não foi possível ${isEdit ? 'salvar' : 'cadastrar'} o cliente. Tente novamente.`
      );
    } finally {
      setSubmitting(false);
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
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: '#fff7ed' }}>
              <User size={18} style={{ color: '#d55006' }} />
            </div>
            <div>
              <h2 className="font-questrial font-bold text-lg text-gray-900">
                {!isEdit ? 'Novo Cliente' : editing ? 'Editar Cliente' : 'Cliente'}
              </h2>
              <p className="text-xs text-gray-400">
                {!isEdit
                  ? 'Cadastre o cliente e vincule a um corretor'
                  : editing
                    ? 'Atualize os dados e o corretor responsável'
                    : 'Clique em "Editar" para alterar os dados'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-100 transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <fieldset disabled={!editing} className="flex-1 min-w-0 overflow-y-auto border-0 m-0 px-4 sm:px-6 py-4 sm:py-5 space-y-5">
          {/* Corretor */}
          <FormSection title="Corretor responsável">
            {selectedCorretor ? (
              <div
                className="flex items-center gap-3 p-2.5 rounded-xl border"
                style={{ borderColor: '#d55006', backgroundColor: '#fff7ed' }}
              >
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 font-questrial" style={{ backgroundColor: '#d55006' }}>
                  {getInitials(selectedCorretor.nomeCorretor)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-gray-800 truncate">{selectedCorretor.nomeCorretor}</p>
                  <p className="text-xs text-gray-500 truncate">{selectedCorretor.imobiliaria || 'Sem imobiliária'}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setCorretorId('')}
                  className="text-xs font-semibold flex-shrink-0"
                  style={{ color: '#d55006' }}
                >
                  Trocar
                </button>
              </div>
            ) : (
              <div>
                <div className="relative mb-2">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                  <input
                    className={`form-input ${errors.corretor ? 'border-red-400' : ''}`}
                    style={{ paddingLeft: '2.25rem' }}
                    placeholder="Buscar corretor ou imobiliária..."
                    value={corretorSearch}
                    onChange={(e) => { setCorretorSearch(e.target.value); setErrors((er) => ({ ...er, corretor: '' })); }}
                  />
                </div>
                <div className="border rounded-xl overflow-y-auto" style={{ borderColor: errors.corretor ? '#f87171' : '#e5e7eb', maxHeight: 180 }}>
                  {filteredCorretores.length === 0 && (
                    <p className="text-xs text-gray-400 text-center py-8">Nenhum corretor encontrado.</p>
                  )}
                  {filteredCorretores.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setCorretorId(c.id)}
                      className="w-full flex items-center gap-3 px-3 py-2.5 border-b last:border-b-0 hover:bg-gray-50 transition-colors text-left"
                      style={{ borderColor: '#f3f4f6' }}
                    >
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 font-questrial" style={{ backgroundColor: '#d55006' }}>
                        {getInitials(c.nomeCorretor)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-gray-800 truncate">{c.nomeCorretor}</p>
                        <p className="text-xs text-gray-400 truncate">{c.imobiliaria || 'Sem imobiliária'}</p>
                      </div>
                    </button>
                  ))}
                </div>
                {errors.corretor && <p className="text-xs text-red-500 mt-1">{errors.corretor}</p>}
              </div>
            )}
          </FormSection>

          {/* Cliente */}
          <FormSection title="Dados do Cliente">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <FormLabel required>Nome completo</FormLabel>
                <input
                  className={`form-input ${errors.nome ? 'border-red-400' : ''}`}
                  placeholder="Nome do cliente"
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
                <FormLabel>E-mail</FormLabel>
                <input
                  className="form-input"
                  placeholder="email@exemplo.com"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
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
              <div>
                <FormLabel>Orçamento</FormLabel>
                <input
                  className="form-input"
                  placeholder="R$ 0,00"
                  inputMode="numeric"
                  value={orcamento}
                  onChange={(e) => setOrcamento(maskCurrencyBRLInput(e.target.value))}
                />
              </div>
              <div>
                <FormLabel>Interesse / Tipo de imóvel</FormLabel>
                <input
                  className="form-input"
                  placeholder="Ex: Apartamento 3 quartos"
                  value={interesse}
                  onChange={(e) => setInteresse(e.target.value)}
                />
              </div>
              <div className="sm:col-span-2">
                <FormLabel>Observações</FormLabel>
                <textarea
                  className="form-input resize-none"
                  style={{ minHeight: 72 }}
                  placeholder="Contexto adicional..."
                  value={observacoes}
                  onChange={(e) => setObservacoes(e.target.value)}
                />
              </div>
            </div>
          </FormSection>

          {submitError && <p className="text-xs text-red-500">{submitError}</p>}
        </fieldset>

        {/* Footer */}
        <div className="flex items-center gap-3 px-4 sm:px-6 py-4 border-t bg-gray-50 rounded-b-2xl" style={{ borderColor: '#e5e7eb' }}>
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-200 transition-colors"
          >
            {editing ? 'Cancelar' : 'Fechar'}
          </button>
          {editing ? (
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold text-white transition-colors hover:opacity-90 disabled:opacity-60"
              style={{ backgroundColor: '#d55006' }}
            >
              {submitting ? 'Salvando...' : isEdit ? 'Salvar Alterações' : 'Cadastrar Cliente'}
              {!submitting && <ChevronRight size={16} />}
            </button>
          ) : (
            <button
              onClick={() => setEditing(true)}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold text-white transition-colors hover:opacity-90"
              style={{ backgroundColor: '#d55006' }}
            >
              Editar
              <ChevronRight size={16} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function FormSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">{title}</h3>
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
