import { useState } from 'react';
import { Users, LayoutList, CheckSquare, ChevronDown, ChevronUp } from 'lucide-react';
import { useStore } from '../store';
import { STAGES } from '../data';
import { SettingsCard } from './SettingsCard';

const REQUIRED_FIELDS_BY_STAGE: Record<number, string[]> = {
  1: ['Nome do corretor', 'Telefone', 'Canal de origem'],
  2: ['Primeiro contato registrado (interação)'],
  3: ['Tipo de interesse', 'Status de participação no treinamento'],
  4: ['Observação de acompanhamento / motivo de nutrição'],
  5: ['Responsável GR atribuído', 'Responsável GV atribuído'],
  6: ['Registro de atividade semanal (GR)', 'Ao menos 1 cliente final cadastrado'],
  7: ['Monitoramento registrado (GV)', 'Atividade de acompanhamento'],
  8: ['Proposta formal registrada', 'Unidade e valor preenchidos'],
  9: ['Proposta aceita', 'Documentação em coleta'],
  10: ['Fechamento registrado como Ganho', 'Valor de fechamento confirmado'],
};

export function PipelineRulesView() {
  const users = useStore((s) => s.users);
  const [expandedStage, setExpandedStage] = useState<number | null>(null);

  const equipeSDR = users.filter((u) => u.cargo === 'SDR' && u.ativo).map((u) => u.nome);
  const equipeGR = users.filter((u) => u.cargo === 'GR' && u.ativo).map((u) => u.nome);
  const equipeGV = users.filter((u) => u.cargo === 'GV' && u.ativo).map((u) => u.nome);

  return (
    <div className="h-full overflow-y-auto" style={{ backgroundColor: '#e6e3de' }}>
      <div className="max-w-4xl mx-auto px-4 md:px-6 py-6 md:py-8 space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
            Regras
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Equipe comercial, etapas do pipeline e campos obrigatórios para avançar.
          </p>
        </div>

        {/* Team */}
        <SettingsCard
          icon={<Users size={18} style={{ color: '#d55006' }} />}
          title="Equipe Comercial"
          subtitle="Membros ativos por função no pipeline"
        >
          <div className="space-y-4">
            <TeamSection
              role="SDR — Qualificação"
              color="#64748b"
              members={equipeSDR}
              description="Responsáveis pelas etapas 1–5: primeiro contato, qualificação, nutrição e distribuição"
            />
            <TeamSection
              role="GR — Gerente de Relacionamento"
              color="#0d9488"
              members={equipeGR}
              description="Responsáveis pela etapa 6: relacionamento ativo, vínculo emocional e acompanhamento de longo prazo"
            />
            <TeamSection
              role="GV — Gerente de Vendas"
              color="#d55006"
              members={equipeGV}
              description="Responsáveis pelas etapas 7–9: monitoramento, proposta, negociação e fechamento"
            />
          </div>
        </SettingsCard>

        {/* Pipeline stages */}
        <SettingsCard
          icon={<LayoutList size={18} style={{ color: '#d55006' }} />}
          title="Etapas do Pipeline"
          subtitle="10 etapas com SLA monitorado — clique em uma etapa para ver os detalhes"
        >
          <div className="space-y-1">
            {STAGES.map((stage) => (
              <div key={stage.id}>
                <button
                  className="w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all hover:bg-gray-50"
                  onClick={() => setExpandedStage(expandedStage === stage.id ? null : stage.id)}
                >
                  <div
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                    style={{ backgroundColor: stage.cor, fontFamily: 'Plus Jakarta Sans, sans-serif' }}
                  >
                    {stage.id}
                  </div>
                  <div className="flex-1 min-w-0 text-left">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-gray-800" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
                        {stage.nome}
                      </span>
                      {stage.paralelo && (
                        <span className="text-xs px-2 py-0.5 rounded-full font-bold" style={{ backgroundColor: '#f0fdfa', color: '#0d9488' }}>
                          Paralelo
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 truncate">{stage.descricao}</p>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <div className="text-right">
                      <div className="text-xs font-bold text-gray-700">SLA: {stage.slaLabel}</div>
                      <div className="text-xs text-gray-400">{stage.responsavel.join(' + ')}</div>
                    </div>
                    {expandedStage === stage.id ? (
                      <ChevronUp size={16} className="text-gray-400" />
                    ) : (
                      <ChevronDown size={16} className="text-gray-400" />
                    )}
                  </div>
                </button>

                {expandedStage === stage.id && (
                  <div className="mx-3 mb-2 p-4 rounded-xl" style={{ backgroundColor: stage.corBg }}>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: stage.cor }}>
                          Campos obrigatórios
                        </p>
                        <ul className="space-y-1">
                          {(REQUIRED_FIELDS_BY_STAGE[stage.id] ?? []).map((f) => (
                            <li key={f} className="flex items-center gap-2 text-xs text-gray-700">
                              <CheckSquare size={11} style={{ color: stage.cor }} className="flex-shrink-0" />
                              {f}
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: stage.cor }}>
                          Detalhes
                        </p>
                        <div className="space-y-1.5 text-xs text-gray-600">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold">SLA:</span> {stage.slaLabel}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold">Equipe:</span> {stage.responsavel.join(', ')}
                          </div>
                          {stage.paralelo && (
                            <div className="mt-2 px-2 py-1.5 rounded-lg font-medium" style={{ backgroundColor: '#ccfbf1', color: '#0d9488' }}>
                              ⚡ Executada em paralelo com etapa {stage.id === 6 ? 7 : 6}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </SettingsCard>

        {/* Required fields table summary */}
        <SettingsCard
          icon={<CheckSquare size={18} style={{ color: '#d55006' }} />}
          title="Regras de Avanço"
          subtitle="Alinhado ao documento de parametrização do pipeline"
        >
          <div className="space-y-3">
            <div className="p-4 rounded-xl" style={{ backgroundColor: '#fafafa', border: '1px solid #e5e7eb' }}>
              <h4 className="text-sm font-bold text-gray-800 mb-3" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
                Regras de negócio do pipeline
              </h4>
              <div className="space-y-2">
                {[
                  { etapas: '1→2', regra: 'Corretor identificado com telefone e canal de origem preenchidos' },
                  { etapas: '2→3', regra: 'Primeiro contato realizado (ligação, WhatsApp ou visita registrada)' },
                  { etapas: '3→4', regra: 'Tipo de interesse definido e status de treinamento confirmado' },
                  { etapas: '4→5', regra: 'Corretor retomado após nutrição, pronto para distribuição' },
                  { etapas: '5→6/7', regra: 'GR e GV atribuídos simultaneamente; ao menos 1 cliente final cadastrado' },
                  { etapas: '6/7→8', regra: '"Gerar Negócio" acionado — cria card individual por cliente final' },
                  { etapas: '8→9', regra: 'Proposta formal registrada e apresentada ao cliente' },
                  { etapas: '9→10', regra: 'Proposta aceita, documentação em coleta — marcar como Ganho' },
                ].map(({ etapas, regra }) => (
                  <div key={etapas} className="flex items-start gap-3 py-2 border-b last:border-0" style={{ borderColor: '#e6e3de' }}>
                    <span className="text-xs font-bold px-2 py-1 rounded-lg flex-shrink-0" style={{ backgroundColor: '#fff7ed', color: '#d55006' }}>
                      {etapas}
                    </span>
                    <span className="text-xs text-gray-600">{regra}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </SettingsCard>
      </div>
    </div>
  );
}

function TeamSection({ role, color, members, description }: {
  role: string; color: string; members: string[]; description: string;
}) {
  return (
    <div className="p-4 rounded-xl border" style={{ borderColor: '#e6e3de', backgroundColor: '#fafafa' }}>
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-xl flex items-center justify-center text-white text-xs font-bold flex-shrink-0" style={{ backgroundColor: color, fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
          {role.split(' ')[0][0]}
        </div>
        <div className="flex-1">
          <p className="text-sm font-bold text-gray-800" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{role}</p>
          <p className="text-xs text-gray-400 mt-0.5 mb-3">{description}</p>
          <div className="flex flex-wrap gap-2">
            {members.map((m) => (
              <div key={m} className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold" style={{ backgroundColor: `${color}15`, color }}>
                <div className="w-5 h-5 rounded-full flex items-center justify-center text-white text-xs" style={{ backgroundColor: color, fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: '10px' }}>
                  {m.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)}
                </div>
                {m}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
