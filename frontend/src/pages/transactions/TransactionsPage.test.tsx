import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ToastProvider } from "../../components/base/Toast";
import { ApiError } from "../../lib/api/errors";
import { offlineDb } from "../../lib/offline/db";
import { currentMonthRange } from "../../lib/date";

const accountsMock = vi.hoisted(() => ({ listAccounts: vi.fn() }));
vi.mock("../../lib/api/accounts", () => accountsMock);
const paymentMethodsMock = vi.hoisted(() => ({ listPaymentMethods: vi.fn() }));
vi.mock("../../lib/api/paymentMethods", () => paymentMethodsMock);
const categoriesMock = vi.hoisted(() => ({ listCategories: vi.fn(), listTransactionsByCategory: vi.fn() }));
vi.mock("../../lib/api/categories", () => categoriesMock);
const transactionsMock = vi.hoisted(() => ({ listTransactions: vi.fn(), createTransaction: vi.fn(), updateTransaction: vi.fn(), deleteTransaction: vi.fn() }));
vi.mock("../../lib/api/transactions", () => transactionsMock);

const { TransactionsPage } = await import("./TransactionsPage");

const ACCOUNT = { id: "acc-1", name: "Conta Corrente", type: "checking", currency: "BRL", initial_balance_cents: 0, current_balance_cents: 0, is_active: true } as const;
const PAYMENT_METHOD = { id: "pm-1", name: "Pix", type: "pix", is_active: true, is_system_default: true, account_id: null, credit_card_id: null } as const;
const CATEGORY = { id: "cat-1", name: "Mercado", kind: "expense", parent_category_id: null, is_system_default: true } as const;
const TRANSACTION = {
  id: "txn-1",
  user_id: "u1",
  account_id: "acc-1",
  destination_account_id: null,
  payment_method_id: "pm-1",
  category_id: "cat-1",
  kind: "expense" as const,
  amount_cents: 4500,
  description: "Compras da semana",
  transaction_date: "2026-09-02",
  status: "cleared" as const,
  source: "manual" as const,
  created_at: "2026-09-02T10:00:00Z",
  updated_at: "2026-09-02T10:00:00Z",
};

function renderPage() {
  return render(
    <MemoryRouter>
      <ToastProvider>
        <TransactionsPage />
      </ToastProvider>
    </MemoryRouter>,
  );
}

beforeEach(async () => {
  Object.values(accountsMock).forEach((m) => m.mockReset());
  Object.values(paymentMethodsMock).forEach((m) => m.mockReset());
  Object.values(categoriesMock).forEach((m) => m.mockReset());
  Object.values(transactionsMock).forEach((m) => m.mockReset());
  accountsMock.listAccounts.mockResolvedValue([ACCOUNT]);
  paymentMethodsMock.listPaymentMethods.mockResolvedValue([PAYMENT_METHOD]);
  categoriesMock.listCategories.mockResolvedValue([CATEGORY]);
  await offlineDb.pendingTransactions.clear();
});

describe("TransactionsPage — S-TXN-01/02 (RF-MVP-04 AC5)", () => {
  it("busca o mês corrente por padrão", async () => {
    transactionsMock.listTransactions.mockResolvedValue([]);
    renderPage();
    await waitFor(() => expect(transactionsMock.listTransactions).toHaveBeenCalled());
    const range = currentMonthRange();
    expect(transactionsMock.listTransactions).toHaveBeenCalledWith(expect.objectContaining({ fromDate: range.from, toDate: range.to }));
  });

  it("estado vazio: nenhum lançamento no período", async () => {
    transactionsMock.listTransactions.mockResolvedValue([]);
    renderPage();
    expect(await screen.findByText("Nenhum lançamento neste período")).toBeInTheDocument();
  });

  it("lista lançamentos agrupados por dia, com valor formatado e seta de saída", async () => {
    transactionsMock.listTransactions.mockResolvedValue([TRANSACTION]);
    renderPage();
    expect(await screen.findByText("Compras da semana")).toBeInTheDocument();
    expect(screen.getByText(/↓ R\$ 45,00/)).toBeInTheDocument();
  });

  it("falha de rede ao salvar um novo lançamento cai para a fila offline (DIR-11) em vez de perder o dado", async () => {
    transactionsMock.listTransactions.mockResolvedValue([]);
    transactionsMock.createTransaction.mockRejectedValue(new ApiError({ message: "offline", kind: "network" }));
    renderPage();
    await screen.findByText("Nenhum lançamento neste período");

    await userEvent.click(screen.getAllByRole("button", { name: "+ Novo lançamento" })[0]);
    const dialog = within(screen.getByRole("dialog"));
    await userEvent.selectOptions(dialog.getByLabelText("Conta", { exact: false }), "acc-1");
    await userEvent.selectOptions(dialog.getByLabelText("Forma de pagamento", { exact: false }), "pm-1");
    await userEvent.selectOptions(dialog.getByLabelText(/^Categoria/), "cat-1");
    await userEvent.type(dialog.getByLabelText("Valor", { exact: false }), "4500");
    await userEvent.click(dialog.getByRole("button", { name: "Salvar" }));

    expect(await screen.findByText(/Sem conexão/)).toBeInTheDocument();
    await waitFor(async () => expect(await offlineDb.pendingTransactions.count()).toBe(1));
  });
});
