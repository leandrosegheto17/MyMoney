import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "jest-axe";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "../../lib/api/errors";

const createAccountMock = vi.fn();
vi.mock("../../lib/api/accounts", () => ({
  createAccount: (...args: unknown[]) => createAccountMock(...args),
}));

const { FirstAccountPage } = await import("./FirstAccountPage");

function renderPage() {
  return render(
    <MemoryRouter initialEntries={["/onboarding/conta"]}>
      <Routes>
        <Route path="/onboarding/conta" element={<FirstAccountPage />} />
        <Route path="/onboarding/categorias" element={<p>Tela de categorias</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  createAccountMock.mockReset();
});

describe("FirstAccountPage — S-ONB-01 (RF-MVP-01 preservado, DIR-44)", () => {
  it("renderiza título h1 e eyebrow 'Passo 1 de 2' sem text-neutral-400", () => {
    renderPage();
    expect(screen.getByRole("heading", { level: 1, name: "Vamos cadastrar sua primeira conta" })).toBeInTheDocument();
    const eyebrow = screen.getByText("Passo 1 de 2");
    expect(eyebrow.className).not.toContain("text-neutral-400");
  });

  it("mostra erros de nome/tipo obrigatórios sem chamar a API", async () => {
    renderPage();
    await userEvent.click(screen.getByRole("button", { name: "Continuar" }));
    expect(await screen.findByText("Informe um nome para a conta.")).toBeInTheDocument();
    expect(screen.getByText("Selecione o tipo da conta.")).toBeInTheDocument();
    expect(createAccountMock).not.toHaveBeenCalled();
  });

  it("cria a conta com o payload exato e navega para categorias", async () => {
    createAccountMock.mockResolvedValue({});
    renderPage();
    await userEvent.type(screen.getByLabelText(/Nome da conta/), "  Nubank ");
    await userEvent.selectOptions(screen.getByLabelText(/Tipo/), "checking");
    await userEvent.type(screen.getByLabelText(/Saldo inicial/), "1234");
    await userEvent.click(screen.getByRole("button", { name: "Continuar" }));

    await waitFor(() =>
      expect(createAccountMock).toHaveBeenCalledWith({
        name: "Nubank",
        type: "checking",
        currency: "BRL",
        initial_balance_cents: 1234,
      }),
    );
    expect(await screen.findByText("Tela de categorias")).toBeInTheDocument();
  });

  it("exibe a mensagem do ApiError e permanece na página", async () => {
    createAccountMock.mockRejectedValue(new ApiError({ message: "Nome já existe", kind: "validation", status: 400 }));
    renderPage();
    await userEvent.type(screen.getByLabelText(/Nome da conta/), "X");
    await userEvent.selectOptions(screen.getByLabelText(/Tipo/), "savings");
    await userEvent.click(screen.getByRole("button", { name: "Continuar" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Nome já existe");
    expect(screen.queryByText("Tela de categorias")).not.toBeInTheDocument();
  });

  it("mostra estado de loading e desabilita o botão durante o envio", async () => {
    createAccountMock.mockReturnValue(new Promise(() => {}));
    renderPage();
    await userEvent.type(screen.getByLabelText(/Nome da conta/), "X");
    await userEvent.selectOptions(screen.getByLabelText(/Tipo/), "wallet");
    await userEvent.click(screen.getByRole("button", { name: "Continuar" }));
    expect(await screen.findByRole("button", { name: /Criando conta/ })).toBeDisabled();
  });

  it("não tem violações axe", async () => {
    const { container } = renderPage();
    expect(await axe(container)).toHaveNoViolations();
  });
});
