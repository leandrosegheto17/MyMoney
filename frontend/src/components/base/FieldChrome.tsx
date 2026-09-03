import type { ReactNode } from "react";

export interface FieldLabelProps {
  htmlFor: string;
  required?: boolean;
  children: ReactNode;
}

/**
 * Rótulo padrão de campo de formulário — label associado programaticamente + marcador
 * visual (não só textual para leitor de tela, que já anuncia `required` via o atributo
 * HTML no controle) de campo obrigatório. Compartilhado por `Input`, `Select`,
 * `DatePicker`, `CurrencyInput` e `CategoryPicker` (UX-SPEC.md Seção 3.2/3.3) para
 * manter o markup e o comportamento idênticos entre os campos.
 */
export function FieldLabel({ htmlFor, required, children }: FieldLabelProps) {
  return (
    <label htmlFor={htmlFor} className="text-sm font-medium text-neutral-700">
      {children}
      {required && (
        <span aria-hidden="true" className="text-danger">
          {" "}
          *
        </span>
      )}
    </label>
  );
}

export interface FieldMessageProps {
  id: string;
  error?: string;
  helperText?: string;
  className?: string;
}

/**
 * Mensagem de apoio/erro padrão de campo — WCAG 2.1 AA (UX-SPEC.md Seção 5): erro
 * anunciado via região `role="status"` (`aria-live="polite"` implícito, não
 * `role="alert"`/assertivo — a validação inline não deve interromper o que o leitor de
 * tela já está lendo). Renderiza o erro quando presente, senão o texto de apoio, senão
 * nada.
 */
export function FieldMessage({ id, error, helperText, className = "" }: FieldMessageProps) {
  if (error) {
    return (
      <p id={id} role="status" aria-live="polite" className={["text-sm text-danger", className].join(" ")}>
        {error}
      </p>
    );
  }
  if (helperText) {
    return (
      <p id={id} className={["text-sm text-neutral-500", className].join(" ")}>
        {helperText}
      </p>
    );
  }
  return null;
}
