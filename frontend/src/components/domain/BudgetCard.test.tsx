import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { BudgetCard } from "./BudgetCard";

describe("BudgetCard — UX-SPEC.md Seção 2.1 (Padrão C) / Seção 2.2 (RF-REF-06)", () => {
  it("exibe categoria, gasto vs. teto e percentual sem exigir clique adicional (AC2)", () => {
    render(
      <BudgetCard categoryName="Alimentação" spentCents={82000} limitCents={100000} pctSpent={82} alertLevel="warning" onEdit={() => {}} />,
    );

    expect(screen.getByText("Alimentação")).toBeInTheDocument();
    expect(screen.getByText("R$ 820,00 de R$ 1.000,00")).toBeInTheDocument();
    expect(screen.getByText(/82%/)).toBeInTheDocument();
  });

  it("clique no corpo do card chama onEdit (abre S-BUD-02)", async () => {
    const onEdit = vi.fn();
    render(<BudgetCard categoryName="Transporte" spentCents={0} limitCents={100000} pctSpent={0} alertLevel="none" onEdit={onEdit} />);
    await userEvent.click(screen.getByRole("button", { name: "Editar orçamento de Transporte" }));
    expect(onEdit).toHaveBeenCalledTimes(1);
  });

  it("estado normal (< 80%): sem destaque de severidade (data-severity=none)", () => {
    render(<BudgetCard categoryName="Lazer" spentCents={10000} limitCents={100000} pctSpent={10} alertLevel="none" onEdit={() => {}} />);
    const card = screen.getByRole("button", { name: "Editar orçamento de Lazer" }).closest("[data-severity]");
    expect(card).toHaveAttribute("data-severity", "none");
  });

  it("card em alerta (>=80%) recebe destaque visual adicional no próprio card, perceptível na grade (AC3)", () => {
    render(<BudgetCard categoryName="Saúde" spentCents={85000} limitCents={100000} pctSpent={85} alertLevel="warning" onEdit={() => {}} />);
    const card = screen.getByRole("button", { name: "Editar orçamento de Saúde" }).closest("[data-severity]") as HTMLElement;
    expect(card).toHaveAttribute("data-severity", "warning");
    expect(card.style.backgroundColor).not.toBe("");
    expect(card.className).toContain("border-2");
  });

  it("card em estouro (>100%) recebe destaque visual diferente do de alerta (severidade maior, AC3)", () => {
    render(<BudgetCard categoryName="Casa" spentCents={150000} limitCents={100000} pctSpent={150} alertLevel="exceeded" onEdit={() => {}} />);
    const card = screen.getByRole("button", { name: "Editar orçamento de Casa" }).closest("[data-severity]") as HTMLElement;
    expect(card).toHaveAttribute("data-severity", "exceeded");
    expect(card.style.backgroundColor).not.toBe("");
    expect(card.className).toContain("border-2");
  });

  it("acessibilidade: aria-label descreve a ação (não só o nome), com o conteúdo visível associado via aria-describedby", () => {
    render(<BudgetCard categoryName="Moradia" spentCents={80000} limitCents={100000} pctSpent={80} alertLevel="warning" onEdit={() => {}} />);
    const primary = screen.getByRole("button", { name: "Editar orçamento de Moradia" });
    const describedBy = primary.getAttribute("aria-describedby");
    expect(describedBy).toBeTruthy();
    const describedText = document.getElementById(describedBy!)?.textContent ?? "";
    expect(describedText).toContain("R$ 800,00 de R$ 1.000,00");
    expect(describedText).toContain("80%");
  });

  it("achado de qualidade (WCAG): texto secundário usa text-neutral-600 (não text-neutral-500) quando o card tem destaque de severidade, para manter contraste sobre o novo fundo", () => {
    render(<BudgetCard categoryName="Saúde" spentCents={85000} limitCents={100000} pctSpent={85} alertLevel="warning" onEdit={() => {}} />);
    const detail = screen.getByText("R$ 850,00 de R$ 1.000,00");
    expect(detail.className).toContain("text-neutral-600");
    expect(detail.className).not.toContain("text-neutral-500");
  });

  it("achado de qualidade (WCAG): texto secundário mantém text-neutral-500 (padrão, já validado) quando não há destaque de severidade", () => {
    render(<BudgetCard categoryName="Lazer" spentCents={10000} limitCents={100000} pctSpent={10} alertLevel="none" onEdit={() => {}} />);
    const detail = screen.getByText("R$ 100,00 de R$ 1.000,00");
    expect(detail.className).toContain("text-neutral-500");
  });

  it("nome longo de categoria não estoura o card (min-w-0/truncate, regra anti-corte)", () => {
    render(
      <BudgetCard
        categoryName="Uma categoria com nome extremamente longo para testar corte"
        spentCents={1000}
        limitCents={100000}
        pctSpent={1}
        alertLevel="none"
        onEdit={() => {}}
      />,
    );
    const label = screen.getByText("Uma categoria com nome extremamente longo para testar corte");
    expect(label.className).toContain("truncate");
  });
});
