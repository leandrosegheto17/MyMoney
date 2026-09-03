import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { Input } from "./Input";

describe("Input", () => {
  it("associates the label programmatically", () => {
    render(<Input label="Descrição" />);
    expect(screen.getByLabelText("Descrição")).toBeInTheDocument();
  });

  it("accepts typed input", async () => {
    render(<Input label="Descrição" />);
    const input = screen.getByLabelText("Descrição");
    await userEvent.type(input, "Mercado");
    expect(input).toHaveValue("Mercado");
  });

  it("shows helper text via aria-describedby", () => {
    render(<Input label="Valor" helperText="Use ponto para centavos" />);
    const input = screen.getByLabelText("Valor");
    expect(input).toHaveAccessibleDescription("Use ponto para centavos");
  });

  it("marks aria-invalid and announces the error via a polite live region", () => {
    render(<Input label="Valor" error="Campo obrigatório" />);
    const input = screen.getByLabelText("Valor");
    expect(input).toHaveAttribute("aria-invalid", "true");
    const status = screen.getByRole("status");
    expect(status).toHaveTextContent("Campo obrigatório");
    expect(status).toHaveAttribute("aria-live", "polite");
  });
});
