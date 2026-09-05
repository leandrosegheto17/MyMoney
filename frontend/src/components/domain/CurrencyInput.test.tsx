import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { useState } from "react";
import { CurrencyInput } from "./CurrencyInput";

function Harness({ initialCents = 0 }: { initialCents?: number }) {
  const [cents, setCents] = useState(initialCents);
  return <CurrencyInput label="Valor" valueCents={cents} onValueChange={setCents} />;
}

describe("CurrencyInput", () => {
  it("always displays the value with the R$ symbol, even when zero", () => {
    render(<Harness />);
    expect(screen.getByLabelText("Valor")).toHaveValue("R$ 0,00");
  });

  it("formats in real time as the user types digits (ATM-style mask)", async () => {
    render(<Harness />);
    const input = screen.getByLabelText("Valor");
    await userEvent.type(input, "12345");
    expect(input).toHaveValue("R$ 123,45");
  });

  it("ignores non-digit characters typed by the user", async () => {
    render(<Harness />);
    const input = screen.getByLabelText("Valor");
    await userEvent.type(input, "abc12a3");
    expect(input).toHaveValue("R$ 1,23");
  });

  it("keeps ATM-style append-to-the-right behavior even when typing with the cursor mid-string", async () => {
    render(<Harness initialCents={1234} />);
    const input = screen.getByLabelText("Valor") as HTMLInputElement;
    expect(input).toHaveValue("R$ 12,34");

    // Places the caret between "1" and "2" (an accidental click mid-value) and types a
    // digit — the ATM-style mask must still append it to the least-significant digit,
    // ignoring where the caret happens to be, instead of splicing it into the formatted
    // text at the click position.
    input.focus();
    input.setSelectionRange(4, 4);
    await userEvent.type(input, "9", { skipClick: true });

    expect(input).toHaveValue("R$ 123,49");
  });

  it("removes the least-significant digit on Backspace regardless of caret position", async () => {
    render(<Harness initialCents={1234} />);
    const input = screen.getByLabelText("Valor") as HTMLInputElement;

    input.focus();
    input.setSelectionRange(4, 4);
    await userEvent.type(input, "{Backspace}", { skipClick: true });

    expect(input).toHaveValue("R$ 1,23");
  });

  it("shows the inline validation error when the value is not positive", () => {
    render(<CurrencyInput label="Valor" valueCents={0} onValueChange={() => {}} error="Informe um valor maior que zero" />);
    expect(screen.getByLabelText("Valor")).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByRole("status")).toHaveTextContent("Informe um valor maior que zero");
  });

  it("declares w-full on its own element — UX-SPEC.md Seção 3.1.1 (FE-RS-04), never depends on the parent container's width", () => {
    render(<Harness />);
    expect(screen.getByLabelText("Valor").className).toContain("w-full");
  });
});
