import { render, screen } from "@testing-library/react";
import { axe } from "jest-axe";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { AccountCard } from "./AccountCard";

const base = { name: "Nubank", typeLabel: "Conta corrente", currentBalanceCents: 8500, isActive: true, onEdit: () => {}, onDelete: () => {} };

describe("AccountCard — UX-SPEC.md Seção 2.2 (Redesign v2.0, Padrão C)", () => {
  it("exibe rótulo do tipo, nome e saldo em BRL", () => {
    render(<AccountCard {...base} />);
    expect(screen.getByText("Conta corrente")).toBeInTheDocument();
    expect(screen.getByText("Nubank")).toBeInTheDocument();
    expect(screen.getByText("R$ 85,00")).toBeInTheDocument();
  });

  it("não tem violações de acessibilidade detectáveis por axe-core (FE-DEBT-04)", async () => {
    const { container } = render(<AccountCard {...base} />);
    expect(await axe(container)).toHaveNoViolations();
  });

  it("mostra badge Inativa somente quando inativa", () => {
    const { rerender } = render(<AccountCard {...base} />);
    expect(screen.queryByText("Inativa")).not.toBeInTheDocument();
    rerender(<AccountCard {...base} isActive={false} />);
    expect(screen.getByText("Inativa")).toBeInTheDocument();
  });

  it("iconChip é decorativo (aria-hidden) e usa o ícone informado", () => {
    render(<AccountCard {...base} icon="💳" />);
    const chip = screen.getByText("💳");
    expect(chip).toHaveAttribute("aria-hidden", "true");
  });

  it("Editar e Excluir disparam callbacks, como botões irmãos", async () => {
    const onEdit = vi.fn();
    const onDelete = vi.fn();
    render(<AccountCard {...base} onEdit={onEdit} onDelete={onDelete} />);
    const edit = screen.getByRole("button", { name: "Editar Nubank" });
    const del = screen.getByRole("button", { name: "Excluir Nubank" });
    expect(edit.contains(del)).toBe(false);
    await userEvent.click(edit);
    await userEvent.click(del);
    expect(onEdit).toHaveBeenCalledTimes(1);
    expect(onDelete).toHaveBeenCalledTimes(1);
  });
});
