import { render, screen } from "@testing-library/react";
import { axe } from "jest-axe";
import { describe, expect, it } from "vitest";
import { ProgressBar } from "./ProgressBar";

// Num fragmenta o percentual em <span> proprio; casa o texto agregado do rotulo (mesma asserção semantica).
const textOf = (re: RegExp) => (_: string, el: Element | null) => !!el && el.className.includes("shrink-0") && re.test(el.textContent ?? "");

describe("ProgressBar — RF-MVP-07 AC2-4/RN-04 (3 estados, nunca só cor)", () => {
  it("estado normal (< 80%): sem ícone de alerta", () => {
    render(<ProgressBar label="Alimentação" pctSpent={34} alertLevel="none" />);
    expect(screen.getByRole("progressbar", { name: "Alimentação" })).toHaveAttribute("aria-valuenow", "34");
    expect(screen.getByText("34%")).toBeInTheDocument();
  });

  it("estado de alerta (>=80%): ícone + texto + cor de aviso, nunca só cor", () => {
    render(<ProgressBar label="Transporte" pctSpent={85} alertLevel="warning" />);
    expect(screen.getByText(/⚠/)).toBeInTheDocument();
    expect(screen.getByText(textOf(/85% do teto/))).toBeInTheDocument();
  });

  it("estado de estouro (>100%): severidade maior, texto/ícone diferentes do alerta", () => {
    render(<ProgressBar label="Lazer" pctSpent={120} alertLevel="exceeded" />);
    expect(screen.getByText(/⛔/)).toBeInTheDocument();
    expect(screen.getByText(textOf(/120% do teto \(estourado\)/))).toBeInTheDocument();
  });

  it("largura visual da barra nunca ultrapassa 100%, mesmo em estouro", () => {
    render(<ProgressBar label="Lazer" pctSpent={150} alertLevel="exceeded" />);
    const track = screen.getByRole("progressbar");
    const fill = track.firstElementChild as HTMLElement;
    expect(fill.style.width).toBe("100%");
  });

  it("detailText usa text-neutral-500 por padrão, mas aceita override de classe (detailTextClassName) para consumidores que mudam o fundo — achado de qualidade WCAG do BudgetCard", () => {
    const { rerender } = render(<ProgressBar label="Casa" pctSpent={50} alertLevel="none" detailText="R$ 500,00 de R$ 1.000,00" />);
    expect(screen.getByText("R$ 500,00 de R$ 1.000,00").className).toContain("text-neutral-500");

    rerender(<ProgressBar label="Casa" pctSpent={50} alertLevel="none" detailText="R$ 500,00 de R$ 1.000,00" detailTextClassName="text-neutral-600" />);
    expect(screen.getByText("R$ 500,00 de R$ 1.000,00").className).toContain("text-neutral-600");
  });

  it("estouro: aria-valuenow limitado a aria-valuemax e aria-valuetext expõe o percentual real (QA-DEBT-010)", () => {
    render(<ProgressBar label="Lazer" pctSpent={120} alertLevel="exceeded" />);
    const bar = screen.getByRole("progressbar");
    expect(bar).toHaveAttribute("aria-valuenow", "100");
    expect(bar).toHaveAttribute("aria-valuemax", "100");
    expect(bar).toHaveAttribute("aria-valuetext", "120% do orçamento utilizado");
    expect(screen.getByText(textOf(/120% do teto .estourado./))).toBeInTheDocument();
  });

  it.each([
    ["none", 34],
    ["warning", 85],
    ["exceeded", 120],
  ] as const)("axe: sem violações no nível %s", async (level, pct) => {
    const { container } = render(<ProgressBar label="Lazer" pctSpent={pct} alertLevel={level} detailText="R$ 1,00 de R$ 2,00" />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
