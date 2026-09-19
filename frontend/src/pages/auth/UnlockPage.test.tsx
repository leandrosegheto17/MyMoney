import { render, screen, waitFor } from "@testing-library/react";
import { axe } from "jest-axe";
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

// Hash do PIN x 5 tentativas é CPU-bound: sob carga da suíte o timeout padrão é insuficiente.
const LOAD_TIMEOUT = 15_000;
const TEST_TIMEOUT = 60_000;

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
  it("não tem violações axe no estado normal", async () => {
    const { container } = render(<UnlockPage />);
    await screen.findByLabelText("PIN", { selector: "input" });
    expect(await axe(container)).toHaveNoViolations();
  });

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
      await waitFor(() => expect(input).not.toBeDisabled(), { timeout: LOAD_TIMEOUT });
      await userEvent.type(input, "000000");
      // Sincroniza com o fim da verificação assíncrona (o input não fica desabilitado enquanto
      // ela roda): sem isso, a próxima digitação corre contra o reset do PIN e a contagem de
      // tentativas fica não determinística sob carga.
      if (i < MAX_ATTEMPTS - 1) {
        const remaining = MAX_ATTEMPTS - 1 - i;
        await screen.findByText(
          new RegExp(`PIN incorreto\. ${remaining} tentativas? restantes?`),
          {},
          { timeout: LOAD_TIMEOUT },
        );
      }
    }

    expect(await screen.findByText(/Muitas tentativas/, {}, { timeout: LOAD_TIMEOUT })).toBeInTheDocument();
    expect(screen.getByText(/^\d{2}:\d{2}$/)).toBeInTheDocument();
    expect(screen.queryByLabelText("PIN", { selector: "input" })).not.toBeInTheDocument();
    expect(unlockMock).not.toHaveBeenCalled();
  }, TEST_TIMEOUT);
});
