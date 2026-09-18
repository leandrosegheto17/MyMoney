import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "jest-axe";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Category } from "../../lib/api/types";

const listCategoriesMock = vi.fn();
vi.mock("../../lib/api/categories", () => ({ listCategories: () => listCategoriesMock() }));

const { TaxonomyReviewPage } = await import("./TaxonomyReviewPage");

function cat(id: string, name: string, parent: string | null = null): Category {
  return {
    id, user_id: null, parent_category_id: parent, name, icon: null, color: null,
    kind: "expense", is_system_default: true, created_at: "", updated_at: "",
  } as Category;
}

function renderPage() {
  return render(
    <MemoryRouter initialEntries={["/onboarding/taxonomia"]}>
      <Routes>
        <Route path="/onboarding/taxonomia" element={<TaxonomyReviewPage />} />
        <Route path="/" element={<p>home</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  listCategoriesMock.mockReset();
});

describe("TaxonomyReviewPage — S-ONB-02 (RF-MVP-03/RN-09, DIR-44)", () => {
  it("mostra skeleton enquanto carrega", () => {
    listCategoriesMock.mockReturnValue(new Promise(() => {}));
    renderPage();
    expect(screen.getByLabelText("Carregando categorias")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1, name: "Suas categorias já vêm prontas" })).toBeInTheDocument();
    expect(screen.getByText("Passo 2 de 2")).toBeInTheDocument();
  });

  it("mostra erro quando o fetch falha", async () => {
    listCategoriesMock.mockRejectedValue(new Error("x"));
    renderPage();
    expect(await screen.findByText("Não foi possível carregar as categorias.")).toBeInTheDocument();
  });

  it("lista raízes e subcategorias", async () => {
    listCategoriesMock.mockResolvedValue([cat("1", "Moradia"), cat("2", "Aluguel", "1"), cat("3", "Lazer")]);
    const { container } = renderPage();
    expect(await screen.findByText("Moradia")).toBeInTheDocument();
    expect(screen.getByText("Aluguel").closest("ul")?.closest("li")).toHaveTextContent("Moradia");
    expect(screen.getByText("Lazer")).toBeInTheDocument();
    expect(container.querySelector(".max-h-72")).not.toBeNull();
    expect(await axe(container)).toHaveNoViolations();
  });

  it("nao usa text-neutral-400 (DIR-44)", async () => {
    listCategoriesMock.mockResolvedValue([cat("1", "Moradia")]);
    const { container } = renderPage();
    await screen.findByText("Moradia");
    expect(container.innerHTML).not.toContain("text-neutral-400");
  });

  it("Concluir navega para /", async () => {
    listCategoriesMock.mockResolvedValue([]);
    renderPage();
    await userEvent.click(screen.getByRole("button", { name: "Concluir" }));
    await waitFor(() => expect(screen.getByText("home")).toBeInTheDocument());
  });
});
