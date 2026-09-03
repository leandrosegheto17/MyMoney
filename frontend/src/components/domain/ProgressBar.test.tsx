import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ProgressBar } from "./ProgressBar";

describe("ProgressBar — RF-MVP-07 AC2-4/RN-04 (3 estados, nunca só cor)", () => {
  it("estado normal (< 80%): sem ícone de alerta", () => {
    render(<ProgressBar label="Alimentação" pctSpent={34} alertLevel="none" />);
    expect(screen.getByRole("progressbar", { name: "Alimentação" })).toHaveAttribute("aria-valuenow", "34");
    expect(screen.getByText("34%")).toBeInTheDocument();
  });

  it("estado de alerta (>=80%): ícone + texto + cor de aviso, nunca só cor", () => {
    render(<ProgressBar label="Transporte" pctSpent={85} alertLevel="warning" />);
    expect(screen.getByText(/⚠/)).toBeInTheDocument();
    expect(screen.getByText(/85% do teto/)).toBeInTheDocument();
  });

  it("estado de estouro (>100%): severidade maior, texto/ícone diferentes do alerta", () => {
    render(<ProgressBar label="Lazer" pctSpent={120} alertLevel="exceeded" />);
    expect(screen.getByText(/⛔/)).toBeInTheDocument();
    expect(screen.getByText(/120% do teto \(estourado\)/)).toBeInTheDocument();
  });

  it("largura visual da barra nunca ultrapassa 100%, mesmo em estouro", () => {
    render(<ProgressBar label="Lazer" pctSpent={150} alertLevel="exceeded" />);
    const track = screen.getByRole("progressbar");
    const fill = track.firstElementChild as HTMLElement;
    expect(fill.style.width).toBe("100%");
  });
});
