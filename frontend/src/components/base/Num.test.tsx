import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Num } from "./Num";

describe("Num", () => {
  it("renders format=\"currency\" from cents with the BRL symbol (formatCentsToBRL internally)", () => {
    render(<Num value={123456} format="currency" />);
    expect(screen.getByText("R$ 1.234,56")).toBeInTheDocument();
  });

  it("renders format=\"percent\" appending % to an already-calculated percentage", () => {
    render(<Num value={87} format="percent" />);
    expect(screen.getByText("87%")).toBeInTheDocument();
  });

  it("renders format=\"percent\" with decimals when requested", () => {
    render(<Num value={87.5} format="percent" decimals={1} />);
    expect(screen.getByText("87,5%")).toBeInTheDocument();
  });

  it("renders format=\"count\" as a plain integer, without monetary formatting", () => {
    render(<Num value={47} format="count" />);
    expect(screen.getByText("47")).toBeInTheDocument();
  });

  it("truncates format=\"count\" to an integer", () => {
    render(<Num value={47.9} format="count" />);
    expect(screen.getByText("47")).toBeInTheDocument();
  });

  it("always renders a single isolated node — the text content is exactly the formatted number, never concatenated with non-numeric text", () => {
    render(<Num value={9900} format="currency" />);
    const node = screen.getByText("R$ 99,00");
    expect(node.tagName).toBe("SPAN");
    expect(node.textContent).toBe("R$ 99,00");
    expect(node.childNodes).toHaveLength(1);
    expect(node.childNodes[0]?.nodeType).toBe(Node.TEXT_NODE);
  });

  it("does not accept children (TypeScript contract) — the NumProps interface has no children field", () => {
    // Compile-time guarantee: `NumProps` does not extend `PropsWithChildren`, so
    // `<Num value={1} format="count">text</Num>` fails to type-check. Documented
    // here as a runtime companion assertion that the rendered node never carries
    // more than its own formatted text.
    render(<Num value={1} format="count" />);
    const node = screen.getByText("1");
    expect(node.children).toHaveLength(0);
  });

  it("applies the Newsreader/tabular-nums typographic contract via className", () => {
    render(<Num value={1} format="count" />);
    const node = screen.getByText("1");
    expect(node.className).toContain("font-serif");
    expect(node.className).toContain("tabular-nums");
  });

  it("merges a consumer-provided className without dropping the typographic contract", () => {
    render(<Num value={1} format="count" className="text-income" />);
    const node = screen.getByText("1");
    expect(node.className).toContain("font-serif");
    expect(node.className).toContain("tabular-nums");
    expect(node.className).toContain("text-income");
  });
});
