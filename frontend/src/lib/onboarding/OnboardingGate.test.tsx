import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

const listAccountsMock = vi.fn();
vi.mock("../api/accounts", () => ({ listAccounts: () => listAccountsMock() }));

const { OnboardingGate } = await import("./OnboardingGate");

function renderApp(initialPath = "/") {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route element={<OnboardingGate />}>
          <Route path="/" element={<p>App autenticado</p>} />
        </Route>
        <Route path="/onboarding/conta" element={<p>Onboarding: primeira conta</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  listAccountsMock.mockReset();
});

describe("OnboardingGate — UX-FL-11 (RF-MVP-01 pré-requisito estrutural)", () => {
  it("sem conta cadastrada, redireciona para o onboarding em vez de mostrar o app", async () => {
    listAccountsMock.mockResolvedValue([]);
    renderApp();
    expect(await screen.findByText("Onboarding: primeira conta")).toBeInTheDocument();
  });

  it("com ao menos 1 conta cadastrada, mostra o conteúdo autenticado normalmente", async () => {
    listAccountsMock.mockResolvedValue([{ id: "acc-1" }]);
    renderApp();
    expect(await screen.findByText("App autenticado")).toBeInTheDocument();
  });

  it("falha ao checar contas não prende o usuário numa tela infinita — segue para o app", async () => {
    listAccountsMock.mockRejectedValue(new Error("rede indisponível"));
    renderApp();
    expect(await screen.findByText("App autenticado")).toBeInTheDocument();
  });
});
