import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ToastProvider } from "../../components/base/Toast";
import { ApiError } from "../../lib/api/errors";

const apiMocks = vi.hoisted(() => ({
  listCategories: vi.fn(),
  createCategory: vi.fn(),
  updateCategory: vi.fn(),
  deleteCategory: vi.fn(),
  listTransactionsByCategory: vi.fn(),
}));
vi.mock("../../lib/api/categories", () => apiMocks);

const dashboardMocks = vi.hoisted(() => ({ getMonthlyCategorySummary: vi.fn() }));
vi.mock("../../lib/api/dashboard", () => dashboardMocks);

const { CategoriesPage } = await import("./CategoriesPage");

const ROOT = {
  id: "cat-1",
  user_id: null,
  parent_category_id: null,
  name: "Alimentação",
  icon: "🍔",
  color: null,
  kind: "expense" as const,
  is_system_default: true,
  created_at: "2026-09-01T00:00:00Z",
  updated_at: "2026-09-01T00:00:00Z",
};

const SUB = {
  ...ROOT,
  id: "cat-1-sub",
  parent_category_id: "cat-1",
  name: "Restaurante",
  icon: null,
};

function renderPage() {
  return render(
    <MemoryRouter>
      <ToastProvider>
        <CategoriesPage />
      </ToastProvider>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  Object.values(apiMocks).forEach((mock) => mock.mockReset());
  dashboardMocks.getMonthlyCategorySummary.mockReset();
  dashboardMocks.getMonthlyCategorySummary.mockResolvedValue([]);
});

describe("CategoriesPage — S-CAT-01/01a/02/03 (RF-REF-05, RN-09)", () => {
  it("AC2: CategoryCard exibe nome, total gasto no mês e contagem de subcategorias sem clique adicional", async () => {
    apiMocks.listCategories.mockResolvedValue([ROOT, SUB]);
    dashboardMocks.getMonthlyCategorySummary.mockResolvedValue([{ category_id: SUB.id, category_name: SUB.name, kind: "expense", total_cents: 98000 }]);
    renderPage();

    expect(await screen.findByText("Alimentação")).toBeInTheDocument();
    expect(screen.getByText("R$ 980,00 este mês")).toBeInTheDocument();
    expect(screen.getByText("1 subcategoria")).toBeInTheDocument();
  });

  it("AC2: total gasto soma saídas da categoria + subcategorias (mesmo cálculo de RF-MVP-06), ignorando entradas", async () => {
    apiMocks.listCategories.mockResolvedValue([ROOT, SUB]);
    dashboardMocks.getMonthlyCategorySummary.mockResolvedValue([
      { category_id: ROOT.id, category_name: ROOT.name, kind: "expense", total_cents: 10000 },
      { category_id: SUB.id, category_name: SUB.name, kind: "expense", total_cents: 5000 },
      { category_id: SUB.id, category_name: SUB.name, kind: "income", total_cents: 999999 },
    ]);
    renderPage();

    expect(await screen.findByText("R$ 150,00 este mês")).toBeInTheDocument();
  });

  it("AC3: clique no corpo do card abre S-CAT-01a com a lista de subcategorias", async () => {
    apiMocks.listCategories.mockResolvedValue([ROOT, SUB]);
    renderPage();

    await userEvent.click(await screen.findByRole("button", { name: "Ver subcategorias de Alimentação" }));

    const dialog = await screen.findByRole("dialog", { name: "Alimentação — subcategorias" });
    expect(within(dialog).getByText("Restaurante")).toBeInTheDocument();
  });

  it("AC4: ícone Editar do card é ação secundária própria — abre o formulário direto, sem passar por S-CAT-01a", async () => {
    apiMocks.listCategories.mockResolvedValue([ROOT]);
    renderPage();
    await screen.findByText("Alimentação");

    await userEvent.click(screen.getByRole("button", { name: "Editar Alimentação" }));

    expect(await screen.findByRole("dialog", { name: "Editar categoria" })).toBeInTheDocument();
    expect(screen.queryByRole("dialog", { name: "Alimentação — subcategorias" })).not.toBeInTheDocument();
  });

  it("AC4: dentro de S-CAT-01a, editar/excluir de subcategoria continuam disponíveis", async () => {
    apiMocks.listCategories.mockResolvedValue([ROOT, SUB]);
    renderPage();

    await userEvent.click(await screen.findByRole("button", { name: "Ver subcategorias de Alimentação" }));
    const dialog = await screen.findByRole("dialog", { name: "Alimentação — subcategorias" });
    await userEvent.click(within(dialog).getByRole("button", { name: "Editar" }));

    expect(await screen.findByRole("dialog", { name: "Editar categoria" })).toBeInTheDocument();
  });

  it("AC4: dentro de S-CAT-01a, 'Editar categoria' edita a categoria de topo-nível", async () => {
    apiMocks.listCategories.mockResolvedValue([ROOT]);
    renderPage();

    await userEvent.click(await screen.findByRole("button", { name: "Ver subcategorias de Alimentação" }));
    const dialog = await screen.findByRole("dialog", { name: "Alimentação — subcategorias" });
    await userEvent.click(within(dialog).getByRole("button", { name: "Editar categoria" }));

    expect(await screen.findByRole("dialog", { name: "Editar categoria" })).toBeInTheDocument();
    expect(screen.getByLabelText("Nome", { exact: false })).toHaveValue("Alimentação");
  });

  it("grade colapsa 1→2→3→4 colunas conforme Padrão C (UX-SPEC Seção 2.1/6.3)", async () => {
    apiMocks.listCategories.mockResolvedValue([ROOT]);
    const { container } = renderPage();
    await screen.findByText("Alimentação");

    const grid = container.querySelector(".grid");
    expect(grid).toHaveClass("grid-cols-1", "sm:grid-cols-2", "lg:grid-cols-3", "xl:grid-cols-4");
  });

  it("RN-09: exclusão bloqueada mostra contagem de lançamentos vinculados e CTA 'Ver lançamentos desta categoria'", async () => {
    apiMocks.listCategories.mockResolvedValue([ROOT]);
    apiMocks.deleteCategory.mockRejectedValue(new ApiError({ message: "conflito", kind: "conflict" }));
    apiMocks.listTransactionsByCategory.mockResolvedValue([{ id: "t1" }, { id: "t2" }, { id: "t3" }]);
    renderPage();

    await userEvent.click(await screen.findByRole("button", { name: "Ver subcategorias de Alimentação" }));
    await userEvent.click(await screen.findByRole("button", { name: "Excluir categoria" }));
    await userEvent.click(await screen.findByRole("button", { name: "Excluir" }));

    expect(await screen.findByText(/3 lançamentos vinculados/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Ver lançamentos desta categoria" })).toBeInTheDocument();
  });

  it("estado vazio: nenhuma categoria cadastrada mostra EmptyState com CTA", async () => {
    apiMocks.listCategories.mockResolvedValue([]);
    renderPage();
    expect(await screen.findByText("Nenhuma categoria cadastrada ainda")).toBeInTheDocument();
  });

  it("estado de erro: falha ao carregar mostra Alert de recarregamento", async () => {
    apiMocks.listCategories.mockRejectedValue(new ApiError({ message: "falha de rede", kind: "network" }));
    renderPage();
    expect(await screen.findByRole("alert")).toHaveTextContent("falha de rede");
  });
});
