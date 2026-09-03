import { browserSupportsWebAuthn, startAuthentication, startRegistration } from "@simplewebauthn/browser";
import type { PublicKeyCredentialCreationOptionsJSON, PublicKeyCredentialRequestOptionsJSON } from "@simplewebauthn/browser";
import { invokeEdgeFunction } from "../api/edgeFunctions";
import { ApiError } from "../api/errors";

/**
 * Cliente WebAuthn real — `API-CONTRACT.yaml` v0.6.0, `/webauthn-register` e
 * `/webauthn-authenticate` (Edge Functions reaproveitadas, `BE-M-09`). Usa
 * `@simplewebauthn/browser` (contraparte de `@simplewebauthn/server`, já usado pelo
 * Backend) para garantir que o shape de `RegistrationResponseJSON`/
 * `AuthenticationResponseJSON` bate exatamente com o que o servidor espera em
 * `attestationResponse`/`assertionResponse`.
 */
export function isWebAuthnAvailable(): boolean {
  return browserSupportsWebAuthn();
}

/** S-AUTH-04: registra uma credencial WebAuthn ("Usar biometria") para o usuário já logado (JWT de sessão presente). */
export async function registerWebAuthnCredential(deviceLabel?: string): Promise<{ credentialId: string }> {
  const generateResult = await invokeEdgeFunction<{ options: PublicKeyCredentialCreationOptionsJSON }>("webauthn-register", {
    action: "generate-options",
  });
  const attestationResponse = await startRegistration({ optionsJSON: generateResult.options });
  const verifyResult = await invokeEdgeFunction<{ success: true; credentialId: string }>("webauthn-register", {
    action: "verify",
    attestationResponse,
    ...(deviceLabel ? { deviceLabel } : {}),
  });
  return { credentialId: verifyResult.credentialId };
}

/**
 * S-AUTH-03: autentica (desbloqueia) com credencial já registrada. 404 `no_credentials`
 * (nenhuma credencial registrada para este usuário) é um caso esperado, não um erro de
 * UI — a tela deve cair no fallback de PIN sem travar o usuário (UX-SPEC 4.2,
 * "biometria falha → fallback automático para PIN, sem travar o usuário").
 */
export async function authenticateWithWebAuthn(): Promise<void> {
  const generateResult = await invokeEdgeFunction<{ options: PublicKeyCredentialRequestOptionsJSON }>("webauthn-authenticate", {
    action: "generate-options",
  });
  const assertionResponse = await startAuthentication({ optionsJSON: generateResult.options });
  await invokeEdgeFunction<{ success: true }>("webauthn-authenticate", { action: "verify", assertionResponse });
}

/** `true` quando o motivo do erro é "usuário não tem credencial registrada" — nunca deve ser tratado como falha bloqueante. */
export function isNoCredentialsError(error: unknown): boolean {
  return error instanceof ApiError && error.status === 404;
}
