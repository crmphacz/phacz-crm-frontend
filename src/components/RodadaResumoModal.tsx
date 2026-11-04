import { X, CalendarDays, MapPin, Building2, UserRound, Package } from 'lucide-react';
import { formatDateKeyBR } from '../utils';
import type { RodadaResumo } from '../types';

/**
 * Modal de consulta para perfis sem acesso ao formulário completo da rodada (Administrativo,
 * Recepção, SDR, GV/"GRV", GE e Marketing) — mostra só o que a API retornou: dia, corretor
 * parceiro, imobiliária e cidade/UF. Orçamento, convidados, metas, riscos e parecer nunca
 * chegam aqui, porque a API não os envia para esses perfis — este componente não tem como
 * exibir o que não recebeu.
 *
 * O bloco de materiais e estrutura é a exceção, e só aparece para o Marketing, que organiza a
 * logística do evento. A condição é a PRESENÇA dos campos, não o cargo: quem decide é o
 * servidor (ver `rodadaSelectParaCargo`), e repetir a regra de cargo aqui criaria uma segunda
 * fonte de verdade — do tipo que já divergiu nesta base.
 */
export function RodadaResumoModal({ rodada, onClose }: { rodada: RodadaResumo; onClose: () => void }) {
  const temMateriais =
    rodada.materiaisComerciais !== undefined ||
    rodada.estruturaOperacao !== undefined ||
    rodada.brindesDescricao !== undefined;

  const materiais = rodada.materiaisComerciais ?? [];
  const estrutura = rodada.estruturaOperacao ?? [];
  const brindes = (rodada.brindesDescricao ?? '').trim();

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center modal-backdrop"
      style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-2 sm:mx-4 flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: '#e5e7eb' }}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: '#fff7ed' }}>
              <CalendarDays size={18} style={{ color: '#d55006' }} />
            </div>
            <h2 className="font-questrial font-bold text-base text-gray-900">Rodada</h2>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-100 transition-colors">
            <X size={16} />
          </button>
        </div>

        <div className="px-5 py-5 space-y-4">
          <InfoRow icon={<CalendarDays size={14} />} label="Dia">
            {formatDateKeyBR(rodada.dataInicio)}
            {rodada.dataInicio !== rodada.dataFim && <> a {formatDateKeyBR(rodada.dataFim)}</>}
          </InfoRow>
          <InfoRow icon={<UserRound size={14} />} label="Corretor parceiro">
            {rodada.responsavelImobiliaria || 'Não informado'}
          </InfoRow>
          <InfoRow icon={<Building2 size={14} />} label="Imobiliária">
            {rodada.imobiliaria}
          </InfoRow>
          <InfoRow icon={<MapPin size={14} />} label="Cidade/local">
            {rodada.cidade}{rodada.uf ? ` - ${rodada.uf}` : ''}
          </InfoRow>

          {temMateriais && (
            <div className="pt-3 border-t" style={{ borderColor: '#f3f4f6' }}>
              <div className="flex items-center gap-2 mb-2.5">
                <Package size={14} style={{ color: '#d55006' }} />
                <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
                  Materiais e estrutura
                </p>
              </div>

              <ListaDeItens titulo="Materiais comerciais" itens={materiais} />
              <ListaDeItens titulo="Estrutura e operação" itens={estrutura} />

              <p className="text-[11px] font-semibold text-gray-500 mt-2.5">Brindes</p>
              <p className="text-sm text-gray-800 mt-0.5">
                {brindes || <span className="text-gray-400">Nenhum brinde informado</span>}
              </p>
            </div>
          )}

          <p className="text-xs text-gray-400 pt-2 border-t" style={{ borderColor: '#f3f4f6' }}>
            Os demais detalhes desta rodada (orçamento, convidados, metas
            {temMateriais ? '' : ', materiais'}, riscos e parecer de viabilidade) não estão
            disponíveis para o seu perfil de acesso.
          </p>
        </div>
      </div>
    </div>
  );
}

/** Cada item vira um selo, como no formulário — é a mesma lista, vista por quem não edita. */
function ListaDeItens({ titulo, itens }: { titulo: string; itens: string[] }) {
  return (
    <div className="mb-2.5">
      <p className="text-[11px] font-semibold text-gray-500">{titulo}</p>
      {itens.length === 0 ? (
        <p className="text-sm text-gray-400 mt-0.5">Nada marcado</p>
      ) : (
        <div className="flex flex-wrap gap-1.5 mt-1">
          {itens.map((item) => (
            <span
              key={item}
              className="px-2 py-0.5 rounded-lg text-xs font-medium"
              style={{ backgroundColor: '#fff7ed', color: '#9a3412' }}
            >
              {item}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function InfoRow({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5" style={{ backgroundColor: '#f9fafb', color: '#d55006' }}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400">{label}</p>
        <p className="text-sm text-gray-800 mt-0.5">{children}</p>
      </div>
    </div>
  );
}
