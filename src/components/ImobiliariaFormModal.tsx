import { useState } from 'react';
import { X, Landmark, ChevronRight } from 'lucide-react';
import { useStore } from '../store';
import { ApiError } from '../api/client';
import { maskCNPJ } from '../utils';
import type { ImobiliariaItem } from '../api/endpoints';

interface ImobiliariaFormModalProps {
  imobiliaria?: ImobiliariaItem | null;
  onClose: () => void;
}

export function ImobiliariaFormModal({ imobiliaria, onClose }: ImobiliariaFormModalProps) {
  const createImobiliaria = useStore((s) => s.createImobiliaria);
  const updateImobiliaria = useStore((s) => s.updateImobiliaria);

  const [nome, setNome] = useState(imobiliaria?.nome ?? '');
  const [cnpj, setCnpj] = useState(imobiliaria?.cnpj ?? '');
  const [cidade, setCidade] = useState(imobiliaria?.cidade ?? '');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  function validate() {
    const e: Record<string, string> = {};
    if (!nome.trim()) e.nome = 'Informe o nome da imobiliária';
    if (!cnpj.trim()) e.cnpj = 'Informe o CNPJ';
    if (!cidade.trim()) e.cidade = 'Informe a cidade';
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
      const payload = { nome: nome.trim(), cnpj: cnpj.trim(), cidade: cidade.trim() };
      if (imobiliaria) {
        await updateImobiliaria(imobiliaria.id, payload);
      } else {
        await createImobiliaria(payload);
      }
      onClose();
    } catch (err) {
      setSubmitError(err instanceof ApiError ? err.message : 'Não foi possível salvar a imobiliária. Tente novamente.');
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
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-2 sm:mx-4 flex flex-col" style={{ maxHeight: '92vh' }}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-4 sm:py-5 border-b flex-shrink-0" style={{ borderColor: '#e5e7eb' }}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: '#fff7ed' }}>
              <Landmark size={18} style={{ color: '#d55006' }} />
            </div>
            <div>
              <h2 className="font-questrial font-bold text-lg text-gray-900">{imobiliaria ? 'Editar Imobiliária' : 'Nova Imobiliária'}</h2>
              <p className="text-xs text-gray-400">Cadastre os dados da imobiliária</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-100 transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 sm:py-5 space-y-4">
          <div>
            <label className="text-xs font-semibold text-gray-600 mb-1 block">
              Nome<span className="text-red-400 ml-0.5">*</span>
            </label>
            <input
              className={`form-input ${errors.nome ? 'border-red-400' : ''}`}
              value={nome}
              onChange={(e) => { setNome(e.target.value); setErrors((er) => ({ ...er, nome: '' })); }}
            />
            {errors.nome && <p className="text-xs text-red-500 mt-1">{errors.nome}</p>}
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-600 mb-1 block">
              CNPJ<span className="text-red-400 ml-0.5">*</span>
            </label>
            <input
              className={`form-input ${errors.cnpj ? 'border-red-400' : ''}`}
              placeholder="00.000.000/0000-00"
              inputMode="numeric"
              value={cnpj}
              onChange={(e) => { setCnpj(maskCNPJ(e.target.value)); setErrors((er) => ({ ...er, cnpj: '' })); }}
            />
            {errors.cnpj && <p className="text-xs text-red-500 mt-1">{errors.cnpj}</p>}
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-600 mb-1 block">
              Cidade<span className="text-red-400 ml-0.5">*</span>
            </label>
            <input
              className={`form-input ${errors.cidade ? 'border-red-400' : ''}`}
              value={cidade}
              onChange={(e) => { setCidade(e.target.value); setErrors((er) => ({ ...er, cidade: '' })); }}
            />
            {errors.cidade && <p className="text-xs text-red-500 mt-1">{errors.cidade}</p>}
          </div>

          {submitError && <p className="text-xs text-red-500">{submitError}</p>}
        </div>

        {/* Footer */}
        <div className="flex items-center gap-3 px-4 sm:px-6 py-4 border-t bg-gray-50 rounded-b-2xl flex-shrink-0" style={{ borderColor: '#e5e7eb' }}>
          <button onClick={onClose} className="px-5 py-2.5 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-200 transition-colors">
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold text-white transition-colors hover:opacity-90 disabled:opacity-60"
            style={{ backgroundColor: '#d55006' }}
          >
            {submitting ? 'Salvando...' : imobiliaria ? 'Salvar alterações' : 'Cadastrar Imobiliária'}
            {!submitting && <ChevronRight size={16} />}
          </button>
        </div>
      </div>
    </div>
  );
}
