import { Loader2 } from 'lucide-react';

/** Indicador de carregamento inline, para botões e rótulos enquanto uma requisição está em andamento. */
export function Spinner({ size = 14, className = '' }: { size?: number; className?: string }) {
  return <Loader2 size={size} className={`animate-spin flex-shrink-0 ${className}`} aria-hidden />;
}

/** Bloco centralizado de carregamento para o corpo de uma aba/painel enquanto os dados não chegaram. */
export function InlineLoader({ label = 'Carregando…' }: { label?: string }) {
  return (
    <div className="py-16 flex flex-col items-center justify-center gap-3" role="status" aria-live="polite">
      <Spinner size={28} className="text-[#d55006]" />
      <p className="text-sm text-gray-500">{label}</p>
    </div>
  );
}
