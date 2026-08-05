import { Building2, Users, Link } from 'lucide-react';
import type { Corretor } from '../types';
import type { StageConfig } from '../types';
import { TEMPERATURA_CONFIG, getSlaStatus, getSlaLabel, getInitials } from '../utils';
import { useStore } from '../store';

interface Props {
  corretor: Corretor;
  stage: StageConfig;
}

export function CorretorCard({ corretor, stage }: Props) {
  const setSelectedCorretor = useStore((s) => s.setSelectedCorretor);
  const slaStatus = getSlaStatus(corretor, stage);
  const slaLabel = getSlaLabel(corretor, stage);
  const tempConfig = TEMPERATURA_CONFIG[corretor.temperatura];

  const slaColors = {
    ok: { bg: '#dcfce7', text: '#166534' },
    warning: { bg: '#fef9c3', text: '#854d0e' },
    exceeded: { bg: '#fee2e2', text: '#b91c1c' },
    none: { bg: '#f1f5f9', text: '#475569' },
  };

  const isNegocio = Boolean(corretor.parentCorretorId);
  const displayName = isNegocio && corretor.clienteFinalNome ? corretor.clienteFinalNome : corretor.nomeCorretor;
  const subtitle = isNegocio
    ? `via ${corretor.nomeCorretor} · ${corretor.imobiliaria}`
    : corretor.imobiliaria || '—';

  return (
    <div
      className="corretor-card bg-white rounded-xl cursor-pointer select-none"
      style={{
        boxShadow: '0 1px 4px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.04)',
        borderLeft: `3px solid ${stage.cor}`,
      }}
      onClick={() => setSelectedCorretor(corretor.id)}
    >
      <div className="p-3">
        {/* Top row */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              {isNegocio && (
                <span title="Negócio gerado">
                  <Link size={12} style={{ color: stage.cor }} className="flex-shrink-0" />
                </span>
              )}
              <span
                className="text-sm font-semibold truncate font-questrial block"
                style={{ color: '#1e1e1e' }}
                title={displayName}
              >
                {displayName}
              </span>
            </div>
            <div className="text-xs mt-0.5 truncate flex items-center gap-1" style={{ color: '#6b7280' }}>
              <Building2 size={11} className="flex-shrink-0" />
              {subtitle}
            </div>
          </div>

          {/* Temperature badge */}
          <span
            className="text-xs px-2 py-0.5 rounded-full font-semibold flex-shrink-0"
            style={{ backgroundColor: tempConfig.bg, color: tempConfig.text }}
          >
            {tempConfig.label}
          </span>
        </div>

        {/* Bottom row */}
        <div className="flex items-center justify-between mt-2 pt-2 border-t" style={{ borderColor: '#f1f5f9' }}>
          {/* Left: clientes */}
          <div className="flex items-center gap-3">
            {!isNegocio && corretor.clientesFinais.length > 0 && (
              <div className="flex items-center gap-1 text-xs" style={{ color: '#6b7280' }}>
                <Users size={11} />
                <span>{corretor.clientesFinais.length} cliente{corretor.clientesFinais.length > 1 ? 's' : ''}</span>
              </div>
            )}
          </div>

          {/* Right: SLA + team */}
          <div className="flex items-center gap-2">
            {slaLabel && slaStatus !== 'none' && (
              <span
                className={`text-xs px-1.5 py-0.5 rounded font-medium ${slaStatus === 'exceeded' ? 'sla-exceeded' : ''}`}
                style={{ backgroundColor: slaColors[slaStatus].bg, color: slaColors[slaStatus].text }}
              >
                {slaLabel}
              </span>
            )}

            {/* Team initials */}
            <div className="flex items-center -space-x-1">
              {corretor.responsavelSDR && (
                <TeamAvatar name={corretor.responsavelSDR} color="#64748b" title={`SDR: ${corretor.responsavelSDR}`} />
              )}
              {corretor.responsavelGR && (
                <TeamAvatar name={corretor.responsavelGR} color="#0d9488" title={`GR: ${corretor.responsavelGR}`} />
              )}
              {corretor.responsavelGV && (
                <TeamAvatar name={corretor.responsavelGV} color="#d55006" title={`GV: ${corretor.responsavelGV}`} />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function TeamAvatar({ name, color, title }: { name: string; color: string; title: string }) {
  return (
    <div
      className="w-5 h-5 rounded-full flex items-center justify-center text-white text-xs font-bold ring-2 ring-white flex-shrink-0"
      style={{ backgroundColor: color, fontSize: '9px' }}
      title={title}
    >
      {getInitials(name)}
    </div>
  );
}
