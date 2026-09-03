import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { localAuthDb } from "../../lib/auth/localAuthDb";
import { setPin } from "../../lib/auth/pin";
import { MAX_ATTEMPTS } from "../../lib/auth/lockout";

vi.mock("../../lib/auth/webauthn", () => ({
  isWebAuthnAvailable: () => false,
  authenticateWithWebAuthn: vi.fn(),
  isNoCredentialsError: () => false,
}));

const unlockMock = vi.fn();
vi.mock("../../lib/auth/AuthContext", () => ({
  useAuth: () => ({ unlock: unlockMock }),
}));

const { UnlockPage } = await import("./UnlockPage");

beforeEach(async () => {
  await localAuthDb.pin.clear();
  await localAuthDb.lockout.clear();
  await setPin("123456");
  unlockMock.mockReset();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("UnlockPage — S-AUTH-03/05 (RF-MVP-08 AC2, DIR-18/G-17)", () => {
  it("desbloqueia com o PIN correto", async () => {
    render(<UnlockPage />);
    const input = await screen.findByLabelText("PIN", { selector: "input" });
    await waitFor(() => expect(input).not.toBeDisabled());
    await userEvent.type(input, "123456");

    await waitFor(() => expect(unlockMock).toHaveBeenCalled());
  });

  it("mostra tentativas restantes e nunca desbloqueia com PIN incorreto", async () => {
    render(<UnlockPage />);
    const input = await screen.findByLabelText("PIN", { selector: "input" });
    await waitFor(() => expect(input).not.toBeDisabled());
    await userEvent.type(input, "000000");

    expect(await screen.findByRole("alert")).toHaveTextContent(/4 tentativas restantes/);
    expect(unlockMock).not.toHaveBeenCalled();
  });

  it(`bloqueia por 5 minutos após a ${MAX_ATTEMPTS}ª tentativa incorreta, com contagem regressiva visível`, async () => {
    render(<UnlockPage />);

    for (let i = 0; i < MAX_ATTEMPTS; i++) {
      const input = await screen.findByLabelText("PIN", { selector: "input" });
      await waitFor(() => expect(input).not.toBeDisabled());
      await userEvent.type(input, "000000");
    }

    expect(await screen.findByText(/Muitas tentativas/)).toBeInTheDocument();
    expect(screen.getByText(/^\d{2}:\d{2}$/)).toBeInTheDocument();
    expect(screen.queryByLabelText("PIN", { selector: "input" })).not.toBeInTheDocument();
    expect(unlockMock).not.toHaveBeenCalled();
  });
});
