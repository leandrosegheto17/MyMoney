import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { LineChart } from "./LineChart";

describe("LineChart — S-REP-02 (FE-F3-07, RF-F3-05)", () => {
  it("com menos de 6 meses de dado, exibe a nota de janela parcial, nunca preenche com zero", () => {
    render(<LineChart items={[{ month: "2026-08-01", balanceCents: 500000 }]} />);
    expect(screen.getByText(/Dados disponíveis a partir de/)).toBeInTheDocument();
    expect(screen.getAllByText(/Ago/).length).toBeGreaterThan(0);
  });

  it("com 6 meses de dado, não exibe a nota de janela parcial", () => {
    const items = Array.from({ length: 6 }, (_, index) => ({
      month: `2026-${String(index + 1).padStart(2, "0")}-01`,
      balanceCents: 100000 * (index + 1),
    }));
    render(<LineChart items={items} />);
    expect(screen.queryByText(/Dados disponíveis a partir de/)).not.toBeInTheDocument();
  });

  it("estado vazio: nenhum dado ainda", () => {
    render(<LineChart items={[]} />);
    expect(screen.getByText("Sem dados suficientes para exibir a evolução patrimonial ainda.")).toBeInTheDocument();
  });

  it("alternativa textual acessível: toggle 'Ver como tabela'", async () => {
    render(<LineChart items={[{ month: "2026-08-01", balanceCents: 500000 }]} />);
    expect(screen.getByRole("img", { name: /Evolução do saldo consolidado/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Ver como tabela" })).toBeInTheDocument();
  });
});
