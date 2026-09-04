import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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

const BUDGET_1 = {
  id: "b1",
  user_id: "u1",
  category_id: "cat-1",
  month: "2026-09-01",
  limit_cents: 100000,
  alert_threshold_pct: 80,
  created_at: "",
  updated_at: "",
};

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

const STATUS_NORMAL = {
  budget_id: "b2",
  category_id: "cat-2",
  category_name: "Transporte",
  month: "2026-09-01",
  limit_cents: 100000,
  spent_cents: 34000,
  alert_threshold_pct: 80,
  pct_spent: 34,
  alert_level: "none" as const,
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

describe("BudgetPage — S-BUD-01/02 (RF-REF-06, grade de BudgetCard, RN-04)", () => {
  it("estado vazio: nenhum orçamento definido este mês", async () => {
    budgetMocks.getBudgetStatus.mockResolvedValue([]);
    renderPage();
    expect(await screen.findByText("Nenhum orçamento definido este mês")).toBeInTheDocument();
  });

  it("grade exibe 1 BudgetCard por categoria orçada, com categoria, gasto vs. teto, percentual e severidade, sem clique adicional (AC2)", async () => {
    budgetMocks.getBudgetStatus.mockResolvedValue([STATUS_WARNING]);
    budgetMocks.listBudgets.mockResolvedValue([BUDGET_1]);
    renderPage();
    expect(await screen.findByText("Alimentação")).toBeInTheDocument();
    expect(screen.getByText(/⚠/)).toBeInTheDocument();
    expect(screen.getByText(/85% do teto/)).toBeInTheDocument();
    expect(screen.getByText("R$ 850,00 de R$ 1.000,00")).toBeInTheDocument();
  });

  it("nunca renderiza card vazio para categoria sem orçamento definido no mês (AC4) — grade contém só as categorias de get_budget_status", async () => {
    budgetMocks.getBudgetStatus.mockResolvedValue([STATUS_NORMAL]);
    budgetMocks.listBudgets.mockResolvedValue([{ ...BUDGET_1, id: "b2", category_id: "cat-2" }]);
    categoriesMocks.listCategories.mockResolvedValue([
      { id: "cat-2", user_id: "u1", name: "Transporte", kind: "expense", parent_category_id: null, icon: null, color: null, created_at: "", updated_at: "" },
      { id: "cat-3", user_id: "u1", name: "Saúde (sem orçamento)", kind: "expense", parent_category_id: null, icon: null, color: null, created_at: "", updated_at: "" },
    ]);
    renderPage();
    expect(await screen.findByText("Transporte")).toBeInTheDocument();
    expect(screen.queryByText("Saúde (sem orçamento)")).not.toBeInTheDocument();
  });

  it("achado de qualidade (regressão AC1): card não some quando listBudgets() diverge de getBudgetStatus() (mismatch de fuso servidor x cliente) — grade é dirigida só por BudgetStatusItem", async () => {
    budgetMocks.getBudgetStatus.mockResolvedValue([STATUS_WARNING]);
    // `listBudgets()` não traz o budget_id de STATUS_WARNING — simula a divergência
    // real de fuso entre `getBudgetStatus()` (mês resolvido no servidor,
    // `America/Sao_Paulo`) e `listBudgets()` (sem esse filtro), que antes da
    // correção fazia `budgets.find(...)` falhar e o card sumir por completo.
    budgetMocks.listBudgets.mockResolvedValue([]);
    renderPage();
    expect(await screen.findByText("Alimentação")).toBeInTheDocument();
    expect(screen.queryByText("Nenhum orçamento definido este mês")).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Editar orçamento de Alimentação" }));
    expect(await screen.findByRole("heading", { name: "Editar orçamento" })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Salvar" }));
    expect(budgetMocks.updateBudget).toHaveBeenCalledWith("b1", { limit_cents: 100000, alert_threshold_pct: 80 });
  });

  it("clique no corpo do BudgetCard abre S-BUD-02 (editar teto) — única ação do card", async () => {
    budgetMocks.getBudgetStatus.mockResolvedValue([STATUS_WARNING]);
    budgetMocks.listBudgets.mockResolvedValue([BUDGET_1]);
    renderPage();
    await userEvent.click(await screen.findByRole("button", { name: "Editar orçamento de Alimentação" }));
    expect(await screen.findByRole("heading", { name: "Editar orçamento" })).toBeInTheDocument();
  });

  it("ação 'Remover orçamento' preservada dentro de S-BUD-02 (movida do card, sem chamada de API nova de exclusão)", async () => {
    budgetMocks.getBudgetStatus.mockResolvedValue([STATUS_WARNING]);
    budgetMocks.listBudgets.mockResolvedValue([BUDGET_1]);
    budgetMocks.deleteBudget.mockResolvedValue(undefined);
    renderPage();

    await userEvent.click(await screen.findByRole("button", { name: "Editar orçamento de Alimentação" }));
    await userEvent.click(await screen.findByRole("button", { name: "Remover orçamento" }));
    expect(await screen.findByRole("heading", { name: "Remover orçamento" })).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Remover" }));
    expect(budgetMocks.deleteBudget).toHaveBeenCalledWith("b1");
  });

  it("formulário de novo orçamento (sem editingBudget) não exibe o botão 'Remover orçamento'", async () => {
    budgetMocks.getBudgetStatus.mockResolvedValue([]);
    renderPage();
    await userEvent.click(await screen.findByRole("button", { name: "+ Novo orçamento" }));
    expect(await screen.findByRole("heading", { name: "Novo orçamento" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Remover orçamento" })).not.toBeInTheDocument();
  });
});
