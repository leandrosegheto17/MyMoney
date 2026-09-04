import { render, screen } from "@testing-library/react";
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

const { InstallmentsPage } = await import("./InstallmentsPage");

function renderPage() {
  return render(
    <ToastProvider>
      <InstallmentsPage />
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
});

describe("InstallmentsPage — S-INST-01/02 (FE-F2-03)", () => {
  it('exibe "Parcela X de N" literal, não percentual genérico (AC literal)', async () => {
    recurringMocks.listInstallmentPurchases.mockResolvedValue([
      { id: "ip-1", user_id: "u1", description: "Notebook", total_amount_cents: 600000, installments_count: 12, category_id: "c1", account_id: "a1", payment_method_id: "pm1", purchase_date: "2026-06-01", created_at: "x", updated_at: "x" },
    ]);
    recurringMocks.getInstallmentPurchasesProgress.mockResolvedValue([
      { installment_purchase_id: "ip-1", description: "Notebook", installments_count: 12, generated_count: 4, remaining_count: 8 },
    ]);
    renderPage();

    expect(await screen.findByText("Parcela 4 de 12")).toBeInTheDocument();
    // Nunca deve haver "%" na linha de progresso (semântica de contagem, não percentual).
    expect(screen.queryByText(/33%/)).not.toBeInTheDocument();
  });

  it("estado vazio: sem compras parceladas, mostra EmptyState", async () => {
    recurringMocks.listInstallmentPurchases.mockResolvedValue([]);
    recurringMocks.getInstallmentPurchasesProgress.mockResolvedValue([]);
    renderPage();
    expect(await screen.findByText("Nenhuma compra parcelada ainda")).toBeInTheDocument();
  });
});
