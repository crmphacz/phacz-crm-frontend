import { useState } from 'react';
import { X, Home, ChevronRight } from 'lucide-react';
import { ApiError } from '../api/client';
import { maskCurrencyBRLInput, parseCurrencyBRL, formatCurrencyBRL, STATUS_UNIDADE_CONFIG } from '../utils';
import type { StatusUnidade, Unidade, CreateUnidadePayload, EmpreendimentoDetail } from '../types';

interface UnidadeFormModalProps {
  unidade?: Unidade | null;
  empreendimento: EmpreendimentoDetail;
  onClose: () => void;
  onSave: (data: CreateUnidadePayload) => Promise<unknown>;
}

const STATUS_OPTIONS: StatusUnidade[] = ['disponivel', 'em_negociacao', 'em_contrato', 'vendido', 'alugado'];

export function UnidadeFormModal({ unidade, empreendimento, onClose, onSave }: UnidadeFormModalProps) {
  const [tipo, setTipo] = useState(unidade?.tipo ?? '');
  const [numero, setNumero] = useState(unidade?.numero ?? '');
  const [metragem, setMetragem] = useState(unidade ? String(unidade.metragemPrivativa).replace('.', ',') : '');
  const [valor, setValor] = useState(unidade ? formatCurrencyBRL(unidade.valor) : '');
  const [status, setStatus] = useState<StatusUnidade>(unidade?.status ?? 'disponivel');
  const [suites, setSuites] = useState(unidade?.suites ?? empreendimento.suitesMin);
  const [vagas, setVagas] = useState(unidade?.vagas ?? 0);
  const [observacoes, setObservacoes] = useState(unidade?.observacoes ?? '');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  function validate() {
    const e: Record<string, string> = {};
    if (!tipo.trim()) e.tipo = 'Informe o tipo';
    if (!numero.trim()) e.numero = 'Informe o número da unidade';
    if (!status) e.status = 'Selecione o status';
    if (suites < empreendimento.suitesMin || suites > empreendimento.suitesMax) {
      e.suites = `Suítes deve estar entre ${empreendimento.suitesMin} e ${empreendimento.suitesMax}`;
    }
    if (vagas < 0 || vagas > empreendimento.vagasGaragem) {
      e.vagas = `Vagas deve estar entre 0 e ${empreendimento.vagasGaragem}`;
    }
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
    try {
      await onSave({
        tipo: tipo.trim(),
        numero: numero.trim(),
        metragemPrivativa: Number(metragem.replace(',', '.')) || 0,
        valor: parseCurrencyBRL(valor) ?? 0,
        status,
        suites,
        vagas,
        observacoes: observacoes.trim(),
      });
      onClose();
    } catch (err) {
      setSubmitError(err instanceof ApiError ? err.message : 'Não foi possível salvar a unidade. Tente novamente.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center modal-backdrop"
      style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-2 sm:mx-4 flex flex-col" style={{ maxHeight: '90vh' }}>
        <div className="flex items-center justify-between px-4 sm:px-6 py-4 sm:py-5 border-b" style={{ borderColor: '#e5e7eb' }}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: '#fff7ed' }}>
              <Home size={18} style={{ color: '#d55006' }} />
            </div>
            <h2 className="font-questrial font-bold text-lg text-gray-900">{unidade ? 'Editar Unidade' : 'Nova Unidade'}</h2>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-100 transition-colors">
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 sm:py-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <FormLabel required>Tipo</FormLabel>
              <select
                className={`form-input ${errors.tipo ? 'border-red-400' : ''}`}
                value={tipo}
                onChange={(e) => { setTipo(e.target.value); setErrors((er) => ({ ...er, tipo: '' })); }}
              >
                <option value="">Selecionar...</option>
                {tipo && !empreendimento.tipos.includes(tipo) && <option value={tipo}>{tipo}</option>}
                {empreendimento.tipos.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
              {errors.tipo && <p className="text-xs text-red-500 mt-1">{errors.tipo}</p>}
              {empreendimento.tipos.length === 0 && (
                <p className="text-xs text-gray-400 mt-1">Nenhum tipo cadastrado — edite o empreendimento para adicionar tipos.</p>
              )}
            </div>
            <div>
              <FormLabel required>Número</FormLabel>
              <input
                className={`form-input ${errors.numero ? 'border-red-400' : ''}`}
                placeholder="Ex: 701"
                value={numero}
                onChange={(e) => { setNumero(e.target.value); setErrors((er) => ({ ...er, numero: '' })); }}
              />
              {errors.numero && <p className="text-xs text-red-500 mt-1">{errors.numero}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <FormLabel>Metragem privativa (m²)</FormLabel>
              <input
                className="form-input"
                inputMode="decimal"
                placeholder="0,00"
                value={metragem}
                onChange={(e) => setMetragem(e.target.value.replace(/[^0-9,]/g, ''))}
              />
            </div>
            <div>
              <FormLabel>Valor</FormLabel>
              <input
                className="form-input"
                inputMode="numeric"
                placeholder="R$ 0,00"
                value={valor}
                onChange={(e) => setValor(maskCurrencyBRLInput(e.target.value))}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <FormLabel>Suítes</FormLabel>
              <input
                type="number"
                min={empreendimento.suitesMin}
                max={empreendimento.suitesMax}
                className={`form-input ${errors.suites ? 'border-red-400' : ''}`}
                value={suites}
                onChange={(e) => { setSuites(Number(e.target.value) || 0); setErrors((er) => ({ ...er, suites: '' })); }}
              />
              {errors.suites
                ? <p className="text-xs text-red-500 mt-1">{errors.suites}</p>
                : <p className="text-xs text-gray-400 mt-1">Entre {empreendimento.suitesMin} e {empreendimento.suitesMax}</p>}
            </div>
            <div>
              <FormLabel>Vagas</FormLabel>
              <input
                type="number"
                min={0}
                max={empreendimento.vagasGaragem}
                className={`form-input ${errors.vagas ? 'border-red-400' : ''}`}
                value={vagas}
                onChange={(e) => { setVagas(Number(e.target.value) || 0); setErrors((er) => ({ ...er, vagas: '' })); }}
              />
              {errors.vagas
                ? <p className="text-xs text-red-500 mt-1">{errors.vagas}</p>
                : <p className="text-xs text-gray-400 mt-1">Entre 0 e {empreendimento.vagasGaragem}</p>}
            </div>
          </div>

          <div>
            <FormLabel>Observações / Peculiaridades</FormLabel>
            <textarea
              className="form-input resize-none"
              style={{ minHeight: 64 }}
              placeholder="Ex: vista para o mar, unidade de esquina..."
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
            />
          </div>

          <div>
            <FormLabel required>Status</FormLabel>
            <select
              className={`form-input ${errors.status ? 'border-red-400' : ''}`}
              value={status}
              onChange={(e) => { setStatus(e.target.value as StatusUnidade); setErrors((er) => ({ ...er, status: '' })); }}
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>{STATUS_UNIDADE_CONFIG[s].label}</option>
              ))}
            </select>
          </div>

          {submitError && <p className="text-xs text-red-500">{submitError}</p>}
        </div>

        <div className="flex items-center gap-3 px-4 sm:px-6 py-4 border-t bg-gray-50 rounded-b-2xl" style={{ borderColor: '#e5e7eb' }}>
          <button onClick={onClose} className="px-5 py-2.5 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-200 transition-colors">
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold text-white transition-colors hover:opacity-90 disabled:opacity-60"
            style={{ backgroundColor: '#d55006' }}
          >
            {submitting ? 'Salvando...' : unidade ? 'Salvar alterações' : 'Cadastrar Unidade'}
            {!submitting && <ChevronRight size={16} />}
          </button>
        </div>
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
