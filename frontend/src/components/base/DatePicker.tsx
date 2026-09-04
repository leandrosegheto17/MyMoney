import { forwardRef, useId } from "react";
import type { InputHTMLAttributes } from "react";
import { FieldLabel, FieldMessage } from "./FieldChrome";

export interface DatePickerProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "id" | "type"> {
  label: string;
  helperText?: string;
  error?: string;
  id?: string;
}

/**
 * DatePicker — UX-SPEC.md Seção 3.2: seleção de data única.
 * Implementado sobre `<input type="date">` nativo: teclado físico funciona como via
 * primária em desktop (UX-SPEC 6.3), leitor de tela e localização de formato de data
 * já resolvidos pelo navegador — evita reimplementar um calendário customizado com
 * pior acessibilidade que o controle nativo equivalente.
 */
export const DatePicker = forwardRef<HTMLInputElement, DatePickerProps>(function DatePicker(
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
        type="date"
        id={id}
        required={required}
        aria-invalid={Boolean(error) || undefined}
        aria-describedby={error ? errorId : helperText ? helperId : undefined}
        className={[
          "min-h-11 w-full rounded-md border px-3 py-2 text-base text-neutral-900",
          "focus-visible:outline-2 focus-visible:outline-primary",
          error ? "border-danger" : "border-neutral-300",
          className,
        ].join(" ")}
        {...rest}
      />
      <FieldMessage id={error ? errorId : helperId} error={error} helperText={helperText} />
    </div>
  );
});
