export function SettingsCard({ icon, title, subtitle, action, children }: {
  icon: React.ReactNode; title: string; subtitle: string;
  /**
   * Botão principal do cartão, no canto direito do cabeçalho. Em listas longas — as
   * imobiliárias já passam de 150 — um botão no rodapé obriga a rolar o cartão inteiro só
   * para cadastrar o próximo item. No cabeçalho ele está sempre onde a lista começa.
   */
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-2xl p-6" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
      <div className="flex items-center gap-3 mb-5 pb-4 border-b" style={{ borderColor: '#e6e3de' }}>
        <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#fff7ed' }}>
          {icon}
        </div>
        <div className="min-w-0">
          <h2 className="font-bold text-gray-900" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{title}</h2>
          <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>
        </div>
        {action && <div className="ml-auto flex-shrink-0">{action}</div>}
      </div>
      {children}
    </div>
  );
}
