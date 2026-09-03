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

const TONE_CLASSES: Record<BadgeTone, string> = {
  neutral: "bg-neutral-100 text-neutral-700",
  income: "bg-green-100 text-income",
  expense: "bg-red-100 text-expense",
  warning: "bg-amber-100 text-warning",
  danger: "bg-red-100 text-danger",
  primary: "bg-blue-100 text-primary",
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
