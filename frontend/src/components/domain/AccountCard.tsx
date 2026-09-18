import { Badge } from "../base";
import { Card } from "../base/Card";
import { Num } from "../base/Num";

export interface AccountCardProps {
  name: string;
  /** Rótulo do tipo de conta (ex.: "Conta corrente"), exibido em --text-2 (neutral-600). */
  typeLabel: string;
  /** `Account.icon` (emoji), decorativo. Sem ícone, usa o glifo padrão. */
  icon?: string | null;
  /** `Account.color`, fundo do iconChip, se cadastrada. */
  color?: string | null;
  currentBalanceCents: number;
  isActive: boolean;
  onEdit: () => void;
  onDelete: () => void;
}

/**
 * AccountCard — UX-SPEC.md Seção 2.2 (S-ACC-01/02/04, Redesign v2.0, Padrão C).
 * Mesma família de CategoryCard/BudgetCard: iconChip + rótulo (--text-2) + nome +
 * saldo. Ações Editar/Excluir são botões irmãos (nunca aninhados).
 */
export function AccountCard({ name, typeLabel, icon, color, currentBalanceCents, isActive, onEdit, onDelete }: AccountCardProps) {
  return (
    <Card className="flex min-w-0 flex-col gap-3" data-testid="account-card">
      <div className="flex items-start gap-3">
        <span
          aria-hidden="true"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-lg"
          style={color ? { backgroundColor: color } : undefined}
        >
          {icon || "🏦"}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm text-neutral-600">{typeLabel}</p>
          <div className="flex items-center gap-2">
            <p className="truncate font-medium text-neutral-900" title={name}>
              {name}
            </p>
            {!isActive && <Badge tone="neutral">Inativa</Badge>}
          </div>
        </div>
      </div>
      <p className="text-lg font-semibold tabular-nums text-neutral-800"><Num value={currentBalanceCents} format="currency" /></p>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onEdit}
          aria-label={`Editar ${name}`}
          className="min-h-11 rounded-md px-3 text-sm font-medium text-neutral-700 hover:bg-neutral-100 focus-visible:outline-2 focus-visible:outline-primary"
        >
          Editar
        </button>
        <button
          type="button"
          onClick={onDelete}
          aria-label={`Excluir ${name}`}
          className="min-h-11 rounded-md px-3 text-sm font-medium text-neutral-700 hover:bg-neutral-100 focus-visible:outline-2 focus-visible:outline-primary"
        >
          Excluir
        </button>
      </div>
    </Card>
  );
}
