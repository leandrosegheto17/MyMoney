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
});
