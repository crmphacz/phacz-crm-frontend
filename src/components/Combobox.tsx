import { useEffect, useMemo, useRef, useState } from 'react';

export interface ComboboxOption {
  id: string;
  label: string;
  sublabel?: string;
}

interface ComboboxProps {
  value: string;
  onChange: (text: string) => void;
  onSelect?: (option: ComboboxOption) => void;
  options: ComboboxOption[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

/** Campo de texto com sugestões filtradas conforme o usuário digita (autocomplete). */
export function Combobox({ value, onChange, onSelect, options, placeholder, disabled, className }: ComboboxProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    if (!value) return options;
    const q = value.toLowerCase();
    return options.filter((o) => o.label.toLowerCase().includes(q) || o.sublabel?.toLowerCase().includes(q));
  }, [options, value]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={containerRef}>
      <input
        className={className ?? 'form-input'}
        placeholder={placeholder}
        value={value}
        disabled={disabled}
        onChange={(e) => { onChange(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
      />
      {open && filtered.length > 0 && (
        <div
          className="absolute z-20 mt-1 w-full bg-white border rounded-xl shadow-lg overflow-y-auto"
          style={{ borderColor: '#e5e7eb', maxHeight: 200 }}
        >
          {filtered.map((o) => (
            <button
              key={o.id}
              type="button"
              onClick={() => { onSelect?.(o); onChange(o.label); setOpen(false); }}
              className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 transition-colors border-b last:border-b-0"
              style={{ borderColor: '#f3f4f6' }}
            >
              <div className="font-medium text-gray-800">{o.label}</div>
              {o.sublabel && <div className="text-xs text-gray-400">{o.sublabel}</div>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
