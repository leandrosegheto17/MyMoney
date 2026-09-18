import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "jest-axe";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ToastProvider } from "../../components/base/Toast";

const creditCardsMocks = vi.hoisted(() => ({
  listCreditCards: vi.fn(),
  createCreditCard: vi.fn(),
  updateCreditCard: vi.fn(),
  deleteCreditCard: vi.fn(),
  getCreditCardPaymentMethod: vi.fn(),
  listInvoicesByCard: vi.fn(),
  listInvoicesByCards: vi.fn(),
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
    expect(screen.getByText(/^vence \d{2}\/\d{2}$/)).toBeInTheDocument();
    expect(screen.getByText(/^Disponível:/)).toHaveTextContent(/Disponível: R\$\s4\.000,00/);
  });

  it("RF-RS-03: grade grid-cols-2, fatura atual em destaque e limite usado com percentual e valor separados", async () => {
    const competencia = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}-01`;
    creditCardsMocks.listCreditCards.mockResolvedValue([CARD]);
    creditCardsMocks.getCreditCardsAvailableLimit.mockResolvedValue([
      { credit_card_id: "card-1", name: "Nubank", limit_cents: 500000, committed_cents: 100000, available_cents: 400000 },
    ]);
    creditCardsMocks.listInvoicesByCards.mockResolvedValue([
      { id: "inv-1", user_id: "u1", credit_card_id: "card-1", competencia, status: "aberta", created_at: "x", updated_at: "x" },
    ]);
    transactionsMocks.listTransactions.mockResolvedValue([
      { id: "t1", card_invoice_id: "inv-1", amount_cents: 12345 },
      { id: "t2", card_invoice_id: "outra", amount_cents: 999 },
    ]);
    const { container } = renderPage();
    expect(await screen.findByText("Fatura atual")).toBeInTheDocument();
    expect(await screen.findByText("R$ 123,45")).toBeInTheDocument();
    expect(creditCardsMocks.listInvoicesByCards).toHaveBeenCalledTimes(1);
    expect(transactionsMocks.listTransactions).toHaveBeenCalledWith({ cardInvoiceIds: ["inv-1"] });
    expect(screen.getByRole("button", { name: "Editar Nubank" })).toBeInTheDocument();
    expect(container.querySelector("ul")?.className).toContain("md:grid-cols-2");
    expect(screen.getByTestId("limit-used-percent")).toHaveTextContent("20%");
    expect(screen.getByTestId("limit-total")).toHaveTextContent("R$ 5.000,00");
    expect(screen.getByRole("progressbar", { name: /Limite usado de Nubank/ })).toHaveAttribute("aria-valuenow", "20");
  });

  it("não tem violações de acessibilidade detectáveis por axe-core (FE-DEBT-04)", async () => {
    creditCardsMocks.listCreditCards.mockResolvedValue([CARD]);
    creditCardsMocks.listInvoicesByCards.mockResolvedValue([]);
    const { container } = renderPage();
    await screen.findByText("Nubank");
    expect(await axe(container)).toHaveNoViolations();
  });

  it("falha ao carregar faturas não derruba a lista (melhor esforço)", async () => {
    creditCardsMocks.listCreditCards.mockResolvedValue([CARD]);
    creditCardsMocks.listInvoicesByCards.mockRejectedValue(new Error("x"));
    renderPage();
    expect(await screen.findByText("Nubank")).toBeInTheDocument();
    expect(screen.queryByText("Fatura atual")).not.toBeInTheDocument();
  });

  it("DET-14: campo Limite (R$) usa CurrencyInput (máscara BRL), não input type=number", async () => {
    creditCardsMocks.listCreditCards.mockResolvedValue([]);
    renderPage();
    await screen.findByText("Nenhum cartão cadastrado ainda");
    await userEvent.click(screen.getByRole("button", { name: "+ Novo cartão" }));
    const field = screen.getByLabelText("Limite (R$)", { exact: false }) as HTMLInputElement;
    expect(field.type).not.toBe("number");
    await userEvent.type(field, "500000");
    expect(field.value).toMatch(/5\.000,00/);
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

  it("estado de carregamento: mostra Skeleton enquanto listCreditCards está pendente (QA-F2-02)", async () => {
    creditCardsMocks.listCreditCards.mockReturnValue(new Promise(() => {}));
    renderPage();
    expect(await screen.findByRole("status", { name: "Carregando cartões" })).toBeInTheDocument();
  });

  it("estado de erro: mostra Alert quando listCreditCards falha (QA-F2-02)", async () => {
    creditCardsMocks.listCreditCards.mockRejectedValue(new Error("falhou"));
    renderPage();
    expect(await screen.findByRole("alert")).toHaveTextContent("Não foi possível carregar os cartões.");
  });
});
