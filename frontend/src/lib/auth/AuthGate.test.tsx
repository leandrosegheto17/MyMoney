import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Session } from "@supabase/supabase-js";

const sessionMocks = vi.hoisted(() => ({
  getCurrentSession: vi.fn(),
  onAuthStateChange: vi.fn(),
  isEmailMfaVerified: vi.fn(),
}));
vi.mock("./session", () => sessionMocks);

const pinMocks = vi.hoisted(() => ({ hasPinConfigured: vi.fn() }));
vi.mock("./pin", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./pin")>();
  return { ...actual, hasPinConfigured: pinMocks.hasPinConfigured };
});

vi.mock("../auth/webauthn", () => ({
  isWebAuthnAvailable: () => false,
  authenticateWithWebAuthn: vi.fn().mockRejectedValue(new Error("no credentials")),
  isNoCredentialsError: () => true,
}));

const { AuthProvider } = await import("./AuthContext");
const { AuthGate } = await import("./AuthGate");

function renderApp() {
  return render(
    <MemoryRouter initialEntries={["/app"]}>
      <AuthProvider>
        <Routes>
          <Route element={<AuthGate />}>
            <Route path="/app" element={<p>Conteúdo autenticado</p>} />
          </Route>
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  );
}

const FAKE_SESSION = { access_token: "a.b.c", user: { email: "user@example.com" } } as unknown as Session;

beforeEach(() => {
  sessionMocks.getCurrentSession.mockReset();
  sessionMocks.onAuthStateChange.mockReset().mockReturnValue(() => {});
  sessionMocks.isEmailMfaVerified.mockReset();
  pinMocks.hasPinConfigured.mockReset();
});

describe("AuthGate — máquina de estado UX-FL-10", () => {
  it("sem sessão, mostra o login (S-AUTH-01)", async () => {
    sessionMocks.getCurrentSession.mockResolvedValue(null);
    pinMocks.hasPinConfigured.mockResolvedValue(false);
    renderApp();
    expect(await screen.findByRole("heading", { name: "Entrar no MyMoney" })).toBeInTheDocument();
  });

  // BYPASS TEMPORÁRIO (2026-09-04, BLOCKERS.md Bloqueio 018): SKIP_EMAIL_MFA
  // em AuthContext.tsx pula este estágio enquanto auth-email-mfa está com
  // falha de conectividade não resolvida. Reativar este teste junto com a
  // reversão da flag.
  it.skip("com sessão mas sem MFA de e-mail verificado, mostra o passo de verificação", async () => {
    sessionMocks.getCurrentSession.mockResolvedValue(FAKE_SESSION);
    sessionMocks.isEmailMfaVerified.mockReturnValue(false);
    pinMocks.hasPinConfigured.mockResolvedValue(false);
    renderApp();
    expect(await screen.findByRole("heading", { name: "Confirme seu e-mail" })).toBeInTheDocument();
  });

  it("BYPASS TEMPORÁRIO: com sessão e sem MFA verificado, pula direto pra PIN/desbloqueio (Bloqueio 018)", async () => {
    sessionMocks.getCurrentSession.mockResolvedValue(FAKE_SESSION);
    sessionMocks.isEmailMfaVerified.mockReturnValue(false);
    pinMocks.hasPinConfigured.mockResolvedValue(false);
    renderApp();
    expect(await screen.findByRole("heading", { name: "Configure um PIN" })).toBeInTheDocument();
  });

  it("com MFA verificado mas sem PIN configurado no dispositivo, mostra o setup de PIN (S-AUTH-04)", async () => {
    sessionMocks.getCurrentSession.mockResolvedValue(FAKE_SESSION);
    sessionMocks.isEmailMfaVerified.mockReturnValue(true);
    pinMocks.hasPinConfigured.mockResolvedValue(false);
    renderApp();
    expect(await screen.findByRole("heading", { name: "Configure um PIN" })).toBeInTheDocument();
  });

  it("com PIN configurado e app ainda não desbloqueado nesta sessão, mostra o desbloqueio (S-AUTH-03)", async () => {
    sessionMocks.getCurrentSession.mockResolvedValue(FAKE_SESSION);
    sessionMocks.isEmailMfaVerified.mockReturnValue(true);
    pinMocks.hasPinConfigured.mockResolvedValue(true);
    renderApp();
    expect(await screen.findByText("🔒 Desbloqueie o app")).toBeInTheDocument();
  });

  it("só renderiza o conteúdo autenticado quando totalmente desbloqueado", async () => {
    sessionMocks.getCurrentSession.mockResolvedValue(FAKE_SESSION);
    sessionMocks.isEmailMfaVerified.mockReturnValue(true);
    pinMocks.hasPinConfigured.mockResolvedValue(true);
    renderApp();
    await screen.findByText("🔒 Desbloqueie o app");
    expect(screen.queryByText("Conteúdo autenticado")).not.toBeInTheDocument();
  });
});
