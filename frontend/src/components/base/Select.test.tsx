import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { Select } from "./Select";

const OPTIONS = [
  { value: "corrente", label: "Conta corrente" },
  { value: "poupanca", label: "Poupança" },
];

describe("Select", () => {
  it("associates the label and lists all options", () => {
    render(<Select label="Tipo de conta" options={OPTIONS} placeholder="Selecione" />);
    const select = screen.getByLabelText("Tipo de conta");
    expect(select).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Conta corrente" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Poupança" })).toBeInTheDocument();
  });

  it("allows selecting an option via keyboard", async () => {
    render(<Select label="Tipo de conta" options={OPTIONS} />);
    const select = screen.getByLabelText("Tipo de conta") as HTMLSelectElement;
    await userEvent.selectOptions(select, "poupanca");
    expect(select.value).toBe("poupanca");
  });

  it("marks aria-invalid when an error is present", () => {
    render(<Select label="Tipo de conta" options={OPTIONS} error="Selecione um tipo" />);
    expect(screen.getByLabelText("Tipo de conta")).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByRole("status")).toHaveTextContent("Selecione um tipo");
  });
});
