import { useEffect, useState } from 'react';
import { Building2, Save, Tag, Landmark, Wallet } from 'lucide-react';
import { useStore } from '../store';
import { ApiError } from '../api/client';
import { SettingsCard } from './SettingsCard';
import { EditableTagListCard } from './EditableTagListCard';

export function CompanyProfileView() {
  const companyProfile = useStore((s) => s.companyProfile);
  const updateCompanyProfile = useStore((s) => s.updateCompanyProfile);
  const canaisOrigem = useStore((s) => s.canaisOrigem);
  const createCanalOrigem = useStore((s) => s.createCanalOrigem);
  const updateCanalOrigem = useStore((s) => s.updateCanalOrigem);
  const removeCanalOrigem = useStore((s) => s.removeCanalOrigem);
  const tiposInteresseOptions = useStore((s) => s.tiposInteresseOptions);
  const createTipoInteresse = useStore((s) => s.createTipoInteresse);
  const updateTipoInteresse = useStore((s) => s.updateTipoInteresse);
  const removeTipoInteresse = useStore((s) => s.removeTipoInteresse);
  const imobiliariasOptions = useStore((s) => s.imobiliariasOptions);
  const createImobiliaria = useStore((s) => s.createImobiliaria);
  const updateImobiliaria = useStore((s) => s.updateImobiliaria);
  const removeImobiliaria = useStore((s) => s.removeImobiliaria);
  const condicoesPagamentoOptions = useStore((s) => s.condicoesPagamentoOptions);
  const createCondicaoPagamento = useStore((s) => s.createCondicaoPagamento);
  const updateCondicaoPagamento = useStore((s) => s.updateCondicaoPagamento);
  const removeCondicaoPagamento = useStore((s) => s.removeCondicaoPagamento);
  const currentUser = useStore((s) => s.currentUser);
  const isReadOnly = currentUser?.cargo === 'Marketing';

  const [companyName, setCompanyName] = useState('');
  const [companyCnpj, setCompanyCnpj] = useState('');
  const [companyCity, setCompanyCity] = useState('');
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  useEffect(() => {
    if (companyProfile) {
      setCompanyName(companyProfile.nome);
      setCompanyCnpj(companyProfile.cnpj);
      setCompanyCity(companyProfile.cidade);
    }
  }, [companyProfile]);

  const isDirty = !!companyProfile && (
    companyName !== companyProfile.nome ||
    companyCnpj !== companyProfile.cnpj ||
    companyCity !== companyProfile.cidade
  );

  async function handleSave() {
    if (!isDirty) return;
    setProfileError(null);
    setSaving(true);
    try {
      await updateCompanyProfile({ nome: companyName, cnpj: companyCnpj, cidade: companyCity });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setProfileError(err instanceof ApiError ? err.message : 'Não foi possível salvar o perfil da empresa');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="h-full overflow-y-auto" style={{ backgroundColor: '#e6e3de' }}>
      <div className="max-w-4xl mx-auto px-4 md:px-6 py-6 md:py-8 space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
            Perfil da Empresa
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Informações gerais da empresa exibidas no sistema.
          </p>
        </div>

        <SettingsCard
          icon={<Building2 size={18} style={{ color: '#d55006' }} />}
          title="Perfil da Empresa"
          subtitle="Informações gerais da empresa"
        >
          <fieldset disabled={isReadOnly} className="border-0 m-0 min-w-0 p-0">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="text-xs font-semibold text-gray-500 block mb-1.5">Nome da empresa</label>
              <input
                className="w-full text-sm px-3 py-2.5 rounded-xl border focus:outline-none transition-colors"
                style={{ borderColor: '#e5e7eb' }}
                onFocus={(e) => (e.target.style.borderColor = '#d55006')}
                onBlur={(e) => (e.target.style.borderColor = '#e5e7eb')}
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 block mb-1.5">CNPJ</label>
              <input
                className="w-full text-sm px-3 py-2.5 rounded-xl border focus:outline-none transition-colors"
                style={{ borderColor: '#e5e7eb' }}
                onFocus={(e) => (e.target.style.borderColor = '#d55006')}
                onBlur={(e) => (e.target.style.borderColor = '#e5e7eb')}
                value={companyCnpj}
                onChange={(e) => setCompanyCnpj(e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 block mb-1.5">Cidade / Estado</label>
              <input
                className="w-full text-sm px-3 py-2.5 rounded-xl border focus:outline-none transition-colors"
                style={{ borderColor: '#e5e7eb' }}
                onFocus={(e) => (e.target.style.borderColor = '#d55006')}
                onBlur={(e) => (e.target.style.borderColor = '#e5e7eb')}
                value={companyCity}
                onChange={(e) => setCompanyCity(e.target.value)}
              />
            </div>
          </div>
          {profileError && (
            <p className="text-xs mt-2 text-right" style={{ color: '#dc2626' }}>{profileError}</p>
          )}

          <div className="flex justify-end mt-2">
            <button
              onClick={handleSave}
              disabled={!isDirty || saving}
              className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-white rounded-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ backgroundColor: saved ? '#059669' : '#d55006' }}
            >
              <Save size={14} />
              {saved ? 'Salvo!' : saving ? 'Salvando...' : 'Salvar alterações'}
            </button>
          </div>
          </fieldset>
        </SettingsCard>

        <EditableTagListCard
          icon={<Building2 size={18} style={{ color: '#d55006' }} />}
          title="Canais de Origem"
          subtitle="Gerencie os canais disponíveis para classificar a origem dos corretores"
          placeholder="Nome do novo canal (ex: Facebook Ads)"
          items={canaisOrigem}
          onCreate={createCanalOrigem}
          onUpdate={(id, nome) => updateCanalOrigem(id, { nome })}
          onRemove={removeCanalOrigem}
          readOnly={isReadOnly}
        />

        <EditableTagListCard
          icon={<Tag size={18} style={{ color: '#d55006' }} />}
          title="Tipos de Interesse"
          subtitle="Gerencie os tipos de interesse disponíveis para qualificar os corretores"
          placeholder="Nome do novo tipo (ex: Locação)"
          items={tiposInteresseOptions}
          onCreate={createTipoInteresse}
          onUpdate={(id, nome) => updateTipoInteresse(id, { nome })}
          onRemove={removeTipoInteresse}
          readOnly={isReadOnly}
        />

        <EditableTagListCard
          icon={<Landmark size={18} style={{ color: '#d55006' }} />}
          title="Imobiliárias"
          subtitle="Gerencie as imobiliárias disponíveis para associar aos corretores"
          placeholder="Nome da nova imobiliária"
          items={imobiliariasOptions}
          onCreate={createImobiliaria}
          onUpdate={(id, nome) => updateImobiliaria(id, { nome })}
          onRemove={removeImobiliaria}
          readOnly={isReadOnly}
        />

        <EditableTagListCard
          icon={<Wallet size={18} style={{ color: '#d55006' }} />}
          title="Condições de Pagamento"
          subtitle="Gerencie as condições disponíveis para preencher nas propostas dos corretores"
          placeholder="Nome da nova condição (ex: 30% entrada + financiamento)"
          items={condicoesPagamentoOptions}
          onCreate={createCondicaoPagamento}
          onUpdate={(id, nome) => updateCondicaoPagamento(id, { nome })}
          onRemove={removeCondicaoPagamento}
          readOnly={isReadOnly}
        />
      </div>
    </div>
  );
}
