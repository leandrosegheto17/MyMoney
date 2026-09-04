import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

const notificationsMocks = vi.hoisted(() => ({
  listNotifications: vi.fn(),
  countUnreadNotifications: vi.fn(),
  markNotificationRead: vi.fn(),
  createPushSubscription: vi.fn(),
  deletePushSubscription: vi.fn(),
  listPushSubscriptions: vi.fn(),
}));
vi.mock("../../lib/api/notifications", () => notificationsMocks);

const { NotificationBell } = await import("./NotificationBell");

function renderAt(path: string) {
  const router = createMemoryRouter(
    [
      { path: "/", element: <NotificationBell /> },
      { path: "/orcamento", element: <p>Tela de orçamento</p> },
      { path: "/contas-fixas", element: <p>Tela de contas fixas</p> },
    ],
    { initialEntries: [path] },
  );
  return render(<RouterProvider router={router} />);
}

beforeEach(() => {
  Object.values(notificationsMocks).forEach((mock) => mock.mockReset());
});

describe("NotificationBell + NotificationCenter — S-NOT-01/02 (FE-F2-07, DIR-14)", () => {
  it("sino sempre acessível e busca notificações independente de push (fetch ao montar)", async () => {
    notificationsMocks.countUnreadNotifications.mockResolvedValue(2);
    renderAt("/");
    await waitFor(() => expect(notificationsMocks.countUnreadNotifications).toHaveBeenCalled());
    expect(await screen.findByLabelText("Notificações, 2 não lidas")).toBeInTheDocument();
  });

  it("estado vazio: nenhuma notificação ainda", async () => {
    notificationsMocks.countUnreadNotifications.mockResolvedValue(0);
    notificationsMocks.listNotifications.mockResolvedValue([]);
    renderAt("/");
    await userEvent.click(await screen.findByLabelText("Notificações"));
    expect(await screen.findByText("Nenhuma notificação ainda")).toBeInTheDocument();
  });

  it("toque em notificação de orçamento estourado marca como lida e navega para S-BUD-01", async () => {
    notificationsMocks.countUnreadNotifications.mockResolvedValue(1);
    notificationsMocks.listNotifications.mockResolvedValue([
      { id: "n1", user_id: "u1", type: "budget_alert", message: "Orçamento de Alimentação estourou", related_entity_type: "budget_exceeded", related_entity_id: "b1", read_at: null, created_at: new Date().toISOString() },
    ]);
    notificationsMocks.markNotificationRead.mockResolvedValue({});
    renderAt("/");

    await userEvent.click(await screen.findByLabelText("Notificações, 1 não lidas"));
    await userEvent.click(await screen.findByText("Orçamento de Alimentação estourou"));

    await waitFor(() => expect(notificationsMocks.markNotificationRead).toHaveBeenCalledWith("n1"));
    expect(await screen.findByText("Tela de orçamento")).toBeInTheDocument();
  });

  it("toque em notificação de conta a vencer navega para S-FIX-01", async () => {
    notificationsMocks.countUnreadNotifications.mockResolvedValue(1);
    notificationsMocks.listNotifications.mockResolvedValue([
      { id: "n2", user_id: "u1", type: "fixed_bill_due", message: "Aluguel vence em 3 dias", related_entity_type: "fixed_bill", related_entity_id: "fb1", read_at: null, created_at: new Date().toISOString() },
    ]);
    notificationsMocks.markNotificationRead.mockResolvedValue({});
    renderAt("/");

    await userEvent.click(await screen.findByLabelText("Notificações, 1 não lidas"));
    await userEvent.click(await screen.findByText("Aluguel vence em 3 dias"));

    expect(await screen.findByText("Tela de contas fixas")).toBeInTheDocument();
  });

  it("estado de carregamento: mostra Skeleton enquanto listNotifications está pendente (QA-F2-02)", async () => {
    notificationsMocks.countUnreadNotifications.mockResolvedValue(0);
    notificationsMocks.listNotifications.mockReturnValue(new Promise(() => {}));
    renderAt("/");
    await userEvent.click(await screen.findByLabelText("Notificações"));
    expect(await screen.findByRole("status", { name: "Carregando notificações" })).toBeInTheDocument();
  });

  it("estado de erro: mostra mensagem quando listNotifications falha (QA-F2-02)", async () => {
    notificationsMocks.countUnreadNotifications.mockResolvedValue(0);
    notificationsMocks.listNotifications.mockRejectedValue(new Error("falhou"));
    renderAt("/");
    await userEvent.click(await screen.findByLabelText("Notificações"));
    expect(await screen.findByText("Não foi possível carregar as notificações.")).toBeInTheDocument();
  });
});
