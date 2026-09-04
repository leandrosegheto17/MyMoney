import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { BarChart } from "./BarChart";

describe("BarChart — S-REP-01 (FE-F2-08, RF-F2-10 AC2)", () => {
  it("com menos de 6 meses de dado, exibe a nota de janela parcial, nunca preenche com zero", () => {
    render(<BarChart items={[{ month: "2026-08-01", incomeCents: 500000, expenseCents: 300000 }]} />);
    expect(screen.getByText(/Dados disponíveis a partir de/)).toBeInTheDocument();
    // Só 1 mês real deve aparecer — nunca 6 barras fabricadas.
    expect(screen.getAllByText(/Ago/).length).toBeGreaterThan(0);
  });

  it("com 6 meses de dado, não exibe a nota de janela parcial", () => {
    const items = Array.from({ length: 6 }, (_, index) => ({
      month: `2026-${String(index + 1).padStart(2, "0")}-01`,
      incomeCents: 100000,
      expenseCents: 50000,
    }));
    render(<BarChart items={items} />);
    expect(screen.queryByText(/Dados disponíveis a partir de/)).not.toBeInTheDocument();
  });

  it("estado vazio: nenhum lançamento ainda", () => {
    render(<BarChart items={[]} />);
    expect(screen.getByText("Sem lançamentos suficientes para exibir o comparativo ainda.")).toBeInTheDocument();
  });

  it("alternativa textual acessível: toggle 'Ver como tabela'", async () => {
    render(<BarChart items={[{ month: "2026-08-01", incomeCents: 500000, expenseCents: 300000 }]} />);
    expect(screen.getByRole("img", { name: /Comparativo de entradas e saídas/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Ver como tabela" })).toBeInTheDocument();
  });
});
