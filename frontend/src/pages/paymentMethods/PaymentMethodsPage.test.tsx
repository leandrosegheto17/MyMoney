import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ToastProvider } from "../../components/base/Toast";

const apiMocks = vi.hoisted(() => ({
  listPaymentMethods: vi.fn(),
  createPaymentMethod: vi.fn(),
  deletePaymentMethod: vi.fn(),
}));
vi.mock("../../lib/api/paymentMethods", () => apiMocks);

const { PaymentMethodsPage } = await import("./PaymentMethodsPage");

const DEFAULT_METHOD = {
  id: "pm-1",
  user_id: "u1",
  account_id: null,
  credit_card_id: null,
  type: "pix" as const,
  name: "Pix",
  is_active: true,
  is_system_default: true,
  created_at: "2026-09-01T00:00:00Z",
  updated_at: "2026-09-01T00:00:00Z",
};
const CUSTOM_METHOD = { ...DEFAULT_METHOD, id: "pm-2", name: "Vale-refeição", is_system_default: false, type: "cash" as const };

function renderPage() {
  return render(
    <ToastProvider>
      <PaymentMethodsPage />
    </ToastProvider>,
  );
}

beforeEach(() => {
  Object.values(apiMocks).forEach((mock) => mock.mockReset());
});

describe("PaymentMethodsPage — S-PAY-01/02", () => {
  it("formas padrão exibem badge 'Padrão' e não têm ação de excluir", async () => {
    apiMocks.listPaymentMethods.mockResolvedValue([DEFAULT_METHOD]);
    renderPage();

    expect((await screen.findAllByText("Pix")).length).toBeGreaterThan(0);
    expect(screen.getByText("Padrão")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Excluir" })).not.toBeInTheDocument();
  });

  it("formas customizadas têm ação de excluir e nenhum badge 'Padrão'", async () => {
    apiMocks.listPaymentMethods.mockResolvedValue([CUSTOM_METHOD]);
    renderPage();

    expect(await screen.findByText("Vale-refeição")).toBeInTheDocument();
    expect(screen.queryByText("Padrão")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Excluir" })).toBeInTheDocument();
  });

  it("cadastra uma forma de pagamento customizada", async () => {
    apiMocks.listPaymentMethods.mockResolvedValueOnce([]).mockResolvedValueOnce([CUSTOM_METHOD]);
    apiMocks.createPaymentMethod.mockResolvedValue(CUSTOM_METHOD);
    renderPage();
    await screen.findByText("Nenhuma forma de pagamento cadastrada ainda");

    await userEvent.click(screen.getByRole("button", { name: "+ Nova forma" }));
    await userEvent.type(screen.getByLabelText("Nome", { exact: false }), "Vale-refeição");
    await userEvent.selectOptions(screen.getByLabelText("Tipo", { exact: false }), "cash");
    await userEvent.click(screen.getByRole("button", { name: "Salvar" }));

    expect(await screen.findByText("Vale-refeição")).toBeInTheDocument();
    expect(apiMocks.createPaymentMethod).toHaveBeenCalledWith({ name: "Vale-refeição", type: "cash" });
  });
});
