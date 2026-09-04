import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ToastProvider } from "../../components/base/Toast";

const creditCardsMocks = vi.hoisted(() => ({
  listCreditCards: vi.fn(),
  createCreditCard: vi.fn(),
  updateCreditCard: vi.fn(),
  deleteCreditCard: vi.fn(),
  getCreditCardPaymentMethod: vi.fn(),
  listInvoicesByCard: vi.fn(),
  getCreditCardsAvailableLimit: vi.fn(),
}));
vi.mock("../../lib/api/creditCards", () => creditCardsMocks);

const categoriesMocks = vi.hoisted(() => ({ listCategories: vi.fn() }));
vi.mock("../../lib/api/categories", () => categoriesMocks);

const transactionsMocks = vi.hoisted(() => ({ listTransactions: vi.fn() }));
vi.mock("../../lib/api/transactions", () => transactionsMocks);

const { CreditCardsPage } = await import("./CreditCardsPage");

const CARD = {
  id: "card-1",
  user_id: "u1",
  name: "Nubank",
  limit_cents: 500000,
  closing_day: 10,
  due_day: 17,
  is_active: true,
  created_at: "2026-09-01T00:00:00Z",
  updated_at: "2026-09-01T00:00:00Z",
};

function renderPage() {
  return render(
    <ToastProvider>
      <CreditCardsPage />
    </ToastProvider>,
  );
}

beforeEach(() => {
  Object.values(creditCardsMocks).forEach((mock) => mock.mockReset());
  Object.values(categoriesMocks).forEach((mock) => mock.mockReset());
  Object.values(transactionsMocks).forEach((mock) => mock.mockReset());
  creditCardsMocks.getCreditCardsAvailableLimit.mockResolvedValue([]);
  categoriesMocks.listCategories.mockResolvedValue([]);
  transactionsMocks.listTransactions.mockResolvedValue([]);
});

describe("CreditCardsPage — S-CARD-01/02/03 (FE-F2-01/02)", () => {
  it("estado vazio: sem cartões, mostra EmptyState com CTA", async () => {
    creditCardsMocks.listCreditCards.mockResolvedValue([]);
    renderPage();
    expect(await screen.findByText("Nenhum cartão cadastrado ainda")).toBeInTheDocument();
  });

  it("lista cartão com limite, dia de fechamento e vencimento (RF-F2-01 AC1)", async () => {
    creditCardsMocks.listCreditCards.mockResolvedValue([CARD]);
    creditCardsMocks.getCreditCardsAvailableLimit.mockResolvedValue([
      { credit_card_id: "card-1", name: "Nubank", limit_cents: 500000, committed_cents: 100000, available_cents: 400000 },
    ]);
    renderPage();
    expect(await screen.findByText("Nubank")).toBeInTheDocument();
    expect(screen.getByText("Fecha dia 10 · Vence dia 17")).toBeInTheDocument();
    expect(screen.getByText(/Disponível: R\$ 4\.000,00 de R\$ 5\.000,00/)).toBeInTheDocument();
  });

  it("S-CARD-03: abre a fatura do cartão e mostra o limite disponível sempre visível (RN-06)", async () => {
    creditCardsMocks.listCreditCards.mockResolvedValue([CARD]);
    creditCardsMocks.getCreditCardsAvailableLimit.mockResolvedValue([
      { credit_card_id: "card-1", name: "Nubank", limit_cents: 500000, committed_cents: 100000, available_cents: 400000 },
    ]);
    creditCardsMocks.listInvoicesByCard.mockResolvedValue([
      { id: "inv-1", user_id: "u1", credit_card_id: "card-1", competencia: `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}-01`, status: "aberta", created_at: "x", updated_at: "x" },
    ]);
    renderPage();
    await userEvent.click(await screen.findByText("Nubank"));

    expect(await screen.findByText("Limite disponível")).toBeInTheDocument();
    expect(await screen.findByText("Fatura Atual")).toBeInTheDocument();
    expect(await screen.findByText("Aberta")).toBeInTheDocument();
  });

  it("cria um novo cartão com sucesso", async () => {
    creditCardsMocks.listCreditCards.mockResolvedValueOnce([]).mockResolvedValueOnce([CARD]);
    creditCardsMocks.createCreditCard.mockResolvedValue(CARD);
    renderPage();
    await screen.findByText("Nenhum cartão cadastrado ainda");

    await userEvent.click(screen.getByRole("button", { name: "+ Novo cartão" }));
    await userEvent.type(screen.getByLabelText("Nome", { exact: false }), "Nubank");
    await userEvent.type(screen.getByLabelText("Limite (R$)", { exact: false }), "5000");
    await userEvent.type(screen.getByLabelText("Dia de fechamento", { exact: false }), "10");
    await userEvent.type(screen.getByLabelText("Dia de vencimento", { exact: false }), "17");
    await userEvent.click(screen.getByRole("button", { name: "Salvar" }));

    await waitFor(() => expect(creditCardsMocks.createCreditCard).toHaveBeenCalledWith(expect.objectContaining({ name: "Nubank", closing_day: 10, due_day: 17 })));
  });
});
