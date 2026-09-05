import type { ReactNode } from "react";

export type BadgeTone = "neutral" | "income" | "expense" | "warning" | "danger" | "primary";

export interface BadgeProps {
  children: ReactNode;
  tone?: BadgeTone;
  /**
   * Ícone decorativo (`aria-hidden`) reforçando o significado — UX-SPEC Seção 5
   * ("Não depender só de cor"): todo Badge combina cor + texto, ícone é reforço
   * adicional opcional, nunca a única pista visual.
   */
  icon?: ReactNode;
}

/**
 * FE-RS-14 (`UX-03` Achado 1): usa exclusivamente os tokens `-soft` do design
 * system (`frontend/src/index.css`) para o fundo de cada tom — nunca a rampa
 * padrão do Tailwind (`bg-green-100`/`bg-red-100`/`bg-amber-100`/`bg-blue-100`),
 * que não é redefinida pelo bloco `@theme` e por isso não acompanhava a paleta
 * v2.0.
 */
const TONE_CLASSES: Record<BadgeTone, string> = {
  neutral: "bg-neutral-100 text-neutral-700",
  income: "bg-income-soft text-income",
  expense: "bg-expense-soft text-expense",
  warning: "bg-warning-soft text-warning",
  danger: "bg-danger-soft text-danger",
  primary: "bg-primary-soft text-primary",
};

/**
 * Badge — UX-SPEC.md Seção 3.2: pílula de status (cor + texto, nunca só cor).
 * `children` é sempre o texto de status; nunca instanciar com apenas cor/ícone.
 */
export function Badge({ children, tone = "neutral", icon }: BadgeProps) {
  return (
    <span
      className={[
        "inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium",
        TONE_CLASSES[tone],
      ].join(" ")}
    >
      {icon && (
        <span aria-hidden="true" className="shrink-0">
          {icon}
        </span>
      )}
      {children}
    </span>
  );
}
