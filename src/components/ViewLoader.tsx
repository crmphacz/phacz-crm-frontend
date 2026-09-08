/**
 * Ocupa toda a área de conteúdo enquanto a tela busca seus dados. Só quando tudo está
 * populado a tela troca isto pelo conteúdo real — nada de grade/lista vazia piscando antes.
 */
export function ViewLoader({ label = 'Carregando informações…' }: { label?: string }) {
  return (
    <div
      className="view-loader-in h-full w-full flex flex-col items-center justify-center gap-5"
      style={{ backgroundColor: '#e6e3de' }}
      role="status"
      aria-live="polite"
    >
      <svg width="44" height="44" viewBox="0 0 44 44" fill="none" className="animate-spin">
        <circle cx="22" cy="22" r="18" stroke="#d5500620" strokeWidth="4" />
        <path
          d="M22 4a18 18 0 0 1 18 18"
          stroke="#d55006"
          strokeWidth="4"
          strokeLinecap="round"
        />
      </svg>
      <div className="flex flex-col items-center gap-0.5">
        <p className="text-sm font-semibold" style={{ color: '#374151' }}>{label}</p>
        <p className="text-xs" style={{ color: '#9ca3af' }}>Só um instante…</p>
      </div>
    </div>
  );
}
