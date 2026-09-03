import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

const dashboardMocks = vi.hoisted(() => ({
  getMonthProvision: vi.fn(),
  getMonthlyCategorySummary: vi.fn(),
  getMonthTransactionCount: vi.fn(),
}));
vi.mock("../../lib/api/dashboard", () => dashboardMocks);
const budgetMocks = vi.hoisted(() => ({ getBudgetStatus: vi.fn() }));
vi.mock("../../lib/api/budget", () => budgetMocks);
const transactionsMocks = vi.hoisted(() => ({ listTransactions: vi.fn() }));
vi.mock("../../lib/api/transactions", () => transactionsMocks);

const { DashboardPage } = await import("./DashboardPage");

function renderPage() {
  return render(
    <MemoryRouter>
      <DashboardPage />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  Object.values(dashboardMocks).forEach((m) => m.mockReset());
  Object.values(budgetMocks).forEach((m) => m.mockReset());
  Object.values(transactionsMocks).forEach((m) => m.mockReset());
  budgetMocks.getBudgetStatus.mockResolvedValue([]);
  transactionsMocks.listTransactions.mockResolvedValue([]);
});

describe("DashboardPage — S-DASH-01 (RF-MVP-05/06)", () => {
  it("mostra o saldo consolidado e o resumo do mês", async () => {
    dashboardMocks.getMonthProvision.mockResolvedValue({ current_total_balance_cents: 842015, pending_income_cents: 0, pending_expense_cents: 0, provisioned_balance_cents: 0 });
    dashboardMocks.getMonthlyCategorySummary.mockResolvedValue([
      { category_id: "cat-1", category_name: "Alimentação", kind: "expense", total_cents: 98000 },
      { category_id: "cat-2", category_name: "Salário", kind: "income", total_cents: 620000 },
    ]);
    dashboardMocks.getMonthTransactionCount.mockResolvedValue(42);

    renderPage();

    expect(await screen.findByText("R$ 8.420,15")).toBeInTheDocument();
    expect(screen.getByText(/R\$ 6.200,00/)).toBeInTheDocument();
    expect(screen.getAllByText(/R\$ 980,00/).length).toBeGreaterThan(0);
    expect(screen.getByText("42 este mês")).toBeInTheDocument();
  });

  it("gráfico é o 2º bloco visível, logo após os números-resumo (não anexo secundário)", async () => {
    dashboardMocks.getMonthProvision.mockResolvedValue({ current_total_balance_cents: 100000, pending_income_cents: 0, pending_expense_cents: 0, provisioned_balance_cents: 0 });
    dashboardMocks.getMonthlyCategorySummary.mockResolvedValue([{ category_id: "cat-1", category_name: "Alimentação", kind: "expense", total_cents: 98000 }]);
    dashboardMocks.getMonthTransactionCount.mockResolvedValue(1);
    renderPage();

    const headings = (await screen.findAllByRole("heading", { level: 2 })).map((h) => h.textContent);
    expect(headings[0]).toBe("Para onde o dinheiro foi (este mês)");
  });

  it("sem lançamento no mês: gráfico vira EmptyState, números-resumo continuam visíveis em zero", async () => {
    dashboardMocks.getMonthProvision.mockResolvedValue({ current_total_balance_cents: 0, pending_income_cents: 0, pending_expense_cents: 0, provisioned_balance_cents: 0 });
    dashboardMocks.getMonthlyCategorySummary.mockResolvedValue([]);
    dashboardMocks.getMonthTransactionCount.mockResolvedValue(0);
    renderPage();

    expect(await screen.findByText("Nenhum lançamento este mês ainda")).toBeInTheDocument();
    expect(screen.getByText("0 este mês")).toBeInTheDocument();
  });

  it("estado de erro: mostra Banner de recarregamento", async () => {
    dashboardMocks.getMonthProvision.mockRejectedValue(new Error("falha de rede"));
    dashboardMocks.getMonthlyCategorySummary.mockResolvedValue([]);
    dashboardMocks.getMonthTransactionCount.mockResolvedValue(0);
    renderPage();

    expect(await screen.findByRole("alert")).toHaveTextContent(/Não foi possível atualizar/);
  });
});
