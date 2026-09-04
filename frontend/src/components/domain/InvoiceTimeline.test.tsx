import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { InvoiceTimeline } from "./InvoiceTimeline";

function invoice(competencia: string, status: "aberta" | "fechada") {
  return { id: `inv-${competencia}`, user_id: "u1", credit_card_id: "card-1", competencia, status, created_at: "x", updated_at: "x" };
}

const now = new Date();
const currentCompetencia = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
function addMonths(base: string, months: number): string {
  const [year, month] = base.split("-").map(Number);
  const date = new Date(year, month - 1 + months, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-01`;
}

describe("InvoiceTimeline — S-CARD-03 (FE-F2-02, DIR-13)", () => {
  it("mostra no máximo 3 abas (atual + 2 futuras), mesmo com mais faturas disponíveis no backend", () => {
    const invoices = [
      invoice(addMonths(currentCompetencia, -1), "fechada"),
      invoice(currentCompetencia, "aberta"),
      invoice(addMonths(currentCompetencia, 1), "aberta"),
      invoice(addMonths(currentCompetencia, 2), "aberta"),
      invoice(addMonths(currentCompetencia, 3), "aberta"),
    ];
    render(<InvoiceTimeline invoices={invoices} transactions={[]} categoryNameById={{}} />);
    expect(screen.getAllByRole("tab")).toHaveLength(3);
  });

  it("badge aberta/fechada por aba (RF-F2-05 AC3)", () => {
    render(<InvoiceTimeline invoices={[invoice(currentCompetencia, "fechada")]} transactions={[]} categoryNameById={{}} />);
    expect(screen.getByText("Fechada")).toBeInTheDocument();
  });

  it("total da fatura soma só os lançamentos daquela competência (card_invoice_id)", () => {
    const invoices = [invoice(currentCompetencia, "aberta")];
    const transactions = [
      { id: "t1", user_id: "u1", account_id: "a1", destination_account_id: null, payment_method_id: "pm1", category_id: "c1", kind: "expense" as const, amount_cents: 5000, description: "Mercado", transaction_date: "2026-09-02", status: "cleared" as const, source: "manual" as const, card_invoice_id: `inv-${currentCompetencia}`, recurring_rule_id: null, installment_plan_id: null, installment_number: null, fixed_bill_id: null, created_via_shortcut: false, created_at: "x", updated_at: "x" },
    ];
    render(<InvoiceTimeline invoices={invoices} transactions={transactions} categoryNameById={{}} />);
    expect(screen.getByText("Total: R$ 50,00")).toBeInTheDocument();
    expect(screen.getByText("Mercado")).toBeInTheDocument();
  });
});
