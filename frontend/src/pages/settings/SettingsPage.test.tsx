import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ToastProvider } from "../../components/base/Toast";
import { localAuthDb } from "../../lib/auth/localAuthDb";
import { setPin } from "../../lib/auth/pin";

const signOutMock = vi.fn();
vi.mock("../../lib/auth/AuthContext", () => ({
  useAuth: () => ({ session: { user: { email: "user@example.com" } }, signOut: signOutMock }),
}));

const deleteAccountMock = vi.fn();
vi.mock("../../lib/api/deleteAccount", () => ({
  deleteAccount: (...args: unknown[]) => deleteAccountMock(...args),
}));

const { SettingsPage } = await import("./SettingsPage");

function renderPage() {
  return render(
    <ToastProvider>
      <SettingsPage />
    </ToastProvider>,
  );
}

beforeEach(async () => {
  await localAuthDb.pin.clear();
  signOutMock.mockReset();
  deleteAccountMock.mockReset();
});

describe("SettingsPage — S-SET-01 (RF-MVP-08 AC3)", () => {
  it("mostra o e-mail da conta autenticada", async () => {
    renderPage();
    expect(await screen.findByText("user@example.com")).toBeInTheDocument();
  });

  it("logout explícito encerra a sessão ativa", async () => {
    renderPage();
    await userEvent.click(screen.getByRole("button", { name: "Sair" }));
    await waitFor(() => expect(signOutMock).toHaveBeenCalled());
  });

  it("alterar PIN: exige o PIN atual correto antes de aceitar um novo", async () => {
    await setPin("111111");
    renderPage();

    await userEvent.click(screen.getByRole("button", { name: "Alterar PIN" }));
    let input = await screen.findByLabelText("PIN", { selector: "input" });
    await waitFor(() => expect(input).not.toBeDisabled());
    await userEvent.type(input, "000000");
    expect(await screen.findByRole("alert")).toHaveTextContent("PIN atual incorreto");

    input = screen.getByLabelText("PIN", { selector: "input" });
    await userEvent.type(input, "111111");
    expect(await screen.findByText("Digite o novo PIN")).toBeInTheDocument();

    input = screen.getByLabelText("PIN", { selector: "input" });
    await userEvent.type(input, "222222");
    expect(await screen.findByText("Confirme o novo PIN")).toBeInTheDocument();

    input = screen.getByLabelText("PIN", { selector: "input" });
    await userEvent.type(input, "222222");

    await waitFor(async () => {
      const record = await localAuthDb.pin.get("device-pin");
      expect(record).toBeDefined();
    });
  });
});

describe("SettingsPage — S-SET-02/03 (FE-F2-09)", () => {
  it("toggle de push desabilitado quando o navegador não suporta Service Worker/Push (jsdom)", async () => {
    renderPage();
    const toggle = await screen.findByLabelText("Notificações push neste dispositivo");
    expect(toggle).toBeDisabled();
    expect(screen.getByText("Não disponível neste navegador.")).toBeInTheDocument();
  });

  it("Central de notificações continua sendo o canal primário, independente de push (DIR-14)", async () => {
    renderPage();
    expect(await screen.findByText(/Central de notificações \(sino no topo\) sempre mostra o histórico completo/)).toBeInTheDocument();
  });

  it("S-SET-03: documenta o achado de que não há preferência de usuário persistida para limiar padrão global", async () => {
    renderPage();
    expect(await screen.findByText(/não expõem uma tabela de preferências de usuário/)).toBeInTheDocument();
  });
});

describe("SettingsPage — exclusão de conta (FE-F3-09, ADR-011)", () => {
  it("um único clique em 'Excluir conta' não dispara a exclusão — apenas abre o aviso da etapa 1", async () => {
    renderPage();
    await userEvent.click(screen.getByRole("button", { name: "Excluir conta" }));

    expect(await screen.findByRole("heading", { name: "Excluir conta" })).toBeInTheDocument();
    expect(deleteAccountMock).not.toHaveBeenCalled();
  });

  it("o aviso de retenção de até 30 dias em backup aparece na etapa 2, antes da confirmação final, e só então a exclusão é disparada", async () => {
    deleteAccountMock.mockResolvedValue({ ok: true, deleted_rows: {}, storage_removed_count: 0, storage_warning: null });
    renderPage();

    await userEvent.click(screen.getByRole("button", { name: "Excluir conta" }));
    await userEvent.click(screen.getByRole("button", { name: "Continuar" }));

    expect(await screen.findByText(/até 30 dias em backup já emitido/)).toBeInTheDocument();
    expect(deleteAccountMock).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole("button", { name: "Excluir permanentemente" }));

    await waitFor(() => expect(deleteAccountMock).toHaveBeenCalledTimes(1));
  });

  it("confirmação completa (duas etapas) chama a Edge Function e encerra a sessão em caso de sucesso", async () => {
    deleteAccountMock.mockResolvedValue({ ok: true, deleted_rows: {}, storage_removed_count: 0, storage_warning: null });
    renderPage();

    await userEvent.click(screen.getByRole("button", { name: "Excluir conta" }));
    await userEvent.click(screen.getByRole("button", { name: "Continuar" }));
    await userEvent.click(screen.getByRole("button", { name: "Excluir permanentemente" }));

    await waitFor(() => expect(signOutMock).toHaveBeenCalledTimes(1));
  });

  it("erro da Edge Function não encerra a sessão — usuário permanece autenticado e vê a mensagem de erro", async () => {
    deleteAccountMock.mockRejectedValue(new Error("account_data_deletion_failed"));
    renderPage();

    await userEvent.click(screen.getByRole("button", { name: "Excluir conta" }));
    await userEvent.click(screen.getByRole("button", { name: "Continuar" }));
    await userEvent.click(screen.getByRole("button", { name: "Excluir permanentemente" }));

    await waitFor(() => expect(deleteAccountMock).toHaveBeenCalledTimes(1));
    expect(signOutMock).not.toHaveBeenCalled();
    expect(await screen.findByRole("alert")).toHaveTextContent("Não foi possível excluir a conta");
  });
});
