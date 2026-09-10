import { Button } from "../base/Button";
import { EmptyState } from "../base/EmptyState";
import { ReconciliationHint } from "./ReconciliationHint";

export interface CandidateListItemView {
  /** Chave estável dentro desta resposta de `/statement-import` (índice — a lista nunca é reordenada). */
  key: string;
  date: string;
  description: string;
  amountCents: number;
  kind: "income" | "expense";
  isDuplicate: boolean;
  duplicateOfTransactionId: string | null;
}

export interface CandidateListProps {
  items: CandidateListItemView[];
  selected: ReadonlySet<string>;
  onToggle: (key: string) => void;
  onSelectAll: () => void;
  onClearSelection: () => void;
}

function formatAmount(kind: "income" | "expense", amountCents: number): string {
  const sign = kind === "income" ? "+" : "-";
  const value = (Math.abs(amountCents) / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  return `${sign}${value}`;
}

function formatDate(isoDate: string): string {
  const [year, month, day] = isoDate.split("-");
  if (!year || !month || !day) return isoDate;
  return `${day}/${month}`;
}

/**
 * `CandidateList` — `UX-SPEC.md` S-CAP-07 (`FE-F3-05`): lista selecionável de
 * candidatos vindos de `/statement-import` (ainda não persistidos, `BE-F3-03`)
 * com sinalização de possível duplicata (RF-F3-03 AC2) e seleção em lote
 * ("Selecionar todas"/"Limpar seleção"). **Puramente controlado** — quem
 * decide o estado inicial de seleção (duplicata desmarcada por padrão) e
 * quem persiste ao confirmar é `StatementImportFlow`, não este componente
 * (RNF-01/AC3: nenhuma chamada de rede acontece aqui).
 */
export function CandidateList({ items, selected, onToggle, onSelectAll, onClearSelection }: CandidateListProps) {
  if (items.length === 0) {
    return <EmptyState title="Nenhuma transação encontrada" />;
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium text-neutral-700">
          {items.length} transações encontradas · {selected.size} selecionadas
        </p>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={onSelectAll}>
            Selecionar todas
          </Button>
          <Button variant="secondary" onClick={onClearSelection}>
            Limpar seleção
          </Button>
        </div>
      </div>

      <ul className="flex flex-col divide-y divide-neutral-200 rounded-md border border-neutral-200">
        {items.map((item) => (
          <li key={item.key} className="flex flex-col gap-1 p-3">
            <label className="flex min-h-11 items-center gap-3 text-sm text-neutral-900">
              <input
                type="checkbox"
                checked={selected.has(item.key)}
                onChange={() => onToggle(item.key)}
                className="h-5 w-5 rounded border-neutral-300 text-primary focus-visible:outline-2 focus-visible:outline-primary"
              />
              {item.isDuplicate && (
                <span aria-hidden="true" className="text-warning">
                  ⚠
                </span>
              )}
              <span className="w-12 shrink-0 text-neutral-500">{formatDate(item.date)}</span>
              <span className="flex-1 truncate">{item.description || "(sem descrição)"}</span>
              <span className={item.kind === "income" ? "font-medium text-income" : "font-medium text-danger"}>
                {formatAmount(item.kind, item.amountCents)}
              </span>
            </label>
            {item.isDuplicate && item.duplicateOfTransactionId && (
              <div className="ml-8 flex items-center gap-2 text-xs text-neutral-600">
                <span>Possível duplicata de lançamento existente.</span>
                <ReconciliationHint transactionId={item.duplicateOfTransactionId} />
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
