import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { useState } from "react";
import { CategoryPicker } from "./CategoryPicker";
import type { CategoryPickerValue, CategoryTaxonomyItem } from "./CategoryPicker";

const BASE_TAXONOMY: CategoryTaxonomyItem[] = [
  { id: "alimentacao", name: "Alimentação", parentId: null },
  { id: "mercado", name: "Mercado", parentId: "alimentacao" },
  { id: "restaurante", name: "Restaurante", parentId: "alimentacao" },
  { id: "transporte", name: "Transporte", parentId: null },
];

function Harness({ categories }: { categories: CategoryTaxonomyItem[] }) {
  const [value, setValue] = useState<CategoryPickerValue>({ categoryId: null, subcategoryId: null });
  return <CategoryPicker categories={categories} value={value} onChange={setValue} />;
}

describe("CategoryPicker", () => {
  it("lists only root categories in the first level", () => {
    render(<Harness categories={BASE_TAXONOMY} />);
    expect(screen.getByRole("option", { name: "Alimentação" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Transporte" })).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: "Mercado" })).not.toBeInTheDocument();
  });

  it("populates subcategories after selecting a category, and resets subcategory on category change", async () => {
    render(<Harness categories={BASE_TAXONOMY} />);
    await userEvent.selectOptions(screen.getByLabelText("Categoria"), "alimentacao");
    expect(screen.getByRole("option", { name: "Mercado" })).toBeInTheDocument();

    await userEvent.selectOptions(screen.getByLabelText("Subcategoria"), "mercado");
    expect(screen.getByLabelText("Subcategoria")).toHaveValue("mercado");

    await userEvent.selectOptions(screen.getByLabelText("Categoria"), "transporte");
    expect(screen.getByLabelText("Subcategoria")).toHaveValue("");
  });

  it("reflects taxonomy edits in real time without requiring a reload (RF-MVP-03 AC2)", () => {
    const { rerender } = render(
      <CategoryPicker
        categories={BASE_TAXONOMY}
        value={{ categoryId: null, subcategoryId: null }}
        onChange={() => {}}
      />,
    );
    expect(screen.queryByRole("option", { name: "Lazer" })).not.toBeInTheDocument();

    const updatedTaxonomy = [...BASE_TAXONOMY, { id: "lazer", name: "Lazer", parentId: null }];
    rerender(
      <CategoryPicker categories={updatedTaxonomy} value={{ categoryId: null, subcategoryId: null }} onChange={() => {}} />,
    );
    expect(screen.getByRole("option", { name: "Lazer" })).toBeInTheDocument();
  });

  it("disables the subcategory field until a category is selected", () => {
    render(<Harness categories={BASE_TAXONOMY} />);
    expect(screen.getByLabelText("Subcategoria")).toBeDisabled();
  });

  it("clears a selected subcategory that no longer exists after a live taxonomy edit", async () => {
    function LiveTaxonomyHarness() {
      const [categories, setCategories] = useState(BASE_TAXONOMY);
      const [value, setValue] = useState<CategoryPickerValue>({
        categoryId: "alimentacao",
        subcategoryId: "mercado",
      });
      return (
        <>
          <CategoryPicker categories={categories} value={value} onChange={setValue} />
          <button
            type="button"
            onClick={() => setCategories(BASE_TAXONOMY.filter((item) => item.id !== "mercado"))}
          >
            Remover Mercado da taxonomia
          </button>
        </>
      );
    }

    render(<LiveTaxonomyHarness />);
    expect(screen.getByLabelText("Subcategoria")).toHaveValue("mercado");

    await userEvent.click(screen.getByRole("button", { name: "Remover Mercado da taxonomia" }));

    expect(screen.getByLabelText("Subcategoria")).toHaveValue("");
  });
});
