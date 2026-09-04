import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ToastProvider } from "../../components/base/Toast";

const fixedBillsMocks = vi.hoisted(() => ({
  listFixedBills: vi.fn(),
  createFixedBill: vi.fn(),
  updateFixedBill: vi.fn(),
  deleteFixedBill: vi.fn(),
  getFixedBillsStatus: vi.fn(),
  markFixedBillTransactionAsPaid: vi.fn(),
}));
vi.mock("../../lib/api/fixedBills", () => fixedBillsMocks);

const accountsMocks = vi.hoisted(() => ({ listAccounts: vi.fn() }));
vi.mock("../../lib/api/accounts", () => accountsMocks);
const categoriesMocks = vi.hoisted(() => ({ listCategories: vi.fn() }));
vi.mock("../../lib/api/categories", () => categoriesMocks);
const paymentMethodsMocks = vi.hoisted(() => ({ listPaymentMethods: vi.fn() }));
vi.mock("../../lib/api/paymentMethods", () => paymentMethodsMocks);

const { FixedBillsPage } = await import("./FixedBillsPage");

const BILL = {
  id: "fb-1",
  user_id: "u1",
  description: "Aluguel",
  amount_cents: 150000,
  category_id: "c1",
  account_id: "a1",
  payment_method_id: "pm1",
  due_day: 5,
  alert_days_before: 3,
  start_date: "2026-01-01",
  end_date: null,
  created_at: "x",
  updated_at: "x",
};

function renderPage() {
  return render(
    <ToastProvider>
      <FixedBillsPage />
    </ToastProvider>,
  );
}

beforeEach(() => {
  Object.values(fixedBillsMocks).forEach((mock) => mock.mockReset());
  Object.values(accountsMocks).forEach((mock) => mock.mockReset());
  Object.values(categoriesMocks).forEach((mock) => mock.mockReset());
  Object.values(paymentMethodsMocks).forEach((mock) => mock.mockReset());
  accountsMocks.listAccounts.mockResolvedValue([]);
  categoriesMocks.listCategories.mockResolvedValue([]);
  paymentMethodsMocks.listPaymentMethods.mockResolvedValue([]);
  fixedBillsMocks.listFixedBills.mockResolvedValue([BILL]);
});

describe("FixedBillsPage — S-FIX-01/02/03 (FE-F2-05)", () => {
  it('badge "Vencida" reflete is_overdue calculado pelo servidor, sem recálculo no client (DIR-06)', async () => {
    fixedBillsMocks.getFixedBillsStatus.mockResolvedValue([
      { fixed_bill_id: "fb-1", description: "Aluguel", amount_cents: 150000, due_day: 5, current_transaction_id: "t1", current_due_date: "2026-08-05", current_status: "pending", is_overdue: true },
    ]);
    renderPage();
    expect(await screen.findByText("Vencida")).toBeInTheDocument();
  });

  it('badge "Paga" quando current_status = cleared, mesmo que a data já tenha passado', async () => {
    fixedBillsMocks.getFixedBillsStatus.mockResolvedValue([
      { fixed_bill_id: "fb-1", description: "Aluguel", amount_cents: 150000, due_day: 5, current_transaction_id: "t1", current_due_date: "2026-08-05", current_status: "cleared", is_overdue: false },
    ]);
    renderPage();
    expect(await screen.findByText("Paga")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Marcar como paga" })).not.toBeInTheDocument();
  });

  it('badge "Pendente" quando ainda não venceu', async () => {
    fixedBillsMocks.getFixedBillsStatus.mockResolvedValue([
      { fixed_bill_id: "fb-1", description: "Aluguel", amount_cents: 150000, due_day: 5, current_transaction_id: "t1", current_due_date: "2026-09-05", current_status: "pending", is_overdue: false },
    ]);
    renderPage();
    expect(await screen.findByText("Pendente")).toBeInTheDocument();
  });

  it('"Marcar como paga" chama markFixedBillTransactionAsPaid com o id do lançamento gerado (RF-F2-06 AC2)', async () => {
    fixedBillsMocks.getFixedBillsStatus.mockResolvedValue([
      { fixed_bill_id: "fb-1", description: "Aluguel", amount_cents: 150000, due_day: 5, current_transaction_id: "t1", current_due_date: "2026-09-05", current_status: "pending", is_overdue: false },
    ]);
    fixedBillsMocks.markFixedBillTransactionAsPaid.mockResolvedValue(undefined);
    renderPage();

    await userEvent.click(await screen.findByRole("button", { name: "Marcar como paga" }));
    await waitFor(() => expect(fixedBillsMocks.markFixedBillTransactionAsPaid).toHaveBeenCalledWith("t1"));
  });
});
