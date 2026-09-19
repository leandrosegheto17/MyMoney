import { render, screen } from "@testing-library/react";
import { axe } from "jest-axe";
import { describe, expect, it } from "vitest";
import { AuthCard, AuthLayout } from "./index";

describe("AuthCard", () => {
  it("renders all slots with a single h1", () => {
    render(
      <AuthCard eyebrow="Passo 1 de 2" title="Criar PIN" description="Escolha 6 dígitos" footer={<a href="/x">Voltar</a>}>
        <p>corpo</p>
      </AuthCard>,
    );
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(screen.getByRole("heading", { level: 1, name: "Criar PIN" })).toBeInTheDocument();
    expect(screen.getByText("Passo 1 de 2")).toHaveClass("text-neutral-600");
    expect(screen.getByText("Escolha 6 dígitos")).toBeInTheDocument();
    expect(screen.getByText("corpo")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Voltar" })).toBeInTheDocument();
  });

  it("does not render empty nodes for omitted optional slots", () => {
    const { container } = render(<AuthCard title="Entrar">x</AuthCard>);
    expect(container.querySelector("footer")).toBeNull();
    expect(container.querySelectorAll("p")).toHaveLength(0);
    expect(screen.queryByText("Passo 1 de 2")).toBeNull();
  });

  it("applies size and align", () => {
    const { container, rerender } = render(<AuthCard title="T">x</AuthCard>);
    expect(container.firstElementChild).toHaveClass("max-w-sm");
    expect(container.firstElementChild).toHaveClass("text-left");
    rerender(
      <AuthCard title="T" size="md" align="center">
        x
      </AuthCard>,
    );
    expect(container.firstElementChild).toHaveClass("max-w-md");
    expect(container.firstElementChild).toHaveClass("text-center");
  });

  it("uses tokens only", () => {
    const { container } = render(<AuthCard title="T">x</AuthCard>);
    expect(container.innerHTML).not.toMatch(/#[0-9a-f]{3,6}|shadow-elevation-md|neutral-400/i);
  });

  it("has no axe violations inside AuthLayout", async () => {
    const { container } = render(
      <AuthLayout>
        <AuthCard eyebrow="Passo 1 de 2" title="Entrar" description="d" footer={<a href="/x">Esqueci</a>}>
          <button type="button">Ok</button>
        </AuthCard>
      </AuthLayout>,
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
