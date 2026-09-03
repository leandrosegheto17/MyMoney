import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { DonutChart } from "./DonutChart";

const SLICES = [
  { id: "cat-1", label: "Alimentação", valueCents: 98000 },
  { id: "cat-2", label: "Moradia", valueCents: 80000 },
];

describe("DonutChart — S-DASH-01 (RF-MVP-06, WCAG alternativa a gráfico)", () => {
  it("tocar numa fatia da legenda navega/aciona o callback com o id da categoria", async () => {
    const onSliceClick = vi.fn();
    render(<DonutChart slices={SLICES} onSliceClick={onSliceClick} />);
    await userEvent.click(screen.getByRole("button", { name: /Alimentação/ }));
    expect(onSliceClick).toHaveBeenCalledWith("cat-1");
  });

  it("expõe uma alternativa textual/tabela para leitor de tela (WCAG Seção 5)", async () => {
    render(<DonutChart slices={SLICES} />);
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Ver como tabela" }));
    expect(screen.getByRole("table")).toBeInTheDocument();
    expect(screen.getByRole("img")).toHaveAccessibleName(/Alimentação/);
  });

  it("sem dados, mostra mensagem em vez de um gráfico vazio", () => {
    render(<DonutChart slices={[]} />);
    expect(screen.getByText("Sem dados para exibir no período.")).toBeInTheDocument();
  });
});
