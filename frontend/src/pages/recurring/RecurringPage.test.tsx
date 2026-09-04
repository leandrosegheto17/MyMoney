import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ToastProvider } from "../../components/base/Toast";

const recurringMocks = vi.hoisted(() => ({
  listInstallmentPurchases: vi.fn(),
  createInstallmentPurchase: vi.fn(),
  updateInstallmentPurchase: vi.fn(),
  deleteInstallmentPurchase: vi.fn(),
  getInstallmentPurchasesProgress: vi.fn(),
  listRecurringTemplates: vi.fn(),
  createRecurringTemplate: vi.fn(),
  updateRecurringTemplate: vi.fn(),
  deleteRecurringTemplate: vi.fn(),
  listRecurringTemplateAdjustments: vi.fn(),
  createRecurringTemplateAdjustment: vi.fn(),
}));
vi.mock("../../lib/api/recurring", () => recurringMocks);

const accountsMocks = vi.hoisted(() => ({ listAccounts: vi.fn() }));
vi.mock("../../lib/api/accounts", () => accountsMocks);
const categoriesMocks = vi.hoisted(() => ({ listCategories: vi.fn() }));
vi.mock("../../lib/api/categories", () => categoriesMocks);
const paymentMethodsMocks = vi.hoisted(() => ({ listPaymentMethods: vi.fn() }));
vi.mock("../../lib/api/paymentMethods", () => paymentMethodsMocks);

const { RecurringPage } = await import("./RecurringPage");

const TEMPLATE = {
  id: "rt-1",
  user_id: "u1",
  description: "Academia",
  amount_cents: 15000,
  category_id: "c1",
  account_id: "a1",
  payment_method_id: "pm1",
  day_of_month: 5,
  start_date: "2026-01-01",
  end_date: null,
  created_at: "x",
  updated_at: "x",
};

function renderPage() {
  return render(
    <ToastProvider>
      <RecurringPage />
    </ToastProvider>,
  );
}

beforeEach(() => {
  Object.values(recurringMocks).forEach((mock) => mock.mockReset());
  Object.values(accountsMocks).forEach((mock) => mock.mockReset());
  Object.values(categoriesMocks).forEach((mock) => mock.mockReset());
  Object.values(paymentMethodsMocks).forEach((mock) => mock.mockReset());
  accountsMocks.listAccounts.mockResolvedValue([]);
  categoriesMocks.listCategories.mockResolvedValue([]);
  paymentMethodsMocks.listPaymentMethods.mockResolvedValue([]);
  recurringMocks.listRecurringTemplates.mockResolvedValue([TEMPLATE]);
});

describe("RecurringPage — S-REC-01/02/03/04 (FE-F2-04)", () => {
  it("RF-F2-03 AC1: reajuste exige confirmação explícita da competência antes de chamar a API", async () => {
    recurringMocks.createRecurringTemplateAdjustment.mockResolvedValue({});
    renderPage();

    await userEvent.click(await screen.findByRole("button", { name: "Reajustar valor" }));
    // Passo 1 — preenche valor e escolhe a competência.
    const dialog1 = await screen.findByRole("dialog", { name: "Reajustar valor" });
    await userEvent.click(within(dialog1).getByRole("button", { name: "Continuar" }));

    // A API NUNCA é chamada só pelo "Continuar" — exige a confirmação explícita seguinte.
    expect(recurringMocks.createRecurringTemplateAdjustment).not.toHaveBeenCalled();

    // Passo 2 — confirmação explícita mostra a competência escolhida e o aviso de RN-02.
    const confirmDialog = await screen.findByRole("dialog", { name: "Confirmar reajuste" });
    expect(within(confirmDialog).getByText(/Lançamentos já gerados em meses anteriores não mudam/)).toBeInTheDocument();
    await userEvent.click(within(confirmDialog).getByRole("button", { name: "Confirmar reajuste" }));

    await waitFor(() => expect(recurringMocks.createRecurringTemplateAdjustment).toHaveBeenCalledWith(
      expect.objectContaining({ recurring_template_id: "rt-1" }),
    ));
  });

  it("cancelar no passo de confirmação nunca aplica o reajuste (RF-F2-03 AC3)", async () => {
    renderPage();
    await userEvent.click(await screen.findByRole("button", { name: "Reajustar valor" }));
    const dialog1 = await screen.findByRole("dialog", { name: "Reajustar valor" });
    await userEvent.click(within(dialog1).getByRole("button", { name: "Cancelar" }));

    expect(recurringMocks.createRecurringTemplateAdjustment).not.toHaveBeenCalled();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("S-REC-04: encerrar preserva o histórico (RN-07) — usa end_date, nunca DELETE", async () => {
    recurringMocks.updateRecurringTemplate.mockResolvedValue({ ...TEMPLATE, end_date: "2026-09-03" });
    renderPage();

    await userEvent.click(await screen.findByRole("button", { name: "Encerrar" }));
    const dialog = await screen.findByRole("dialog", { name: "Encerrar recorrência" });
    await userEvent.click(within(dialog).getByRole("button", { name: "Encerrar" }));

    await waitFor(() => expect(recurringMocks.updateRecurringTemplate).toHaveBeenCalledWith("rt-1", expect.objectContaining({ end_date: expect.any(String) })));
    expect(recurringMocks.deleteRecurringTemplate).not.toHaveBeenCalled();
  });

  it("estado vazio: sem recorrências, mostra EmptyState (QA-F2-02)", async () => {
    recurringMocks.listRecurringTemplates.mockResolvedValue([]);
    renderPage();
    expect(await screen.findByText("Nenhuma recorrência cadastrada ainda")).toBeInTheDocument();
  });

  it("estado de carregamento: mostra Skeleton enquanto listRecurringTemplates está pendente (QA-F2-02)", async () => {
    recurringMocks.listRecurringTemplates.mockReturnValue(new Promise(() => {}));
    renderPage();
    expect(await screen.findByRole("status", { name: "Carregando recorrências" })).toBeInTheDocument();
  });

  it("estado de erro: mostra Alert quando listRecurringTemplates falha (QA-F2-02)", async () => {
    recurringMocks.listRecurringTemplates.mockRejectedValue(new Error("falhou"));
    renderPage();
    expect(await screen.findByRole("alert")).toHaveTextContent("Não foi possível carregar as recorrências.");
  });
});
