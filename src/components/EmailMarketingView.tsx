import { useEffect, useState } from 'react';
import { Plus, Mail, Send, Copy, Trash2, Eye, Users, Filter, Tag, Sparkles } from 'lucide-react';
import { useStore } from '../store';
import { useViewReady } from '../navLoading';
import { STAGES } from '../data';
import { formatRelativeTime } from '../utils';
import { canWriteEmailMarketing } from '../permissions';
import type { EmailTemplate, EmailCampaign } from '../types';
import { EmailBuilder } from './EmailBuilder';
import { EmailSendModal } from './EmailSendModal';
import { EmailPreviewModal } from './EmailPreviewModal';

type Tab = 'campanhas' | 'modelos';

export function EmailMarketingView() {
  const currentUser = useStore((s) => s.currentUser);
  const canWrite = canWriteEmailMarketing(currentUser);
  const templates = useStore((s) => s.emailTemplates);
  const campaigns = useStore((s) => s.emailCampaigns);
  const deleteEmailTemplate = useStore((s) => s.deleteEmailTemplate);
  const duplicateEmailTemplate = useStore((s) => s.duplicateEmailTemplate);
  const deleteEmailCampaign = useStore((s) => s.deleteEmailCampaign);
  const ensureEmailMarketingLoaded = useStore((s) => s.ensureEmailMarketingLoaded);

  const [ready, setReady] = useState(false);
  useViewReady(ready);
  useEffect(() => {
    ensureEmailMarketingLoaded().catch(() => undefined).finally(() => setReady(true));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [tab, setTab] = useState<Tab>('campanhas');
  const [builderTemplate, setBuilderTemplate] = useState<EmailTemplate | null | undefined>(undefined);
  const [sendTarget, setSendTarget] = useState<EmailTemplate | null>(null);
  const [previewTarget, setPreviewTarget] = useState<EmailTemplate | EmailCampaign | null>(null);

  const sortedTemplates = [...templates].sort((a, b) => b.atualizadoEm.localeCompare(a.atualizadoEm));
  const sortedCampaigns = [...campaigns].sort((a, b) => b.enviadoEm.localeCompare(a.enviadoEm));
  const totalRecipients = campaigns.reduce((acc, c) => acc + c.destinatarios.length, 0);

  function openNewEmail() {
    setBuilderTemplate(null);
  }

  return (
    <div className="h-full overflow-y-auto" style={{ backgroundColor: '#e6e3de' }}>
      <div className="max-w-6xl mx-auto px-4 md:px-6 py-6 md:py-8 space-y-6">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
              Email Marketing
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Monte e-mails com um editor visual de arrastar e soltar e envie para corretores e clientes.
            </p>
          </div>
          {canWrite && (
            <button
              onClick={openNewEmail}
              className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white rounded-xl hover:opacity-90 transition-colors flex-shrink-0"
              style={{ backgroundColor: '#d55006' }}
            >
              <Plus size={16} /> Novo Email
            </button>
          )}
        </div>

        {/* Stat chips */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard icon={<Mail size={17} />} label="Modelos criados" value={templates.length} />
          <StatCard icon={<Send size={17} />} label="Campanhas enviadas" value={campaigns.length} />
          <StatCard icon={<Users size={17} />} label="Destinatários alcançados" value={totalRecipients} />
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-2xl border" style={{ borderColor: '#e5e7eb' }}>
          <div className="flex border-b" style={{ borderColor: '#e5e7eb' }}>
            <TabButton active={tab === 'campanhas'} onClick={() => setTab('campanhas')} label="Campanhas" count={campaigns.length} />
            <TabButton active={tab === 'modelos'} onClick={() => setTab('modelos')} label="Modelos" count={templates.length} />
          </div>

          <div className="p-4 md:p-6">
            {tab === 'campanhas' &&
              (sortedCampaigns.length === 0 ? (
                <EmptyState
                  icon={<Send size={22} />}
                  title="Nenhuma campanha enviada ainda"
                  subtitle="Crie um modelo de e-mail e envie para seus contatos."
                  ctaLabel="Criar meu primeiro e-mail"
                  onCta={canWrite ? openNewEmail : undefined}
                />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm min-w-[560px]">
                    <thead>
                      <tr style={{ borderBottom: '2px solid #e6e3de' }}>
                        <Th>Campanha</Th>
                        <Th>Destinatários</Th>
                        <Th>Enviado</Th>
                        <Th className="text-right">Ações</Th>
                      </tr>
                    </thead>
                    <tbody className="divide-y" style={{ borderColor: '#e6e3de' }}>
                      {sortedCampaigns.map((c) => (
                        <CampaignRow
                          key={c.id}
                          campaign={c}
                          readOnly={!canWrite}
                          onPreview={() => setPreviewTarget(c)}
                          onDelete={() => deleteEmailCampaign(c.id)}
                        />
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}

            {tab === 'modelos' &&
              (sortedTemplates.length === 0 ? (
                <EmptyState
                  icon={<Mail size={22} />}
                  title="Nenhum modelo ainda"
                  subtitle="Monte seu primeiro e-mail com o editor visual de arrastar e soltar."
                  ctaLabel="Criar meu primeiro e-mail"
                  onCta={canWrite ? openNewEmail : undefined}
                />
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {sortedTemplates.map((t) => (
                    <TemplateCard
                      key={t.id}
                      template={t}
                      readOnly={!canWrite}
                      onEdit={() => setBuilderTemplate(t)}
                      onPreview={() => setPreviewTarget(t)}
                      onSend={() => setSendTarget(t)}
                      onDuplicate={() => duplicateEmailTemplate(t.id)}
                      onDelete={() => deleteEmailTemplate(t.id)}
                    />
                  ))}
                </div>
              ))}
          </div>
        </div>
      </div>

      {builderTemplate !== undefined && (
        <EmailBuilder
          initialTemplate={builderTemplate}
          onClose={() => setBuilderTemplate(undefined)}
          onSaved={() => {
            setBuilderTemplate(undefined);
            setTab('modelos');
          }}
          onRequestSend={(tpl) => {
            setBuilderTemplate(undefined);
            setSendTarget(tpl);
          }}
        />
      )}

      {sendTarget && (
        <EmailSendModal
          template={sendTarget}
          onClose={() => setSendTarget(null)}
          onSent={() => {
            setSendTarget(null);
            setTab('campanhas');
          }}
        />
      )}

      {previewTarget && (
        <EmailPreviewModal
          assunto={previewTarget.assunto}
          preheader={previewTarget.preheader}
          blocks={previewTarget.blocks}
          onClose={() => setPreviewTarget(null)}
        />
      )}
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="bg-white rounded-2xl p-5 flex items-center gap-4" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
      <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#fff7ed', color: '#d55006' }}>
        {icon}
      </div>
      <div>
        <div className="text-2xl font-bold text-gray-900" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{value}</div>
        <div className="text-xs text-gray-500">{label}</div>
      </div>
    </div>
  );
}

function TabButton({ active, onClick, label, count }: { active: boolean; onClick: () => void; label: string; count: number }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 px-5 py-3.5 text-sm font-semibold border-b-2 transition-all"
      style={{ borderColor: active ? '#d55006' : 'transparent', color: active ? '#d55006' : '#6b7280' }}
    >
      {label}
      <span
        className="text-xs px-1.5 py-0.5 rounded-full font-bold"
        style={{ backgroundColor: active ? '#fff7ed' : '#f1f5f9', color: active ? '#d55006' : '#9ca3af' }}
      >
        {count}
      </span>
    </button>
  );
}

function Th({ children, className }: { children: React.ReactNode; className?: string }) {
  return <th className={`text-left text-xs font-bold text-gray-400 uppercase tracking-wider pb-3 ${className ?? ''}`}>{children}</th>;
}

function EmptyState({ icon, title, subtitle, ctaLabel, onCta }: {
  icon: React.ReactNode; title: string; subtitle: string; ctaLabel: string; onCta?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-14 gap-3">
      <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ backgroundColor: '#fff7ed', color: '#d55006' }}>
        {icon}
      </div>
      <p className="text-sm font-semibold text-gray-700">{title}</p>
      <p className="text-xs text-gray-400 max-w-xs">{subtitle}</p>
      {onCta && (
        <button
          onClick={onCta}
          className="mt-2 flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white rounded-xl hover:opacity-90 transition-colors"
          style={{ backgroundColor: '#d55006' }}
        >
          <Sparkles size={14} /> {ctaLabel}
        </button>
      )}
    </div>
  );
}

function IconBtn({ icon, title, onClick, danger }: { icon: React.ReactNode; title: string; onClick: () => void; danger?: boolean }) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
        danger ? 'text-gray-400 hover:text-red-500 hover:bg-red-50' : 'text-gray-400 hover:text-gray-700 hover:bg-gray-100'
      }`}
    >
      {icon}
    </button>
  );
}

function DestinatarioBadge({ campaign }: { campaign: EmailCampaign }) {
  if (campaign.destinatarioTipo === 'individual') {
    return <BadgePill icon={<Users size={11} />} label="Corretores específicos" />;
  }
  if (campaign.destinatarioTipo === 'funil') {
    const stage = STAGES.find((s) => s.id === campaign.etapaAlvo);
    return <BadgePill icon={<Filter size={11} />} label={stage ? `Funil: ${stage.nomeAbrev}` : 'Funil'} />;
  }
  return <BadgePill icon={<Tag size={11} />} label={campaign.empreendimentoAlvo ? `Qualificação: ${campaign.empreendimentoAlvo}` : 'Qualificação'} />;
}

function BadgePill({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-semibold" style={{ backgroundColor: '#f1f5f9', color: '#475569' }}>
      {icon}
      {label}
    </span>
  );
}

function CampaignRow({ campaign, readOnly, onPreview, onDelete }: {
  campaign: EmailCampaign; readOnly?: boolean; onPreview: () => void; onDelete: () => void;
}) {
  return (
    <tr>
      <td className="py-3 pr-4">
        <p className="font-semibold text-gray-900 font-questrial">{campaign.nome}</p>
        <p className="text-xs text-gray-400 truncate max-w-xs">{campaign.assunto}</p>
      </td>
      <td className="py-3 pr-4">
        <div className="flex flex-col gap-1 items-start">
          <DestinatarioBadge campaign={campaign} />
          <span className="text-xs text-gray-400">
            {campaign.destinatarios.length} destinatário{campaign.destinatarios.length !== 1 ? 's' : ''}
          </span>
        </div>
      </td>
      <td className="py-3 pr-4 text-xs text-gray-400">{formatRelativeTime(campaign.enviadoEm)}</td>
      <td className="py-3 text-right">
        <div className="flex items-center justify-end gap-1">
          <IconBtn icon={<Eye size={14} />} title="Ver e-mail" onClick={onPreview} />
          {!readOnly && <IconBtn icon={<Trash2 size={14} />} title="Remover do histórico" onClick={onDelete} danger />}
        </div>
      </td>
    </tr>
  );
}

function TemplateCard({ template, readOnly, onEdit, onPreview, onSend, onDuplicate, onDelete }: {
  template: EmailTemplate;
  readOnly?: boolean;
  onEdit: () => void;
  onPreview: () => void;
  onSend: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="rounded-xl border overflow-hidden flex flex-col" style={{ borderColor: '#e5e7eb' }}>
      <button onClick={readOnly ? onPreview : onEdit} className="text-left p-4 hover:bg-gray-50 transition-colors flex-1">
        <div className="w-9 h-9 rounded-lg flex items-center justify-center mb-3" style={{ backgroundColor: '#fff7ed' }}>
          <Mail size={16} style={{ color: '#d55006' }} />
        </div>
        <p className="font-semibold text-gray-900 text-sm font-questrial truncate">{template.nome}</p>
        <p className="text-xs text-gray-400 mt-0.5 truncate">{template.assunto || 'Sem assunto'}</p>
        <p className="text-xs text-gray-300 mt-2">Atualizado {formatRelativeTime(template.atualizadoEm)}</p>
      </button>
      <div className="flex items-center justify-between px-3 py-2 border-t" style={{ borderColor: '#f3f4f6', backgroundColor: '#fafafa' }}>
        <div className="flex items-center gap-0.5">
          <IconBtn icon={<Eye size={13} />} title="Pré-visualizar" onClick={onPreview} />
          {!readOnly && <IconBtn icon={<Copy size={13} />} title="Duplicar" onClick={onDuplicate} />}
          {!readOnly && <IconBtn icon={<Trash2 size={13} />} title="Excluir" onClick={onDelete} danger />}
        </div>
        {!readOnly && (
          <button
            onClick={onSend}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-white hover:opacity-90 transition-colors"
            style={{ backgroundColor: '#d55006' }}
          >
            <Send size={12} /> Enviar
          </button>
        )}
      </div>
    </div>
  );
}
