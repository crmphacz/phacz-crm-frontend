import { useEffect, useState } from 'react';
import { Building2, Save, Tag, Landmark, Pencil, Trash2, Plus } from 'lucide-react';
import { useStore } from '../store';
import { ApiError } from '../api/client';
import { SettingsCard } from './SettingsCard';
import { EditableTagListCard } from './EditableTagListCard';
import { ImobiliariaFormModal } from './ImobiliariaFormModal';
import type { ImobiliariaItem } from '../api/endpoints';

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
  const removeImobiliaria = useStore((s) => s.removeImobiliaria);
  const setShowPrivacyPolicy = useStore((s) => s.setShowPrivacyPolicy);

  const [companyName, setCompanyName] = useState('');
  const [companyCnpj, setCompanyCnpj] = useState('');
  const [companyCity, setCompanyCity] = useState('');
  const [dpoNome, setDpoNome] = useState('');
  const [dpoEmail, setDpoEmail] = useState('');
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  const [showImobiliariaModal, setShowImobiliariaModal] = useState(false);
  const [editingImobiliaria, setEditingImobiliaria] = useState<ImobiliariaItem | null>(null);
  const [imobiliariaError, setImobiliariaError] = useState<string | null>(null);

  function openNewImobiliaria() {
    setEditingImobiliaria(null);
    setShowImobiliariaModal(true);
  }

  function openEditImobiliaria(imobiliaria: ImobiliariaItem) {
    setEditingImobiliaria(imobiliaria);
    setShowImobiliariaModal(true);
  }

  async function handleRemoveImobiliaria(id: string) {
    setImobiliariaError(null);
    try {
      await removeImobiliaria(id);
    } catch (err) {
      setImobiliariaError(err instanceof ApiError ? err.message : 'Não foi possível excluir a imobiliária.');
    }
  }

  useEffect(() => {
    if (companyProfile) {
      setCompanyName(companyProfile.nome);
      setCompanyCnpj(companyProfile.cnpj);
      setCompanyCity(companyProfile.cidade);
      setDpoNome(companyProfile.dpoNome);
      setDpoEmail(companyProfile.dpoEmail);
    }
  }, [companyProfile]);

  const isDirty = !!companyProfile && (
    companyName !== companyProfile.nome ||
    companyCnpj !== companyProfile.cnpj ||
    companyCity !== companyProfile.cidade ||
    dpoNome !== companyProfile.dpoNome ||
    dpoEmail !== companyProfile.dpoEmail
  );

  async function handleSave() {
    if (!isDirty) return;
    setProfileError(null);
    setSaving(true);
    try {
      await updateCompanyProfile({ nome: companyName, cnpj: companyCnpj, cidade: companyCity, dpoNome, dpoEmail });
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
          <fieldset className="border-0 m-0 min-w-0 p-0">
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

          <div className="mt-5 pt-5 border-t" style={{ borderColor: '#e5e7eb' }}>
            <div className="flex items-center justify-between gap-2 mb-0.5">
              <p className="text-xs font-bold uppercase tracking-wide text-gray-400">Encarregado de Dados (DPO)</p>
              <button
                type="button"
                onClick={() => setShowPrivacyPolicy(true)}
                className="text-xs font-semibold underline flex-shrink-0"
                style={{ color: '#d55006' }}
              >
                Ver política de privacidade
              </button>
            </div>
            <p className="text-xs text-gray-400 mb-3">Exibido na política de privacidade como canal de contato para exercício de direitos do titular (LGPD, art. 41).</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-gray-500 block mb-1.5">Nome do Encarregado</label>
                <input
                  className="w-full text-sm px-3 py-2.5 rounded-xl border focus:outline-none transition-colors"
                  style={{ borderColor: '#e5e7eb' }}
                  onFocus={(e) => (e.target.style.borderColor = '#d55006')}
                  onBlur={(e) => (e.target.style.borderColor = '#e5e7eb')}
                  value={dpoNome}
                  onChange={(e) => setDpoNome(e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 block mb-1.5">E-mail de contato</label>
                <input
                  type="email"
                  className="w-full text-sm px-3 py-2.5 rounded-xl border focus:outline-none transition-colors"
                  style={{ borderColor: '#e5e7eb' }}
                  onFocus={(e) => (e.target.style.borderColor = '#d55006')}
                  onBlur={(e) => (e.target.style.borderColor = '#e5e7eb')}
                  placeholder="privacidade@phacz.com.br"
                  value={dpoEmail}
                  onChange={(e) => setDpoEmail(e.target.value)}
                />
              </div>
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
        />

        <SettingsCard
          icon={<Landmark size={18} style={{ color: '#d55006' }} />}
          title="Imobiliárias"
          subtitle="Gerencie as imobiliárias disponíveis para associar aos corretores"
        >
          <div className="space-y-2">
            {imobiliariasOptions.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
                style={{ backgroundColor: '#fafafa', border: '1px solid #e6e3de' }}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800 truncate">{item.nome}</p>
                  <p className="text-xs text-gray-400 truncate">{item.cnpj} · {item.cidade}</p>
                </div>
                <button
                  onClick={() => openEditImobiliaria(item)}
                  title="Editar"
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:bg-orange-50 hover:text-orange-600 transition-colors flex-shrink-0"
                >
                  <Pencil size={14} />
                </button>
                <button
                  onClick={() => handleRemoveImobiliaria(item.id)}
                  title="Excluir"
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:bg-red-50 hover:text-red-600 transition-colors flex-shrink-0"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}

            {imobiliariasOptions.length === 0 && (
              <p className="text-xs text-gray-400 py-2">Nenhuma imobiliária cadastrada ainda.</p>
            )}
          </div>

          {imobiliariaError && <p className="text-xs mt-3" style={{ color: '#dc2626' }}>{imobiliariaError}</p>}

          <div className="mt-4 pt-4 border-t" style={{ borderColor: '#e6e3de' }}>
            <button
              onClick={openNewImobiliaria}
              className="flex items-center justify-center gap-2 w-full sm:w-auto px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-colors hover:opacity-90"
              style={{ backgroundColor: '#d55006' }}
            >
              <Plus size={14} /> Adicionar imobiliária
            </button>
          </div>
        </SettingsCard>
      </div>

      {showImobiliariaModal && (
        <ImobiliariaFormModal
          imobiliaria={editingImobiliaria}
          onClose={() => setShowImobiliariaModal(false)}
        />
      )}
    </div>
  );
}
