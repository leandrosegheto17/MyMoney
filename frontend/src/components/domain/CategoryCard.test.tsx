import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { CategoryCard } from "./CategoryCard";

describe("CategoryCard — UX-SPEC.md Seção 2.1 (Padrão C) / Seção 5 (RF-REF-05)", () => {
  it("exibe nome, ícone, total gasto no mês e contagem de subcategorias sem exigir clique adicional (AC2)", () => {
    render(
      <CategoryCard
        name="Alimentação"
        icon="🍔"
        color={null}
        totalSpentCents={98000}
        subcategoryCount={4}
        onOpenSubcategories={() => {}}
        onEdit={() => {}}
      />,
    );

    expect(screen.getByText("Alimentação")).toBeInTheDocument();
    expect(screen.getByText("R$ 980,00 este mês")).toBeInTheDocument();
    expect(screen.getByText("4 subcategorias")).toBeInTheDocument();
  });

  it("usa singular para exatamente 1 subcategoria", () => {
    render(
      <CategoryCard name="Saúde" totalSpentCents={0} subcategoryCount={1} onOpenSubcategories={() => {}} onEdit={() => {}} />,
    );
    expect(screen.getByText("1 subcategoria")).toBeInTheDocument();
  });

  it("clique no clicável primário chama onOpenSubcategories (AC3)", async () => {
    const onOpenSubcategories = vi.fn();
    render(
      <CategoryCard name="Transporte" totalSpentCents={0} subcategoryCount={0} onOpenSubcategories={onOpenSubcategories} onEdit={() => {}} />,
    );
    await userEvent.click(screen.getByRole("button", { name: "Ver subcategorias de Transporte" }));
    expect(onOpenSubcategories).toHaveBeenCalledTimes(1);
  });

  it("clique no ícone Editar chama onEdit, sem disparar onOpenSubcategories (ação secundária, não aninhada)", async () => {
    const onOpenSubcategories = vi.fn();
    const onEdit = vi.fn();
    render(
      <CategoryCard name="Transporte" totalSpentCents={0} subcategoryCount={0} onOpenSubcategories={onOpenSubcategories} onEdit={onEdit} />,
    );
    await userEvent.click(screen.getByRole("button", { name: "Editar Transporte" }));
    expect(onEdit).toHaveBeenCalledTimes(1);
    expect(onOpenSubcategories).not.toHaveBeenCalled();
  });

  it("acessibilidade (Seção 5): clicável primário e botão Editar são elementos irmãos, nunca aninhados", () => {
    render(
      <CategoryCard name="Lazer" totalSpentCents={0} subcategoryCount={0} onOpenSubcategories={() => {}} onEdit={() => {}} />,
    );
    const primary = screen.getByRole("button", { name: "Ver subcategorias de Lazer" });
    const secondary = screen.getByRole("button", { name: "Editar Lazer" });
    expect(primary.contains(secondary)).toBe(false);
    expect(secondary.contains(primary)).toBe(false);
    expect(primary.parentElement).toBe(secondary.parentElement);
  });

  it("aria-label do clicável primário descreve a ação (não só o nome), com total/contagem associados via aria-describedby", () => {
    render(
      <CategoryCard name="Moradia" totalSpentCents={80000} subcategoryCount={2} onOpenSubcategories={() => {}} onEdit={() => {}} />,
    );
    const primary = screen.getByRole("button", { name: "Ver subcategorias de Moradia" });
    const describedBy = primary.getAttribute("aria-describedby");
    expect(describedBy).toBeTruthy();
    const describedText = describedBy!
      .split(" ")
      .map((id) => document.getElementById(id)?.textContent)
      .join(" ");
    expect(describedText).toContain("R$ 800,00 este mês");
    expect(describedText).toContain("2 subcategorias");
  });

  it("ordem de tabulação: clicável primário antes do botão Editar (Seção 5)", () => {
    render(
      <CategoryCard name="Metas" totalSpentCents={0} subcategoryCount={0} onOpenSubcategories={() => {}} onEdit={() => {}} />,
    );
    const buttons = screen.getAllByRole("button");
    expect(buttons[0]).toHaveAccessibleName("Ver subcategorias de Metas");
    expect(buttons[1]).toHaveAccessibleName("Editar Metas");
  });
});
