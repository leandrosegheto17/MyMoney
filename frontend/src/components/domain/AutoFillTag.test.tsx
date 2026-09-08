import { render, screen } from "@testing-library/react";
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
