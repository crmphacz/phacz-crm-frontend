import { useEffect, useMemo, useState } from 'react';
import { X, Building2, ChevronRight, Plus, Trash2 } from 'lucide-react';
import { useStore } from '../store';
import { ApiError } from '../api/client';
import { empreendimentosApi } from '../api/endpoints';
import { fetchMunicipiosBrasil, ESTADOS_BR, type MunicipioBR } from '../api/ibge';
import { maskPhone } from '../utils';
import { FileDropzone } from './FileDropzone';
import { Combobox, type ComboboxOption } from './Combobox';
import type { Empreendimento, EmpreendimentoDetail, CreateEmpreendimentoPayload } from '../types';

const UF_OPTIONS: ComboboxOption[] = ESTADOS_BR.map((e) => ({ id: e.sigla, label: e.sigla, sublabel: e.nome }));

interface EmpreendimentoFormModalProps {
  empreendimento?: Empreendimento | EmpreendimentoDetail | null;
  onClose: () => void;
  onSaved?: (empreendimento: Empreendimento) => void;
}

export function EmpreendimentoFormModal({ empreendimento, onClose, onSaved }: EmpreendimentoFormModalProps) {
  const createEmpreendimento = useStore((s) => s.createEmpreendimento);
  const updateEmpreendimento = useStore((s) => s.updateEmpreendimento);

  const [nome, setNome] = useState(empreendimento?.nome ?? '');
  const [incorporadora, setIncorporadora] = useState(empreendimento?.incorporadora ?? '');
  const [imagemCapaUrl, setImagemCapaUrl] = useState(empreendimento?.imagemCapaUrl ?? '');
  const [logoIncorporadoraUrl, setLogoIncorporadoraUrl] = useState(empreendimento?.logoIncorporadoraUrl ?? '');
  const [rua, setRua] = useState(empreendimento?.rua ?? '');
  const [numero, setNumero] = useState(empreendimento?.numero ?? '');
  const [bairro, setBairro] = useState(empreendimento?.bairro ?? '');
  const [cidade, setCidade] = useState(empreendimento?.cidade ?? '');
  const [uf, setUf] = useState(empreendimento?.uf ?? '');
  const [inicioObra, setInicioObra] = useState(empreendimento?.inicioObra ?? '');
  const [dataEntrega, setDataEntrega] = useState(empreendimento?.dataEntrega ?? '');
  const [percentualConcluido, setPercentualConcluido] = useState(empreendimento?.percentualConcluido ?? 0);
  const [faixaIncorporacao, setFaixaIncorporacao] = useState(empreendimento?.faixaIncorporacao ?? '');
  const [dormitoriosMin, setDormitoriosMin] = useState(empreendimento?.dormitoriosMin ?? 0);
  const [dormitoriosMax, setDormitoriosMax] = useState(empreendimento?.dormitoriosMax ?? 0);
  const [suitesMin, setSuitesMin] = useState(empreendimento?.suitesMin ?? 0);
  const [suitesMax, setSuitesMax] = useState(empreendimento?.suitesMax ?? 0);
  const [vagasGaragem, setVagasGaragem] = useState(empreendimento?.vagasGaragem ?? 0);
  const [caracteristicas, setCaracteristicas] = useState<string[]>(empreendimento?.caracteristicas ?? []);
  const [novaCaracteristica, setNovaCaracteristica] = useState('');
  const [hotsiteUrl, setHotsiteUrl] = useState(empreendimento?.hotsiteUrl ?? '');
  const [catalogoUrl, setCatalogoUrl] = useState(empreendimento?.catalogoUrl ?? '');
  const [telefoneContato, setTelefoneContato] = useState(empreendimento?.telefoneContato ?? '');

  const [uploadingCapa, setUploadingCapa] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const [municipios, setMunicipios] = useState<MunicipioBR[]>([]);
  useEffect(() => {
    fetchMunicipiosBrasil().then(setMunicipios).catch(() => {
      // Sem autocomplete de cidade nesse caso — os campos continuam editáveis normalmente.
    });
  }, []);
  const cidadeOptions = useMemo<ComboboxOption[]>(
    () => municipios.map((m) => ({ id: `${m.nome}|${m.uf}`, label: m.nome, sublabel: m.uf })),
    [municipios]
  );

  function addCaracteristica() {
    const value = novaCaracteristica.trim();
    if (!value) return;
    setCaracteristicas((prev) => [...prev, value]);
    setNovaCaracteristica('');
  }

  function removeCaracteristica(index: number) {
    setCaracteristicas((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleUpload(file: File, setUrl: (url: string) => void, setUploading: (v: boolean) => void) {
    setUploading(true);
    try {
      const { url } = await empreendimentosApi.uploadAsset(file);
      setUrl(url);
    } catch (err) {
      setSubmitError(err instanceof ApiError ? err.message : 'Não foi possível enviar a imagem.');
    } finally {
      setUploading(false);
    }
  }

  function validate() {
    const e: Record<string, string> = {};
    if (!nome.trim()) e.nome = 'Informe o nome do empreendimento';
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
      const payload: CreateEmpreendimentoPayload = {
        nome: nome.trim(),
        incorporadora: incorporadora.trim(),
        imagemCapaUrl: imagemCapaUrl.trim(),
        logoIncorporadoraUrl: logoIncorporadoraUrl.trim(),
        rua: rua.trim(),
        numero: numero.trim(),
        bairro: bairro.trim(),
        cidade: cidade.trim(),
        uf: uf.trim().toUpperCase(),
        inicioObra: inicioObra || undefined,
        dataEntrega: dataEntrega || undefined,
        percentualConcluido,
        faixaIncorporacao: faixaIncorporacao.trim(),
        dormitoriosMin,
        dormitoriosMax,
        suitesMin,
        suitesMax,
        vagasGaragem,
        caracteristicas,
        hotsiteUrl: hotsiteUrl.trim(),
        catalogoUrl: catalogoUrl.trim(),
        telefoneContato: telefoneContato.trim(),
      };
      const saved = empreendimento
        ? await updateEmpreendimento(empreendimento.id, payload)
        : await createEmpreendimento(payload);
      onSaved?.(saved);
      onClose();
    } catch (err) {
      setSubmitError(err instanceof ApiError ? err.message : 'Não foi possível salvar o empreendimento. Tente novamente.');
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
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-2 sm:mx-4 flex flex-col" style={{ maxHeight: '92vh' }}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-4 sm:py-5 border-b flex-shrink-0" style={{ borderColor: '#e5e7eb' }}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: '#fff7ed' }}>
              <Building2 size={18} style={{ color: '#d55006' }} />
            </div>
            <div>
              <h2 className="font-questrial font-bold text-lg text-gray-900">{empreendimento ? 'Editar Empreendimento' : 'Novo Empreendimento'}</h2>
              <p className="text-xs text-gray-400">Cadastre os dados do empreendimento</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-100 transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 sm:py-5 space-y-5">
          <FormSection title="Identificação">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <FormLabel required>Nome do empreendimento</FormLabel>
                <input
                  className={`form-input ${errors.nome ? 'border-red-400' : ''}`}
                  value={nome}
                  onChange={(e) => { setNome(e.target.value); setErrors((er) => ({ ...er, nome: '' })); }}
                />
                {errors.nome && <p className="text-xs text-red-500 mt-1">{errors.nome}</p>}
              </div>
              <div>
                <FormLabel>Incorporadora</FormLabel>
                <input className="form-input" value={incorporadora} onChange={(e) => setIncorporadora(e.target.value)} />
              </div>
              <div>
                <FormLabel>Telefone de contato</FormLabel>
                <input
                  className="form-input"
                  inputMode="numeric"
                  placeholder="(11) 91234-5678"
                  value={telefoneContato}
                  onChange={(e) => setTelefoneContato(maskPhone(e.target.value))}
                />
              </div>
            </div>
          </FormSection>

          <FormSection title="Imagens">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <FormLabel>Imagem de capa</FormLabel>
                <input
                  className="form-input mb-2"
                  placeholder="https://..."
                  value={imagemCapaUrl}
                  onChange={(e) => setImagemCapaUrl(e.target.value)}
                />
                <FileDropzone
                  id="empreendimento-capa"
                  accept="image/jpeg,image/png,image/webp"
                  hint="Arraste uma imagem ou clique para escolher"
                  uploading={uploadingCapa}
                  onFile={(file) => handleUpload(file, setImagemCapaUrl, setUploadingCapa)}
                />
              </div>
              <div>
                <FormLabel>Logo da incorporadora</FormLabel>
                <input
                  className="form-input mb-2"
                  placeholder="https://..."
                  value={logoIncorporadoraUrl}
                  onChange={(e) => setLogoIncorporadoraUrl(e.target.value)}
                />
                <FileDropzone
                  id="empreendimento-logo"
                  accept="image/jpeg,image/png,image/webp"
                  hint="Arraste uma imagem ou clique para escolher"
                  uploading={uploadingLogo}
                  onFile={(file) => handleUpload(file, setLogoIncorporadoraUrl, setUploadingLogo)}
                />
              </div>
            </div>
          </FormSection>

          <FormSection title="Endereço">
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div className="sm:col-span-2">
                <FormLabel>Rua</FormLabel>
                <input className="form-input" value={rua} onChange={(e) => setRua(e.target.value)} />
              </div>
              <div>
                <FormLabel>Número</FormLabel>
                <input className="form-input" value={numero} onChange={(e) => setNumero(e.target.value)} />
              </div>
              <div>
                <FormLabel>Bairro</FormLabel>
                <input className="form-input" value={bairro} onChange={(e) => setBairro(e.target.value)} />
              </div>
              <div className="sm:col-span-3">
                <FormLabel>Cidade</FormLabel>
                <Combobox
                  className="form-input"
                  placeholder="Digite para buscar..."
                  value={cidade}
                  onChange={setCidade}
                  onSelect={(o) => { setCidade(o.label); if (o.sublabel) setUf(o.sublabel); }}
                  options={cidadeOptions}
                />
              </div>
              <div>
                <FormLabel>UF</FormLabel>
                <Combobox
                  className="form-input"
                  placeholder="UF"
                  value={uf}
                  onChange={(v) => setUf(v.toUpperCase())}
                  onSelect={(o) => setUf(o.label)}
                  options={UF_OPTIONS}
                />
              </div>
            </div>
          </FormSection>

          <FormSection title="Obra">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <FormLabel>Início da obra</FormLabel>
                <input type="date" className="form-input" value={inicioObra} onChange={(e) => setInicioObra(e.target.value)} />
              </div>
              <div>
                <FormLabel>Data de entrega</FormLabel>
                <input type="date" className="form-input" value={dataEntrega} onChange={(e) => setDataEntrega(e.target.value)} />
              </div>
              <div>
                <FormLabel>Percentual concluído ({percentualConcluido}%)</FormLabel>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={percentualConcluido}
                  onChange={(e) => setPercentualConcluido(Number(e.target.value))}
                  className="w-full"
                />
              </div>
              <div>
                <FormLabel>Faixa de incorporação</FormLabel>
                <input className="form-input" value={faixaIncorporacao} onChange={(e) => setFaixaIncorporacao(e.target.value)} />
              </div>
            </div>
          </FormSection>

          <FormSection title="Características do imóvel">
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
              <div>
                <FormLabel>Dorm. mín.</FormLabel>
                <input type="number" min={0} className="form-input" value={dormitoriosMin} onChange={(e) => setDormitoriosMin(Number(e.target.value) || 0)} />
              </div>
              <div>
                <FormLabel>Dorm. máx.</FormLabel>
                <input type="number" min={0} className="form-input" value={dormitoriosMax} onChange={(e) => setDormitoriosMax(Number(e.target.value) || 0)} />
              </div>
              <div>
                <FormLabel>Suítes mín.</FormLabel>
                <input type="number" min={0} className="form-input" value={suitesMin} onChange={(e) => setSuitesMin(Number(e.target.value) || 0)} />
              </div>
              <div>
                <FormLabel>Suítes máx.</FormLabel>
                <input type="number" min={0} className="form-input" value={suitesMax} onChange={(e) => setSuitesMax(Number(e.target.value) || 0)} />
              </div>
              <div>
                <FormLabel>Vagas</FormLabel>
                <input type="number" min={0} className="form-input" value={vagasGaragem} onChange={(e) => setVagasGaragem(Number(e.target.value) || 0)} />
              </div>
            </div>
          </FormSection>

          <FormSection title="Características (lista)">
            <div className="flex gap-2">
              <input
                className="form-input"
                placeholder="Ex: Churrasqueira"
                value={novaCaracteristica}
                onChange={(e) => setNovaCaracteristica(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCaracteristica(); } }}
              />
              <button
                type="button"
                onClick={addCaracteristica}
                className="flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center text-white hover:opacity-90 transition-colors"
                style={{ backgroundColor: '#d55006' }}
              >
                <Plus size={16} />
              </button>
            </div>
            {caracteristicas.length > 0 && (
              <ul className="space-y-1.5 mt-3">
                {caracteristicas.map((item, index) => (
                  <li key={`${item}-${index}`} className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-white border" style={{ borderColor: '#e5e7eb' }}>
                    <span className="text-sm text-gray-700">{item}</span>
                    <button type="button" onClick={() => removeCaracteristica(index)} className="text-gray-400 hover:text-red-500 flex-shrink-0">
                      <Trash2 size={13} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </FormSection>

          <FormSection title="Links">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <FormLabel>Link do hotsite</FormLabel>
                <input className="form-input" placeholder="https://..." value={hotsiteUrl} onChange={(e) => setHotsiteUrl(e.target.value)} />
              </div>
              <div>
                <FormLabel>Link do catálogo</FormLabel>
                <input className="form-input" placeholder="https://..." value={catalogoUrl} onChange={(e) => setCatalogoUrl(e.target.value)} />
              </div>
            </div>
          </FormSection>

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
            {submitting ? 'Salvando...' : empreendimento ? 'Salvar alterações' : 'Cadastrar Empreendimento'}
            {!submitting && <ChevronRight size={16} />}
          </button>
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
