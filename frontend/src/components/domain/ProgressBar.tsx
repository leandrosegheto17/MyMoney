import type { BudgetAlertLevel } from "../../lib/api/types";

export interface ProgressBarProps {
  label: string;
  /** Percentual gasto (pode passar de 100 em estouro) — RF-MVP-07 AC2-4. */
  pctSpent: number;
  alertLevel: BudgetAlertLevel;
  /** Texto secundário opcional (ex.: "R$ 820,00 de R$ 1.000,00"). */
  detailText?: string;
}

const LEVEL_CONFIG: Record<BudgetAlertLevel, { barClass: string; icon: string; textClass: string }> = {
  none: { barClass: "bg-primary", icon: "", textClass: "text-neutral-600" },
  warning: { barClass: "bg-warning", icon: "⚠", textClass: "text-warning" },
  exceeded: { barClass: "bg-danger", icon: "⛔", textClass: "text-danger" },
};

/**
 * ProgressBar — UX-SPEC.md Seção 3.3: "3 estados visuais (normal/alerta/estouro),
 * texto + ícone, não só cor" (RF-MVP-07 AC2-4, RN-04). Usado em S-BUD-01/S-GOAL-04.
 * WCAG (Seção 5): `role="progressbar"` com valores numéricos; ícone + texto sempre
 * junto da cor, nunca só a barra colorida sozinha comunica o estado.
 */
export function ProgressBar({ label, pctSpent, alertLevel, detailText }: ProgressBarProps) {
  const config = LEVEL_CONFIG[alertLevel];
  const roundedPct = Math.round(pctSpent);
  const clampedWidth = Math.min(100, Math.max(0, pctSpent));

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium text-neutral-800">{label}</span>
        <span className={["font-medium", config.textClass].join(" ")}>
          {config.icon && <span aria-hidden="true">{config.icon} </span>}
          {roundedPct}%{alertLevel === "exceeded" ? " do teto (estourado)" : alertLevel === "warning" ? " do teto" : ""}
        </span>
      </div>
      <div
        role="progressbar"
        aria-label={label}
        aria-valuenow={roundedPct}
        aria-valuemin={0}
        aria-valuemax={100}
        className="h-2 w-full overflow-hidden rounded-full bg-neutral-200"
      >
        <div className={["h-full rounded-full transition-all duration-200", config.barClass].join(" ")} style={{ width: `${clampedWidth}%` }} />
      </div>
      {detailText && <p className="text-xs text-neutral-500">{detailText}</p>}
    </div>
  );
}
