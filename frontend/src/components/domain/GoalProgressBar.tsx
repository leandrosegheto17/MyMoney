import { formatCentsToBRL } from "../../lib/currency";

export interface GoalProgressBarProps {
  label: string;
  currentAmountCents: number;
  targetAmountCents: number;
  /** Percentual já calculado pelo servidor (`get_goals_progress`, BE-F2-08) — nunca recalculado no client (DIR-06). */
  pctProgress: number;
  targetDate?: string | null;
}

/**
 * GoalProgressBar — UX-SPEC.md Seção 2.2/S-GOAL-04: "ProgressBar + valor atual/valor
 * alvo + prazo (se houver)". Componente próprio (não `ProgressBar` de orçamento, que é
 * tipado para os 3 níveis de alerta de RN-04/`BudgetAlertLevel`) — semântica de meta é
 * "em progresso" vs. "atingida", nunca "estourada" (superar uma meta é positivo, não um
 * erro). Cor + ícone + texto sempre juntos (WCAG, nunca só cor).
 */
export function GoalProgressBar({ label, currentAmountCents, targetAmountCents, pctProgress, targetDate }: GoalProgressBarProps) {
  const isAchieved = pctProgress >= 100;
  const roundedPct = Math.round(pctProgress);
  const clampedWidth = Math.min(100, Math.max(0, pctProgress));

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium text-neutral-800">{label}</span>
        <span className={["font-medium", isAchieved ? "text-income" : "text-primary"].join(" ")}>
          {isAchieved && <span aria-hidden="true">✓ </span>}
          {roundedPct}% {isAchieved ? "concluída" : "da meta"}
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
        <div
          className={["h-full rounded-full transition-all duration-200", isAchieved ? "bg-income" : "bg-primary"].join(" ")}
          style={{ width: `${clampedWidth}%` }}
        />
      </div>
      <p className="text-xs text-neutral-500">
        {formatCentsToBRL(currentAmountCents)} de {formatCentsToBRL(targetAmountCents)}
        {targetDate && ` · prazo ${new Date(`${targetDate}T00:00:00`).toLocaleDateString("pt-BR")}`}
      </p>
    </div>
  );
}
