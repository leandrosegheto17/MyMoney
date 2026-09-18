import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "jest-axe";
import { beforeEach, describe, expect, it, vi } from "vitest";

const setPinMock = vi.fn();
vi.mock("../../lib/auth/pin", async (orig) => ({
  ...(await orig<typeof import("../../lib/auth/pin")>()),
  setPin: (pin: string) => setPinMock(pin),
}));

let webauthnAvailable = true;
const registerMock = vi.fn();
vi.mock("../../lib/auth/webauthn", () => ({
  isWebAuthnAvailable: () => webauthnAvailable,
  registerWebAuthnCredential: () => registerMock(),
}));

const refreshMock = vi.fn();
const unlockMock = vi.fn();
vi.mock("../../lib/auth/AuthContext", () => ({
  useAuth: () => ({ refresh: refreshMock, unlock: unlockMock }),
}));

const { PinSetupPage } = await import("./PinSetupPage");

beforeEach(() => {
  setPinMock.mockReset().mockResolvedValue(undefined);
  registerMock.mockReset().mockResolvedValue(undefined);
  refreshMock.mockReset().mockResolvedValue(undefined);
  unlockMock.mockReset();
  webauthnAvailable = true;
});

async function typePin(value: string) {
  const input = await screen.findByLabelText("PIN", { selector: "input" });
  await waitFor(() => expect(input).not.toBeDisabled());
  await userEvent.type(input, value);
}

describe("PinSetupPage — S-AUTH-04 (RF-MVP-08 AC1)", () => {
  it("renderiza o passo 1 com título h1, sem opção de pular", () => {
    render(<PinSetupPage />);
    expect(screen.getByRole("heading", { level: 1, name: "Configure um PIN" })).toBeInTheDocument();
    expect(screen.getByText("Digite um PIN novo")).toBeInTheDocument();
    expect(screen.queryByText(/pular/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /pular|depois|agora/i })).not.toBeInTheDocument();
  });

  it("PIN divergente exibe erro e volta ao passo 1", async () => {
    render(<PinSetupPage />);
    await typePin("123456");
    expect(await screen.findByText("Confirme o PIN digitado")).toBeInTheDocument();
    await typePin("654321");
    expect(await screen.findByText("Os PINs não coincidem. Digite novamente.")).toBeInTheDocument();
    expect(screen.getByText("Digite um PIN novo")).toBeInTheDocument();
    expect(setPinMock).not.toHaveBeenCalled();
  });

  it("PIN igual salva e oferece biometria", async () => {
    render(<PinSetupPage />);
    await typePin("123456");
    await typePin("123456");
    await waitFor(() => expect(setPinMock).toHaveBeenCalledWith("123456"));
    expect(await screen.findByRole("heading", { level: 1, name: "Usar biometria?" })).toBeInTheDocument();
    expect(screen.queryByText(/pular/i)).not.toBeInTheDocument();
  });

  it("sem WebAuthn conclui direto após salvar", async () => {
    webauthnAvailable = false;
    render(<PinSetupPage />);
    await typePin("123456");
    await typePin("123456");
    await waitFor(() => expect(unlockMock).toHaveBeenCalled());
    expect(refreshMock).toHaveBeenCalled();
  });

  it("erro ao salvar PIN exibe Alert danger", async () => {
    setPinMock.mockRejectedValue(new Error("falha ao salvar"));
    render(<PinSetupPage />);
    await typePin("123456");
    await typePin("123456");
    expect(await screen.findByText("falha ao salvar")).toBeInTheDocument();
    expect(unlockMock).not.toHaveBeenCalled();
  });

  async function reachBiometricOffer() {
    render(<PinSetupPage />);
    await typePin("123456");
    await typePin("123456");
    await screen.findByRole("heading", { name: "Usar biometria?" });
  }

  it("ativar biometria registra credencial e conclui", async () => {
    await reachBiometricOffer();
    await userEvent.click(screen.getByRole("button", { name: "Usar biometria" }));
    await waitFor(() => expect(unlockMock).toHaveBeenCalled());
    expect(registerMock).toHaveBeenCalled();
  });

  it("continuar só com PIN conclui sem registrar", async () => {
    await reachBiometricOffer();
    await userEvent.click(screen.getByRole("button", { name: "Continuar só com PIN" }));
    await waitFor(() => expect(unlockMock).toHaveBeenCalled());
    expect(registerMock).not.toHaveBeenCalled();
  });

  it("falha de WebAuthn não bloqueia a conclusão do setup", async () => {
    registerMock.mockRejectedValue(new Error("x"));
    await reachBiometricOffer();
    await userEvent.click(screen.getByRole("button", { name: "Usar biometria" }));
    await waitFor(() => expect(unlockMock).toHaveBeenCalled());
  });

  it("não tem violações axe (fase PIN e biometria)", async () => {
    const { container } = render(<PinSetupPage />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
