import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ShortcutBar } from "./ShortcutBar";
import type { ShortcutBarItem } from "./ShortcutBar";

const ALIMENTACAO: ShortcutBarItem = { categoryId: "cat-1", label: "Alimentação", icon: "🍔", paymentMethodId: "pm-1", kind: "expense" };
const TRANSPORTE: ShortcutBarItem = { categoryId: "cat-2", label: "Transporte", icon: "🚌", paymentMethodId: null, kind: "expense" };

describe("ShortcutBar — S-TXN-01 (RF-REF-03 AC1/AC2, UX-SPEC Seção 4.2)", () => {
  it("carregando: exibe skeleton de pílulas e nenhum chip", () => {
    render(<ShortcutBar isLoading items={[]} onSelect={vi.fn()} />);
    expect(screen.getByRole("status", { name: "Carregando atalhos de lançamento" })).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("AC2 — histórico vazio (0 atalhos): barra é omitida por completo, não renderiza EmptyState nem contêiner vazio", () => {
    const { container } = render(<ShortcutBar isLoading={false} items={[]} onSelect={vi.fn()} />);
    expect(container).toBeEmptyDOMElement();
    expect(screen.queryByRole("group", { name: "Atalhos de lançamento rápido" })).not.toBeInTheDocument();
  });

  it("AC1 — com atalhos: renderiza um ShortcutChip por item, com aria-label combinando ação + subcategoria (UX-SPEC Seção 5)", () => {
    render(<ShortcutBar isLoading={false} items={[ALIMENTACAO, TRANSPORTE]} onSelect={vi.fn()} />);
    // Ícone é `aria-hidden` (só reforço visual); o texto visível sozinho não descreve a
    // ação para leitor de tela — nome acessível vem do `aria-label` explícito do chip.
    expect(screen.getByRole("button", { name: "Lançar em Alimentação" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Lançar em Transporte" })).toBeInTheDocument();
  });

  it("clique em um chip invoca onSelect com o item completo (categoryId, forma de pagamento, tipo)", async () => {
    const onSelect = vi.fn();
    render(<ShortcutBar isLoading={false} items={[ALIMENTACAO]} onSelect={onSelect} />);
    await userEvent.click(screen.getByRole("button", { name: "Lançar em Alimentação" }));
    expect(onSelect).toHaveBeenCalledWith(ALIMENTACAO);
  });
});
