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
