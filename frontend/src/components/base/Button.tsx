import { forwardRef } from "react";
import type { ButtonHTMLAttributes, ReactNode } from "react";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "destructive";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  /** Estado de carregamento — desabilita o botão e expõe `aria-busy`, sem remover o rótulo do DOM. */
  loading?: boolean;
  /** Texto opcional exibido só a leitor de tela enquanto `loading` está ativo. */
  loadingLabel?: string;
  children: ReactNode;
}

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary:
    "bg-primary text-white hover:bg-primary-hover disabled:bg-neutral-300 disabled:text-neutral-500",
  secondary:
    "bg-white text-primary border border-primary hover:bg-neutral-50 disabled:border-neutral-300 disabled:text-neutral-400",
  ghost:
    "bg-transparent text-neutral-700 hover:bg-neutral-100 disabled:text-neutral-400",
  destructive:
    "bg-danger text-white hover:bg-red-800 disabled:bg-neutral-300 disabled:text-neutral-500",
};

/**
 * Button — UX-SPEC.md Seção 3.2.
 * Variantes: primária, secundária, ghost, destrutiva; estados hover/foco/disabled/loading.
 * WCAG 2.1 AA (DIR-15): foco visível herdado do anel global (index.css), alvo de toque
 * mínimo 44x44 via padding, `aria-busy`/`aria-disabled` comunicam o estado de loading
 * a tecnologia assistiva.
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "primary", loading = false, loadingLabel = "Carregando", disabled, className = "", children, ...rest },
  ref,
) {
  const isDisabled = disabled || loading;
  return (
    <button
      ref={ref}
      type={rest.type ?? "button"}
      disabled={isDisabled}
      aria-busy={loading || undefined}
      aria-disabled={isDisabled || undefined}
      className={[
        "inline-flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium",
        "transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-primary",
        "disabled:cursor-not-allowed",
        VARIANT_CLASSES[variant],
        className,
      ].join(" ")}
      {...rest}
    >
      {loading && (
        <span
          aria-hidden="true"
          className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent motion-reduce:animate-none"
        />
      )}
      <span>{children}</span>
      {loading && <span className="sr-only">{loadingLabel}</span>}
    </button>
  );
});
