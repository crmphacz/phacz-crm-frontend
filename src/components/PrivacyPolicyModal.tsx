import { X, ShieldCheck } from 'lucide-react';
import { useStore } from '../store';

/**
 * Acessível antes e depois do login (a tela de login também linka pra cá) — por isso lê
 * `companyProfile` do store com fallback, já que antes do login ele ainda não foi carregado.
 * O conteúdo descreve o tratamento de dados que o sistema realmente faz (não é texto
 * genérico de modelo): módulos, finalidades, terceiros envolvidos e prazos de retenção
 * batem com o que está implementado no backend.
 */
export function PrivacyPolicyModal({ onClose }: { onClose: () => void }) {
  const companyProfile = useStore((s) => s.companyProfile);
  const empresa = companyProfile?.nome || 'PHACZ Empreendimentos';
  const dpoNome = companyProfile?.dpoNome || '';
  const dpoEmail = companyProfile?.dpoEmail || '';

  return (
    <div
      className="fixed inset-0 z-[300] flex items-center justify-center modal-backdrop"
      style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-2 sm:mx-4 flex flex-col" style={{ maxHeight: '88vh' }}>
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 sm:py-5 border-b flex-shrink-0" style={{ borderColor: '#e5e7eb' }}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#fff7ed' }}>
              <ShieldCheck size={18} style={{ color: '#d55006' }} />
            </div>
            <div>
              <h2 className="font-questrial font-bold text-lg text-gray-900">Política de Privacidade</h2>
              <p className="text-xs text-gray-400">Tratamento de dados pessoais no {empresa} CRM</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-100 transition-colors flex-shrink-0">
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 sm:px-6 py-5 space-y-5 text-sm text-gray-700 leading-relaxed">
          <Section title="1. Quem trata os dados">
            <p>
              O {empresa} é o controlador dos dados pessoais tratados neste sistema (CRM comercial), nos termos da
              Lei Geral de Proteção de Dados (Lei 13.709/2018 — LGPD).
            </p>
          </Section>

          <Section title="2. Quais dados coletamos">
            <ul className="list-disc pl-5 space-y-1">
              <li><b>Corretores parceiros</b> (pessoas físicas de imobiliárias parceiras): nome, telefone, WhatsApp, e-mail, imobiliária.</li>
              <li><b>Clientes finais</b> (interessados num imóvel, indicados por um corretor): nome, telefone, e-mail, interesse, orçamento, observações.</li>
              <li><b>Convidados de rodadas/eventos</b>: nome e informações de contato de participantes de visitas e eventos organizados com imobiliárias.</li>
              <li><b>Funcionários que usam o sistema</b>: nome, e-mail e perfil de acesso.</li>
            </ul>
            <p className="mt-2">Não coletamos dado de categoria sensível (origem racial/étnica, religião, saúde, biometria etc.).</p>
          </Section>

          <Section title="3. Para que usamos">
            <p>Gestão do relacionamento comercial com imobiliárias parceiras e clientes interessados: organização do funil de vendas, comunicação por e-mail e WhatsApp, organização de eventos/visitas, e relatórios internos de desempenho comercial.</p>
          </Section>

          <Section title="4. Base legal">
            <p>Legítimo interesse no relacionamento comercial B2B já em curso com a imobiliária parceira, e execução de procedimentos preliminares a um possível contrato de compra e venda, quando aplicável.</p>
          </Section>

          <Section title="5. Com quem compartilhamos">
            <ul className="list-disc pl-5 space-y-1">
              <li>Provedor de e-mail (envio de comunicação transacional e campanhas).</li>
              <li>API do WhatsApp Business (envio de mensagens de acompanhamento).</li>
              <li>Assistente de IA interno (Groq): responde perguntas da equipe sobre os próprios dados do CRM, sempre restrito ao que o perfil de quem pergunta já pode ver na tela.</li>
            </ul>
            <p className="mt-2">Não vendemos nem compartilhamos dados para fins de marketing de terceiros.</p>
          </Section>

          <Section title="6. Por quanto tempo guardamos">
            <ul className="list-disc pl-5 space-y-1">
              <li>Dados de corretores e clientes: enquanto o registro estiver ativo no CRM, ou até exclusão a pedido do titular ou por decisão da empresa.</li>
              <li>Dados de funcionários desligados: o acesso é desativado imediatamente; nome e e-mail são anonimizados automaticamente após um período de retenção (hoje configurado para 730 dias de inatividade), mantendo só o necessário para preservar o histórico de negociações já registradas.</li>
              <li>Senha provisória de primeiro acesso: expira em 72 horas se não for usada.</li>
            </ul>
          </Section>

          <Section title="7. Seus direitos">
            <p>Como titular dos dados, você pode solicitar: confirmação de que tratamos seus dados, acesso a eles, correção de dado incompleto ou desatualizado, portabilidade (exportação num formato estruturado), anonimização ou eliminação, e informação sobre com quem compartilhamos seus dados. Pedidos são atendidos pela equipe através do corretor ou gerente responsável, ou diretamente pelo canal abaixo.</p>
          </Section>

          <Section title="8. Segurança">
            <p>Acesso ao sistema é restrito por perfil (cada pessoa só vê o que precisa para seu trabalho), senhas são armazenadas de forma criptografada, e sessões podem ser revogadas a qualquer momento pela administração do sistema.</p>
          </Section>

          <Section title="9. Encarregado de Proteção de Dados (DPO)">
            {dpoNome || dpoEmail ? (
              <p>
                {dpoNome && <>{dpoNome}<br /></>}
                {dpoEmail && <a href={`mailto:${dpoEmail}`} style={{ color: '#d55006' }}>{dpoEmail}</a>}
              </p>
            ) : (
              <p className="text-gray-400 italic">
                Ainda não configurado. A Diretoria pode preencher em Configurações → Perfil da Empresa.
              </p>
            )}
          </Section>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="text-xs font-bold uppercase tracking-wide text-gray-400 mb-1.5">{title}</h3>
      {children}
    </section>
  );
}
