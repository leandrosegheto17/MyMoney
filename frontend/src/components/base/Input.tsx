import { forwardRef, useId } from "react";
import type { InputHTMLAttributes } from "react";
import { FieldLabel, FieldMessage } from "./FieldChrome";

export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "id"> {
  label: string;
  /** Texto de apoio exibido abaixo do campo quando não há erro. */
  helperText?: string;
  /** Mensagem de erro inline — quando presente, sobrepõe `helperText` e marca `aria-invalid`. */
  error?: string;
  id?: string;
}

/**
 * Input — UX-SPEC.md Seção 3.2: texto/número/data, label + helper text + estado de erro
 * inline. WCAG 2.1 AA (Seção 5): label associado programaticamente, erro anunciado via
 * `aria-live="polite"` + `aria-describedby` + `aria-invalid`.
 */
export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, helperText, error, className = "", required, ...rest },
  ref,
) {
  const autoId = useId();
  const id = rest.id ?? autoId;
  const helperId = `${id}-helper`;
  const errorId = `${id}-error`;

  return (
    <div className="flex flex-col gap-1">
      <FieldLabel htmlFor={id} required={required}>
        {label}
      </FieldLabel>
      <input
        ref={ref}
        id={id}
        required={required}
        aria-invalid={Boolean(error) || undefined}
        aria-describedby={error ? errorId : helperText ? helperId : undefined}
        className={[
          "min-h-11 w-full rounded-md border px-3 py-2 text-base text-neutral-900",
          "focus-visible:outline-2 focus-visible:outline-primary",
          error ? "border-danger" : "border-neutral-300",
          "disabled:bg-neutral-100 disabled:text-neutral-400",
          className,
        ].join(" ")}
        {...rest}
      />
      <FieldMessage id={error ? errorId : helperId} error={error} helperText={helperText} />
    </div>
  );
});
