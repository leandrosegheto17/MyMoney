import { useId } from "react";
import type { CSSProperties } from "react";
import { Card } from "../base/Card";
import { ProgressBar } from "./ProgressBar";
import { formatCentsToBRL } from "../../lib/currency";
import type { BudgetAlertLevel } from "../../lib/api/types";

export interface BudgetCardProps {
  categoryName: string;
  /** Gasto no mês corrente da categoria (mesmo cálculo de `get_budget_status`, RF-MVP-07). */
  spentCents: number;
  /** Teto definido para a categoria neste mês. */
  limitCents: number;
  /** Percentual consumido (pode passar de 100 em estouro), já calculado pelo backend. */
  pctSpent: number;
  alertLevel: BudgetAlertLevel;
  /** Única ação do card — clique abre `S-BUD-02` para editar o teto (critério literal de `FE-REF-07`, inalterado). */
  onEdit: () => void;
}

/**
 * Destaque visual adicional no card inteiro em alerta/estouro (não só na barra
 * interna) — UX-SPEC.md Seção 2.2 (bloco "S-BUD-01 revisado"), RF-REF-06 AC3:
 * "perceptível ao passar o olho pela grade inteira". Aplicado via `style` inline
 * (não classe Tailwind) porque `Card` já define `bg-surface` na mesma div — duas
 * classes utilitárias de `background-color` no mesmo elemento têm precedência
 * decidida pela ordem de geração do Tailwind, não pela ordem no atributo `class`;
 * `style` inline tem precedência determinística sobre qualquer classe.
 * `--color-danger-soft` (`index.css`, novo — achado 3 de qualidade 2026-09-04)
 * pré-calcula o equivalente sólido de `--color-danger` a 10% de opacidade sobre
 * `color.surface`, mesma convenção `-soft` já usada por `primary`/`income`/
 * `expense`/`warning`.
 */
const SEVERITY_CARD_STYLE: Partial<Record<BudgetAlertLevel, CSSProperties>> = {
  warning: { backgroundColor: "var(--color-warning-soft)", borderColor: "var(--color-warning)" },
  exceeded: { backgroundColor: "var(--color-danger-soft)", borderColor: "var(--color-danger)" },
};

/**
 * Cor do texto secundário do `ProgressBar` (`detailText`) dentro do card — achado
 * de qualidade 2026-09-04 (WCAG): `text-neutral-500` (padrão do `ProgressBar`) foi
 * calibrado para ≥4.5:1 só sobre `color.surface` (branco); o destaque de
 * severidade acima muda o fundo do card, derrubando o contraste para < 4.5:1
 * (medido: 4.27:1 sobre `warning-soft`, 4.01:1 sobre `danger-soft`, ambos FAIL).
 * `text-neutral-600` recalibra para 6.81:1/6.39:1 (PASS) nesses dois fundos;
 * sobre `color.surface` (estado `none`) o padrão do próprio `ProgressBar`
 * (`text-neutral-500`, já validado) é mantido sem alteração.
 */
const DETAIL_TEXT_CLASS: Record<BudgetAlertLevel, string> = {
  none: "text-neutral-500",
  warning: "text-neutral-600",
  exceeded: "text-neutral-600",
};

/**
 * BudgetCard — UX-SPEC.md Seção 2.1 (Padrão C) e Seção 2.2 (bloco "S-BUD-01
 * revisado", RF-REF-06). Estruturalmente inspirado no `CategoryCard` (contêiner
 * `Card` não-interativo + clicável primário com `aria-label` descritivo e
 * `aria-describedby` apontando para o conteúdo visível, Seção 5) — mas, diferente
 * do `CategoryCard`, este card não tem ação secundária própria (critério literal:
 * "clique abre S-BUD-02 para editar o teto", nenhuma outra ação no card), então
 * não há risco de aninhar elemento interativo dentro de outro: o card inteiro é um
 * único `<button>` cobrindo todo o conteúdo visível.
 */
export function BudgetCard({ categoryName, spentCents, limitCents, pctSpent, alertLevel, onEdit }: BudgetCardProps) {
  const detailId = useId();
  const severityStyle = SEVERITY_CARD_STYLE[alertLevel];
  const severityBorderClass = severityStyle ? "border-2" : "";

  return (
    <Card
      className={["min-w-0", severityBorderClass].filter(Boolean).join(" ")}
      style={severityStyle}
      data-severity={alertLevel}
    >
      <button
        type="button"
        onClick={onEdit}
        aria-label={`Editar orçamento de ${categoryName}`}
        aria-describedby={detailId}
        className="flex w-full min-w-0 flex-col gap-2 rounded-md text-left focus-visible:outline-2 focus-visible:outline-primary"
      >
        <div id={detailId} className="min-w-0">
          <ProgressBar
            label={categoryName}
            pctSpent={pctSpent}
            alertLevel={alertLevel}
            detailText={`${formatCentsToBRL(spentCents)} de ${formatCentsToBRL(limitCents)}`}
            detailTextClassName={DETAIL_TEXT_CLASS[alertLevel]}
          />
        </div>
      </button>
    </Card>
  );
}
