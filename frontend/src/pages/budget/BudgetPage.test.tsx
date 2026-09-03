import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ToastProvider } from "../../components/base/Toast";

const budgetMocks = vi.hoisted(() => ({
  getBudgetStatus: vi.fn(),
  listBudgets: vi.fn(),
  createBudget: vi.fn(),
  updateBudget: vi.fn(),
  deleteBudget: vi.fn(),
  monthKey: () => "2026-09-01",
}));
vi.mock("../../lib/api/budget", () => budgetMocks);
const categoriesMocks = vi.hoisted(() => ({ listCategories: vi.fn() }));
vi.mock("../../lib/api/categories", () => categoriesMocks);

const { BudgetPage } = await import("./BudgetPage");

const STATUS_WARNING = {
  budget_id: "b1",
  category_id: "cat-1",
  category_name: "Alimentação",
  month: "2026-09-01",
  limit_cents: 100000,
  spent_cents: 85000,
  alert_threshold_pct: 80,
  pct_spent: 85,
  alert_level: "warning" as const,
};

function renderPage() {
  return render(
    <ToastProvider>
      <BudgetPage />
    </ToastProvider>,
  );
}

beforeEach(() => {
  Object.values(budgetMocks).forEach((m) => typeof m === "function" && "mockReset" in m && m.mockReset());
  Object.values(categoriesMocks).forEach((m) => m.mockReset());
  categoriesMocks.listCategories.mockResolvedValue([]);
  budgetMocks.listBudgets.mockResolvedValue([]);
});

describe("BudgetPage — S-BUD-01/02 (RN-04)", () => {
  it("estado vazio: nenhum orçamento definido este mês", async () => {
    budgetMocks.getBudgetStatus.mockResolvedValue([]);
    renderPage();
    expect(await screen.findByText("Nenhum orçamento definido este mês")).toBeInTheDocument();
  });

  it("mostra barra de progresso combinando cor + ícone + texto para o estado de alerta", async () => {
    budgetMocks.getBudgetStatus.mockResolvedValue([STATUS_WARNING]);
    budgetMocks.listBudgets.mockResolvedValue([
      { id: "b1", user_id: "u1", category_id: "cat-1", month: "2026-09-01", limit_cents: 100000, alert_threshold_pct: 80, created_at: "", updated_at: "" },
    ]);
    renderPage();
    expect(await screen.findByText("Alimentação")).toBeInTheDocument();
    expect(screen.getByText(/⚠/)).toBeInTheDocument();
    expect(screen.getByText(/85% do teto/)).toBeInTheDocument();
    expect(screen.getByText("R$ 850,00 de R$ 1.000,00")).toBeInTheDocument();
  });
});
