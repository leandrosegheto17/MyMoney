import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { GoalProgressBar } from "./GoalProgressBar";

describe("GoalProgressBar — S-GOAL-04 (QA-DEBT-016)", () => {
  it("em progresso: aria-valuenow reflete o percentual, sem aria-valuetext", () => {
    render(<GoalProgressBar label="Viagem" currentAmountCents={50000} targetAmountCents={100000} pctProgress={50} />);
    const bar = screen.getByRole("progressbar", { name: "Viagem" });
    expect(bar).toHaveAttribute("aria-valuenow", "50");
    expect(bar).not.toHaveAttribute("aria-valuetext");
    expect(screen.getByText(/50% da meta/)).toBeInTheDocument();
  });

  it("estouro (>100%): aria-valuenow limitado a aria-valuemax e aria-valuetext expõe o percentual real", () => {
    render(<GoalProgressBar label="Viagem" currentAmountCents={120000} targetAmountCents={100000} pctProgress={120} />);
    const bar = screen.getByRole("progressbar", { name: "Viagem" });
    expect(bar).toHaveAttribute("aria-valuenow", "100");
    expect(bar).toHaveAttribute("aria-valuemax", "100");
    expect(bar).toHaveAttribute("aria-valuetext", "120% da meta atingido");
    expect(screen.getByText(/120% concluída/)).toBeInTheDocument();
  });
});
