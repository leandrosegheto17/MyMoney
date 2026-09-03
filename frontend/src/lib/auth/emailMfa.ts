import { invokeEdgeFunction } from "../api/edgeFunctions";
import { refreshSession } from "./session";

/**
 * `/auth-email-mfa` (Edge Function reaproveitada, `API-CONTRACT.yaml` v0.6.0,
 * `BE-M-09`) — segundo fator de login por e-mail, em 2 passos (RF-MVP-08). Exige JWT
 * de sessão AAL1 já presente (emitido por `signInWithPassword`) — `invokeEdgeFunction`
 * já anexa esse header via `supabase.functions.invoke`.
 */

/** `action: "request"` — código de 6 dígitos gerado e enviado por e-mail. 429 = rate limit (5/30min) ou cooldown (60s). */
export async function requestEmailMfaCode(): Promise<void> {
  await invokeEdgeFunction<{ success: true }>("auth-email-mfa", { action: "request" });
}

/**
 * `action: "verify"` — valida o código de 6 dígitos. 400 = código ausente/mal
 * formatado/inválido/expirado; 429 = 5 tentativas esgotadas (solicitar novo código).
 * Em sucesso, força `refreshSession()` para o JWT passar a carregar
 * `app_email_mfa_verified=true` (`custom_access_token_hook`) — sem isso as 4 tabelas
 * com gate de MFA continuam retornando 403 mesmo após o código correto.
 */
export async function verifyEmailMfaCode(code: string): Promise<void> {
  await invokeEdgeFunction<{ success: true }>("auth-email-mfa", { action: "verify", code });
  await refreshSession();
}
