import { render, screen } from "@testing-library/react";
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
