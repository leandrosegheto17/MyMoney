import { render, screen } from "@testing-library/react";
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

const { CategoriesPage } = await import("./CategoriesPage");

const ROOT = {
  id: "cat-1",
  user_id: null,
  parent_category_id: null,
  name: "Alimentação",
  icon: null,
  color: null,
  kind: "expense" as const,
  is_system_default: true,
  created_at: "2026-09-01T00:00:00Z",
  updated_at: "2026-09-01T00:00:00Z",
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
});

describe("CategoriesPage — S-CAT-01/02/03 (RN-09)", () => {
  it("lista categorias raiz", async () => {
    apiMocks.listCategories.mockResolvedValue([ROOT]);
    renderPage();
    expect(await screen.findByText("Alimentação")).toBeInTheDocument();
  });

  it("RN-09: exclusão bloqueada mostra contagem de lançamentos vinculados e CTA 'Ver lançamentos desta categoria'", async () => {
    apiMocks.listCategories.mockResolvedValue([ROOT]);
    apiMocks.deleteCategory.mockRejectedValue(new ApiError({ message: "conflito", kind: "conflict" }));
    apiMocks.listTransactionsByCategory.mockResolvedValue([{ id: "t1" }, { id: "t2" }, { id: "t3" }]);
    renderPage();

    await userEvent.click(await screen.findByRole("button", { name: "Excluir" }));
    const dialogConfirm = (await screen.findAllByRole("button", { name: "Excluir" }))[1];
    await userEvent.click(dialogConfirm);

    expect(await screen.findByText(/3 lançamentos vinculados/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Ver lançamentos desta categoria" })).toBeInTheDocument();
  });
});
