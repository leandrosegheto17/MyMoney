import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ToastProvider } from "../../components/base/Toast";
import { ApiError } from "../../lib/api/errors";

const apiMocks = vi.hoisted(() => ({
  listAccounts: vi.fn(),
  createAccount: vi.fn(),
  updateAccount: vi.fn(),
  deleteAccount: vi.fn(),
  inactivateAccount: vi.fn(),
}));
vi.mock("../../lib/api/accounts", () => apiMocks);

const { AccountsPage } = await import("./AccountsPage");

const ACCOUNT = {
  id: "acc-1",
  user_id: "u1",
  name: "Conta Corrente",
  type: "checking" as const,
  currency: "BRL",
  initial_balance_cents: 10000,
  current_balance_cents: 8500,
  color: null,
  icon: null,
  is_active: true,
  created_at: "2026-09-01T00:00:00Z",
  updated_at: "2026-09-01T00:00:00Z",
};

function renderPage() {
  return render(
    <ToastProvider>
      <AccountsPage />
    </ToastProvider>,
  );
}

beforeEach(() => {
  Object.values(apiMocks).forEach((mock) => mock.mockReset());
});

describe("AccountsPage — S-ACC-01/02/04 (Padrão A/B)", () => {
  it("estado vazio: sem contas, mostra EmptyState com CTA", async () => {
    apiMocks.listAccounts.mockResolvedValue([]);
    renderPage();
    expect(await screen.findByText("Nenhuma conta cadastrada ainda")).toBeInTheDocument();
  });

  it("lista contas com saldo atual formatado em BRL", async () => {
    apiMocks.listAccounts.mockResolvedValue([ACCOUNT]);
    renderPage();
    expect(await screen.findByText("Conta Corrente")).toBeInTheDocument();
    expect(screen.getByText("R$ 85,00")).toBeInTheDocument();
  });

  it("estado de erro: falha ao carregar mostra Alert", async () => {
    apiMocks.listAccounts.mockRejectedValue(new ApiError({ message: "Não foi possível carregar as contas.", kind: "network" }));
    renderPage();
    expect(await screen.findByRole("alert")).toHaveTextContent("Não foi possível carregar");
  });

  it("cria uma nova conta com sucesso e recarrega a lista", async () => {
    apiMocks.listAccounts.mockResolvedValueOnce([]).mockResolvedValueOnce([ACCOUNT]);
    apiMocks.createAccount.mockResolvedValue(ACCOUNT);
    renderPage();
    await screen.findByText("Nenhuma conta cadastrada ainda");

    await userEvent.click(screen.getByRole("button", { name: "+ Nova conta" }));
    await userEvent.type(screen.getByLabelText("Nome", { exact: false }), "Conta Corrente");
    await userEvent.selectOptions(screen.getByLabelText("Tipo", { exact: false }), "checking");
    await userEvent.click(screen.getByRole("button", { name: "Salvar" }));

    await waitFor(() => expect(apiMocks.createAccount).toHaveBeenCalledWith(expect.objectContaining({ name: "Conta Corrente", type: "checking" })));
    expect(await screen.findByText("Conta Corrente")).toBeInTheDocument();
  });

  it("RN-08: exclusão bloqueada por vínculo oferece inativação em vez de excluir", async () => {
    apiMocks.listAccounts.mockResolvedValue([ACCOUNT]);
    apiMocks.deleteAccount.mockRejectedValue(new ApiError({ message: "conflito", kind: "conflict" }));
    apiMocks.inactivateAccount.mockResolvedValue({ ...ACCOUNT, is_active: false });
    renderPage();

    await userEvent.click(await screen.findByRole("button", { name: "Excluir" }));
    const dialogConfirm = (await screen.findAllByRole("button", { name: "Excluir" }))[1];
    await userEvent.click(dialogConfirm);

    expect(await screen.findByText(/será inativada, não excluída/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Inativar" }));
    await waitFor(() => expect(apiMocks.inactivateAccount).toHaveBeenCalledWith("acc-1"));
  });
});
