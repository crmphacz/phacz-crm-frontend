import { PAISES, paisPorIso, maskTelefone, exemploTelefone } from '../lib/paises';

/**
 * Campo de telefone com país.
 *
 * O país fica à esquerda, com bandeira e DDI, e define a máscara do número ao lado. Começa no
 * Brasil, que é o caso da esmagadora maioria dos cadastros; trocar o país reformata o que já
 * foi digitado, em vez de obrigar a apagar e redigitar.
 *
 * O país pertence ao CADASTRO, não a cada campo: telefone e WhatsApp da mesma pessoa dividem a
 * seleção, então trocar num lugar vale para os dois — foi o que motivou o campo existir.
 */
interface TelefoneInputProps {
  /** Número já mascarado, do jeito que fica salvo. */
  valor: string;
  onChange: (valor: string) => void;
  /** ISO do país. Compartilhado entre os campos de telefone do mesmo cadastro. */
  pais: string;
  onPaisChange: (iso: string) => void;
  disabled?: boolean;
  /** Mostra a borda vermelha quando o formulário marcou erro neste campo. */
  erro?: boolean;
  /** Ícone decorativo à direita (telefone / WhatsApp), como nos campos atuais. */
  icone?: React.ReactNode;
  id?: string;
}

export function TelefoneInput({
  valor, onChange, pais, onPaisChange, disabled, erro, icone, id,
}: TelefoneInputProps) {
  const selecionado = paisPorIso(pais);

  function trocarPais(iso: string) {
    onPaisChange(iso);
    // Reformata o que já estava digitado para o padrão do país novo — os dígitos são os
    // mesmos, só a separação muda.
    if (valor) onChange(maskTelefone(valor, iso));
  }

  return (
    <div className="flex gap-2">
      <select
        className="form-input text-sm flex-shrink-0"
        style={{ width: 104 }}
        value={selecionado.iso}
        onChange={(e) => trocarPais(e.target.value)}
        disabled={disabled}
        title={selecionado.nome}
        aria-label="País do telefone"
      >
        {PAISES.map((p) => (
          <option key={p.iso} value={p.iso}>
            {p.bandeira} +{p.ddi}
          </option>
        ))}
      </select>

      <div className="relative flex-1 min-w-0">
        <input
          id={id}
          className={`form-input text-sm w-full ${erro ? 'border-red-400' : ''}`}
          inputMode="numeric"
          placeholder={exemploTelefone(selecionado.iso)}
          value={valor}
          disabled={disabled}
          onChange={(e) => onChange(maskTelefone(e.target.value, selecionado.iso))}
        />
        {icone && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">{icone}</span>
        )}
      </div>
    </div>
  );
}
