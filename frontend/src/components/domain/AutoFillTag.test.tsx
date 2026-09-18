import { render, screen } from "@testing-library/react";
import { axe } from "jest-axe";
import { describe, expect, it } from "vitest";
import { AutoFillAttentionHint, AutoFillTag } from "./AutoFillTag";

describe("AutoFillTag / AutoFillAttentionHint — S-CAP-03/S-CAP-05 (FE-F3-04)", () => {
  it("AutoFillTag exibe o selo '✨ sugerido' (RF-F3-01 AC3)", () => {
    render(<AutoFillTag />);
    expect(screen.getByText("✨ sugerido")).toBeInTheDocument();
  });

  it("AutoFillAttentionHint exibe o indicador de atenção '⚠ preencha' (RF-F3-02 AC3)", () => {
    render(<AutoFillAttentionHint />);
    expect(screen.getByText("⚠ preencha")).toBeInTheDocument();
  });
});

describe("AutoFillTag / AutoFillAttentionHint — acessibilidade WCAG 2.1 AA (QA-F3-02)", () => {
  it("AutoFillTag não tem violações de acessibilidade detectáveis por axe-core", async () => {
    const { container } = render(<AutoFillTag />);
    expect(await axe(container)).toHaveNoViolations();
  });

  it("AutoFillAttentionHint não tem violações de acessibilidade detectáveis por axe-core", async () => {
    const { container } = render(<AutoFillAttentionHint />);
    expect(await axe(container)).toHaveNoViolations();
  });

  it("AutoFillAttentionHint (achado corrigido): contraste de '⚠ preencha' atinge 4,5:1 (WCAG 1.4.3) contra branco e contra o fundo neutral-50 do app — text-warning original (#b9862f) ficava em ~3,2:1", () => {
    render(<AutoFillAttentionHint />);
    const hint = screen.getByText("⚠ preencha");
    // A cor aplicada não é mais o token compartilhado `text-warning` (usado por
    // outros componentes fora do escopo desta tarefa) — é uma cor escopada só a
    // este componente, escolhida para atingir >= 4,5:1 nos dois fundos em que
    // aparece (branco e `--color-neutral-50` / `#faf8f3`).
    expect(hint.className).not.toMatch(/\btext-warning\b/);
    expect(hint.className).toMatch(/text-\[#946b26\]/);
  });
});
