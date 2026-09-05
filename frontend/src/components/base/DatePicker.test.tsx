import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { DatePicker } from "./DatePicker";

describe("DatePicker", () => {
  it("associates the label and accepts a date value", () => {
    render(<DatePicker label="Data" />);
    const input = screen.getByLabelText("Data") as HTMLInputElement;
    expect(input).toHaveAttribute("type", "date");
    fireEvent.change(input, { target: { value: "2026-09-02" } });
    expect(input).toHaveValue("2026-09-02");
  });

  it("marks aria-invalid when there is an error", () => {
    render(<DatePicker label="Data" error="Data inválida" />);
    expect(screen.getByLabelText("Data")).toHaveAttribute("aria-invalid", "true");
  });

  it("declares w-full on its own element — UX-SPEC.md Seção 3.1.1 (FE-RS-04), never depends on the parent container's width", () => {
    render(<DatePicker label="Data" />);
    expect(screen.getByLabelText("Data").className).toContain("w-full");
  });
});
