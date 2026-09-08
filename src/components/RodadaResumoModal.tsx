import { X, CalendarDays, MapPin, Building2, UserRound } from 'lucide-react';
import { formatDateKeyBR } from '../utils';
import type { RodadaResumo } from '../types';

/**
 * Modal de consulta para perfis sem acesso ao formulário completo da rodada (Administrativo,
 * Recepção, SDR, GV/"GRV", GR/"Gerente de Relacionamento") — mostra só o que a API retornou:
 * dia, corretor parceiro, imobiliária e cidade/UF. Nenhum outro campo do formulário (orçamento,
 * convidados, metas, materiais, riscos, parecer) chega até aqui, porque a API nunca os envia
 * para esses perfis (ver `RODADA_SUMMARY_SELECT` no backend) — este componente não tem como
 * exibir o que não recebeu.
 */
export function RodadaResumoModal({ rodada, onClose }: { rodada: RodadaResumo; onClose: () => void }) {
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

          <p className="text-xs text-gray-400 pt-2 border-t" style={{ borderColor: '#f3f4f6' }}>
            Os demais detalhes desta rodada (orçamento, convidados, metas, materiais, riscos e
            parecer de viabilidade) não estão disponíveis para o seu perfil de acesso.
          </p>
        </div>
      </div>
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
