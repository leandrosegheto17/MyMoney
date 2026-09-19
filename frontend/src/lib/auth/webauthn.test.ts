import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "../api/errors";

const invokeMock = vi.fn();
vi.mock("../api/edgeFunctions", () => ({ invokeEdgeFunction: (...args: unknown[]) => invokeMock(...args) }));

const startRegistrationMock = vi.fn();
const startAuthenticationMock = vi.fn();
const supportsMock = vi.fn();
vi.mock("@simplewebauthn/browser", () => ({
  browserSupportsWebAuthn: () => supportsMock(),
  startRegistration: (...args: unknown[]) => startRegistrationMock(...args),
  startAuthentication: (...args: unknown[]) => startAuthenticationMock(...args),
}));

const { isWebAuthnAvailable, registerWebAuthnCredential, authenticateWithWebAuthn, isNoCredentialsError } = await import("./webauthn");

beforeEach(() => {
  invokeMock.mockReset();
  startRegistrationMock.mockReset();
  startAuthenticationMock.mockReset();
  supportsMock.mockReset();
});

describe("webauthn — FE-DEBT-01 (QA-DEBT-015)", () => {
  it("isWebAuthnAvailable delega a browserSupportsWebAuthn", () => {
    supportsMock.mockReturnValue(false);
    expect(isWebAuthnAvailable()).toBe(false);
    supportsMock.mockReturnValue(true);
    expect(isWebAuthnAvailable()).toBe(true);
  });

  it("registerWebAuthnCredential: gera opções, registra e verifica, devolvendo o credentialId", async () => {
    invokeMock.mockResolvedValueOnce({ options: { challenge: "c" } }).mockResolvedValueOnce({ success: true, credentialId: "cred-1" });
    startRegistrationMock.mockResolvedValue({ id: "att" });

    await expect(registerWebAuthnCredential("Meu celular")).resolves.toEqual({ credentialId: "cred-1" });

    expect(invokeMock).toHaveBeenNthCalledWith(1, "webauthn-register", { action: "generate-options" });
    expect(startRegistrationMock).toHaveBeenCalledWith({ optionsJSON: { challenge: "c" } });
    expect(invokeMock).toHaveBeenNthCalledWith(2, "webauthn-register", {
      action: "verify",
      attestationResponse: { id: "att" },
      deviceLabel: "Meu celular",
    });
  });

  it("registerWebAuthnCredential: sem deviceLabel não envia o campo", async () => {
    invokeMock.mockResolvedValueOnce({ options: {} }).mockResolvedValueOnce({ success: true, credentialId: "cred-2" });
    startRegistrationMock.mockResolvedValue({ id: "att" });
    await registerWebAuthnCredential();
    expect(invokeMock.mock.calls[1][1]).not.toHaveProperty("deviceLabel");
  });

  it("registerWebAuthnCredential: falha do navegador propaga e não chama verify", async () => {
    invokeMock.mockResolvedValueOnce({ options: {} });
    startRegistrationMock.mockRejectedValue(new Error("NotAllowedError"));
    await expect(registerWebAuthnCredential()).rejects.toThrow("NotAllowedError");
    expect(invokeMock).toHaveBeenCalledTimes(1);
  });

  it("authenticateWithWebAuthn: gera opções, autentica e verifica", async () => {
    invokeMock.mockResolvedValueOnce({ options: { challenge: "a" } }).mockResolvedValueOnce({ success: true });
    startAuthenticationMock.mockResolvedValue({ id: "assertion" });

    await expect(authenticateWithWebAuthn()).resolves.toBeUndefined();

    expect(startAuthenticationMock).toHaveBeenCalledWith({ optionsJSON: { challenge: "a" } });
    expect(invokeMock).toHaveBeenNthCalledWith(2, "webauthn-authenticate", { action: "verify", assertionResponse: { id: "assertion" } });
  });

  it("authenticateWithWebAuthn: 404 sem credenciais propaga ApiError reconhecido por isNoCredentialsError (fallback para PIN)", async () => {
    const error = new ApiError({ message: "no_credentials", kind: "forbidden", status: 404 });
    invokeMock.mockRejectedValueOnce(error);
    await expect(authenticateWithWebAuthn()).rejects.toBe(error);
    expect(startAuthenticationMock).not.toHaveBeenCalled();
    expect(isNoCredentialsError(error)).toBe(true);
  });

  it("isNoCredentialsError: outros erros não são tratados como ausência de credencial", () => {
    expect(isNoCredentialsError(new ApiError({ message: "x", kind: "unknown", status: 500 }))).toBe(false);
    expect(isNoCredentialsError(new Error("x"))).toBe(false);
  });
});
