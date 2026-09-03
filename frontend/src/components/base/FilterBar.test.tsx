import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { FilterBar } from "./FilterBar";
import { Select } from "./Select";

describe("FilterBar", () => {
  it("renders composed filter controls inside a labelled search region", () => {
    render(
      <FilterBar label="Filtros de lançamentos">
        <Select label="Conta" options={[{ value: "1", label: "Carteira" }]} />
      </FilterBar>,
    );
    expect(screen.getByRole("search", { name: "Filtros de lançamentos" })).toBeInTheDocument();
    expect(screen.getByLabelText("Conta")).toBeInTheDocument();
  });

  it("calls onClear when the clear button is pressed", async () => {
    const onClear = vi.fn();
    render(
      <FilterBar onClear={onClear}>
        <Select label="Conta" options={[]} />
      </FilterBar>,
    );
    await userEvent.click(screen.getByRole("button", { name: "Limpar filtros" }));
    expect(onClear).toHaveBeenCalledTimes(1);
  });
});
