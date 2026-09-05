import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Card } from "./Card";
import { Badge } from "./Badge";
import { Skeleton } from "./Skeleton";
import { EmptyState } from "./EmptyState";
import { Alert } from "./Alert";
import { Button } from "./Button";

describe("Card", () => {
  it("renders its content with elevation styling", () => {
    render(<Card>conteúdo</Card>);
    expect(screen.getByText("conteúdo")).toBeInTheDocument();
  });
});

describe("Badge", () => {
  it("always renders text, never color alone (WCAG - não depender só de cor)", () => {
    render(<Badge tone="warning">⚠ 82% do teto</Badge>);
    expect(screen.getByText("⚠ 82% do teto")).toBeInTheDocument();
  });

  it.each([
    ["income", "bg-income-soft"],
    ["expense", "bg-expense-soft"],
    ["warning", "bg-warning-soft"],
    ["danger", "bg-danger-soft"],
    ["primary", "bg-primary-soft"],
  ] as const)(
    "uses the -soft design-system token for tone=%s, never the raw Tailwind ramp (FE-RS-14, UX-03 Achado 1)",
    (tone, expectedClass) => {
      render(<Badge tone={tone}>status</Badge>);
      const badge = screen.getByText("status");
      expect(badge.className).toContain(expectedClass);
      expect(badge.className).not.toMatch(/bg-(red|green|amber|blue)-\d{2,3}/);
    },
  );
});

describe("Skeleton", () => {
  it("communicates loading state to assistive tech", () => {
    render(<Skeleton aria-label="Carregando lançamentos" />);
    expect(screen.getByRole("status", { name: "Carregando lançamentos" })).toBeInTheDocument();
  });
});

describe("EmptyState", () => {
  it("renders title, description and CTA action", () => {
    render(
      <EmptyState
        title="Nenhuma conta cadastrada ainda"
        description="Cadastre sua primeira conta para começar"
        action={<Button>Cadastrar</Button>}
      />,
    );
    expect(screen.getByText("Nenhuma conta cadastrada ainda")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cadastrar" })).toBeInTheDocument();
  });
});

describe("Alert", () => {
  it("uses role=alert and assertive live region for danger variant", () => {
    render(<Alert variant="danger">Não foi possível carregar. Tentar novamente</Alert>);
    const alert = screen.getByRole("alert");
    expect(alert).toHaveAttribute("aria-live", "assertive");
    expect(alert).toHaveTextContent("Não foi possível carregar. Tentar novamente");
  });

  it("uses role=status for informational variant", () => {
    render(<Alert variant="info">Sincronizado agora</Alert>);
    expect(screen.getByRole("status")).toHaveTextContent("Sincronizado agora");
  });

  it.each([
    ["info", "bg-primary-soft"],
    ["warning", "bg-warning-soft"],
    ["danger", "bg-danger-soft"],
    ["success", "bg-income-soft"],
  ] as const)(
    "uses the -soft design-system token for variant=%s, never the raw Tailwind ramp (FE-RS-14, UX-03 Achado 1)",
    (variant, expectedClass) => {
      render(<Alert variant={variant}>mensagem</Alert>);
      const alert = screen.getByRole(variant === "warning" || variant === "danger" ? "alert" : "status");
      expect(alert.className).toContain(expectedClass);
      expect(alert.className).not.toMatch(/bg-(red|green|amber|blue)-\d{2,3}/);
    },
  );

  it("renders a real v2.0 (terracota) danger palette, not the generic Tailwind red, when used in a CRUD screen error state (ex. AccountsPage)", () => {
    render(<Alert variant="danger">Não foi possível carregar as contas</Alert>);
    const alert = screen.getByRole("alert");
    expect(alert.className).toContain("bg-danger-soft");
    expect(alert.className).not.toContain("bg-red-50");
  });
});
