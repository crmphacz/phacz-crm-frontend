import { useState } from 'react';
import { X, Home, ChevronRight } from 'lucide-react';
import { ApiError } from '../api/client';
import { maskCurrencyBRLInput, parseCurrencyBRL, formatCurrencyBRL, STATUS_UNIDADE_CONFIG } from '../utils';
import type { StatusUnidade, Unidade, CreateUnidadePayload } from '../types';

interface UnidadeFormModalProps {
  unidade?: Unidade | null;
  onClose: () => void;
  onSave: (data: CreateUnidadePayload) => Promise<unknown>;
}

const STATUS_OPTIONS: StatusUnidade[] = ['disponivel', 'em_negociacao', 'em_contrato', 'vendido', 'alugado'];

export function UnidadeFormModal({ unidade, onClose, onSave }: UnidadeFormModalProps) {
  const [tipo, setTipo] = useState(unidade?.tipo ?? '');
  const [numero, setNumero] = useState(unidade?.numero ?? '');
  const [metragem, setMetragem] = useState(unidade ? String(unidade.metragemPrivativa).replace('.', ',') : '');
  const [valor, setValor] = useState(unidade ? formatCurrencyBRL(unidade.valor) : '');
  const [status, setStatus] = useState<StatusUnidade>(unidade?.status ?? 'disponivel');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  function validate() {
    const e: Record<string, string> = {};
    if (!tipo.trim()) e.tipo = 'Informe o tipo';
    if (!numero.trim()) e.numero = 'Informe o número da unidade';
    if (!status) e.status = 'Selecione o status';
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
              <input
                className={`form-input ${errors.tipo ? 'border-red-400' : ''}`}
                placeholder="Ex: Tipo 5"
                value={tipo}
                onChange={(e) => { setTipo(e.target.value); setErrors((er) => ({ ...er, tipo: '' })); }}
              />
              {errors.tipo && <p className="text-xs text-red-500 mt-1">{errors.tipo}</p>}
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
