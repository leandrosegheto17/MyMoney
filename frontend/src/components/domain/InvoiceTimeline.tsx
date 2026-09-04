import { Badge } from "../base/Badge";
import { Tabs } from "../base/Tabs";
import { formatCentsToBRL } from "../../lib/currency";
import type { Invoice, Transaction } from "../../lib/api/types";

export interface InvoiceTimelineProps {
  /** Faturas do cartão — a lista real pode conter mais (fatura antiga), mas DIR-13 exige exibir só atual + 2 futuras. */
  invoices: Invoice[];
  /** Todos os lançamentos do usuário que têm `card_invoice_id` — o componente filtra por fatura. */
  transactions: Transaction[];
  categoryNameById: Record<string, string>;
}

const MONTH_FORMATTER = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" });

function competenciaLabel(competencia: string): string {
  const [year, month] = competencia.split("-").map(Number);
  const label = MONTH_FORMATTER.format(new Date(year, month - 1, 1));
  return label.charAt(0).toUpperCase() + label.slice(1);
}

/**
 * InvoiceTimeline — UX-SPEC.md S-CARD-03: 3 abas fixas (atual + 2 futuras, DIR-13, "sem
 * paginação adicional"), total + badge Aberta/Fechada por aba (RF-F2-05 AC3), lista de
 * lançamentos daquela competência. `status` de cada fatura vem direto de `Invoice`
 * (nunca recalculado no client — só o backend, via `close_due_invoices`, decide isso).
 */
export function InvoiceTimeline({ invoices, transactions, categoryNameById }: InvoiceTimelineProps) {
  const currentCompetencia = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}-01`;
  const horizon = invoices
    .filter((invoice) => invoice.competencia >= currentCompetencia)
    .sort((a, b) => a.competencia.localeCompare(b.competencia))
    .slice(0, 3);

  if (horizon.length === 0) {
    return <p className="text-sm text-neutral-500">Nenhuma fatura projetada ainda para este cartão.</p>;
  }

  const tabs = horizon.map((invoice, index) => {
    const invoiceTransactions = transactions.filter((t) => t.card_invoice_id === invoice.id);
    const totalCents = invoiceTransactions.reduce((sum, t) => sum + t.amount_cents, 0);
    return {
      id: invoice.id,
      label: index === 0 ? "Fatura Atual" : competenciaLabel(invoice.competencia),
      suffix: <Badge tone={invoice.status === "aberta" ? "primary" : "neutral"}>{invoice.status === "aberta" ? "Aberta" : "Fechada"}</Badge>,
      content: (
        <div className="flex flex-col gap-3">
          <p className="text-lg font-semibold text-neutral-900">Total: {formatCentsToBRL(totalCents)}</p>
          {invoiceTransactions.length === 0 ? (
            <p className="text-sm text-neutral-500">Nenhum lançamento nesta fatura ainda.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {invoiceTransactions.map((t) => (
                <li key={t.id} className="flex items-center justify-between rounded-md border border-neutral-200 px-3 py-2 text-sm">
                  <div>
                    <p className="font-medium text-neutral-800">{t.description || (t.category_id ? categoryNameById[t.category_id] : "Sem descrição")}</p>
                    <p className="text-xs text-neutral-500">
                      {new Date(`${t.transaction_date}T00:00:00`).toLocaleDateString("pt-BR")}
                      {t.installment_number ? ` · parcela ${t.installment_number}` : ""}
                    </p>
                  </div>
                  <span className="tabular-nums text-neutral-800">{formatCentsToBRL(t.amount_cents)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      ),
    };
  });

  return <Tabs label="Faturas do cartão" tabs={tabs} />;
}
