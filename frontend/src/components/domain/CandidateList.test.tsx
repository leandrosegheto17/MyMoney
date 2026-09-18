import { render, screen } from "@testing-library/react";
import { axe } from "jest-axe";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { CandidateList } from "./CandidateList";
import type { CandidateListItemView } from "./CandidateList";

function renderList(items: CandidateListItemView[], selected: ReadonlySet<string> = new Set()) {
  return render(
    <MemoryRouter>
      <CandidateList items={items} selected={selected} onToggle={vi.fn()} onSelectAll={vi.fn()} onClearSelection={vi.fn()} />
    </MemoryRouter>,
  );
}

describe("CandidateList — S-CAP-07 (FE-F3-05)", () => {
  it("estado vazio: 'Nenhuma transação encontrada' quando não há candidatos", () => {
    renderList([]);
    expect(screen.getByText("Nenhuma transação encontrada")).toBeInTheDocument();
  });

  it("mostra ⚠ + ReconciliationHint só ao lado de item sinalizado como duplicata", () => {
    renderList(
      [
        { key: "a", date: "2026-08-12", description: "Supermercado", amountCents: 1000, kind: "expense", isDuplicate: false, duplicateOfTransactionId: null },
        { key: "b", date: "2026-08-13", description: "Restaurante", amountCents: 2000, kind: "expense", isDuplicate: true, duplicateOfTransactionId: "txn-1" },
      ],
      new Set(["a"]),
    );

    expect(screen.getAllByRole("checkbox")).toHaveLength(2);
    expect(screen.getByText("ver lançamento existente")).toBeInTheDocument();
    expect(screen.getByText(/Possível duplicata/)).toBeInTheDocument();
  });

  it("contador reflete total de itens e quantidade selecionada", () => {
    renderList(
      [
        { key: "a", date: "2026-08-12", description: "A", amountCents: 1000, kind: "expense", isDuplicate: false, duplicateOfTransactionId: null },
        { key: "b", date: "2026-08-13", description: "B", amountCents: 2000, kind: "income", isDuplicate: false, duplicateOfTransactionId: null },
      ],
      new Set(["a", "b"]),
    );

    expect(screen.getByText(/2 transações encontradas/)).toHaveTextContent("2 selecionadas");
  });
});

describe("CandidateList — acessibilidade WCAG 2.1 AA (QA-F3-02)", () => {
  it("estado vazio não tem violações de acessibilidade detectáveis por axe-core", async () => {
    const { container } = renderList([]);
    expect(await axe(container)).toHaveNoViolations();
  });

  it("lista com item duplicado (checkbox + ⚠ decorativo + hint textual) não tem violações de acessibilidade", async () => {
    const { container } = renderList(
      [
        { key: "a", date: "2026-08-12", description: "Supermercado", amountCents: 1000, kind: "expense", isDuplicate: false, duplicateOfTransactionId: null },
        { key: "b", date: "2026-08-13", description: "Restaurante", amountCents: 2000, kind: "expense", isDuplicate: true, duplicateOfTransactionId: "txn-1" },
      ],
      new Set(["a"]),
    );
    expect(await axe(container)).toHaveNoViolations();
  });

  it("cada checkbox tem nome acessível (via <label> envolvente) — nunca um input 'mudo' para leitor de tela", () => {
    renderList([
      { key: "a", date: "2026-08-12", description: "Supermercado", amountCents: 1000, kind: "expense", isDuplicate: false, duplicateOfTransactionId: null },
    ]);
    const checkbox = screen.getByRole("checkbox");
    expect(checkbox).toHaveAccessibleName(/Supermercado/);
  });

  it("o indicador '⚠' de duplicata é decorativo (aria-hidden) — a informação real é veiculada pelo texto 'Possível duplicata...' adjacente, nunca só pelo ícone", () => {
    renderList([
      { key: "a", date: "2026-08-12", description: "Restaurante", amountCents: 2000, kind: "expense", isDuplicate: true, duplicateOfTransactionId: "txn-1" },
    ]);
    const icon = screen.getByText("⚠");
    expect(icon).toHaveAttribute("aria-hidden", "true");
    expect(screen.getByText(/Possível duplicata de lançamento existente/)).toBeInTheDocument();
  });
});
