import { Loader2 } from 'lucide-react';

/**
 * Ocupa toda a área de conteúdo enquanto a tela busca seus dados. Só quando tudo está
 * populado a tela troca isto pelo conteúdo real — nada de grade/lista vazia piscando antes.
 */
export function ViewLoader({ label = 'Carregando informações…' }: { label?: string }) {
  return (
    <div
      className="h-full w-full flex flex-col items-center justify-center gap-4"
      style={{ backgroundColor: '#e6e3de' }}
      role="status"
      aria-live="polite"
    >
      <span
        className="w-14 h-14 rounded-2xl flex items-center justify-center"
        style={{ backgroundColor: '#fff', boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}
      >
        <Loader2 size={26} className="animate-spin" style={{ color: '#d55006' }} />
      </span>
      <p className="text-sm font-medium" style={{ color: '#6b7280' }}>{label}</p>
    </div>
  );
}
