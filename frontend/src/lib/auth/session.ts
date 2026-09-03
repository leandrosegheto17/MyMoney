import type { Session } from "@supabase/supabase-js";
import { getSupabaseClient } from "../supabase/client";
import { ApiError, networkApiError } from "../api/errors";

/**
 * Camada de sessão do Supabase Auth (S-AUTH-01) — `API-CONTRACT.yaml`: "todo
 * endpoint... exige header `Authorization: Bearer <JWT de sessão>`". Este módulo só
 * cobre a autenticação de 1º fator (e-mail/senha, link mágico); o 2º fator
 * (`app_email_mfa_verified`) é `emailMfa.ts`, e o desbloqueio local (PIN/WebAuthn,
 * 100% offline, DIR-16) é `pin.ts`/`webauthn.ts` — os três nunca se confundem
 * (DIR-19/G-07: desbloqueio local nunca substitui JWT de sessão válido).
 */

function toAuthApiError(cause: unknown): ApiError {
  if (cause instanceof Error && "status" in cause) {
    const status = (cause as { status?: number }).status ?? null;
    return new ApiError({
      message: cause.message,
      kind: status === 400 ? "validation" : status === 401 || status === 403 ? "forbidden" : "unknown",
      status,
    });
  }
  return networkApiError(cause);
}

/** `POST /auth/v1/token?grant_type=password` — login por e-mail/senha (S-AUTH-01). */
export async function signInWithPassword(email: string, password: string): Promise<Session> {
  const { data, error } = await getSupabaseClient().auth.signInWithPassword({ email, password });
  if (error) throw toAuthApiError(error);
  if (!data.session) throw new ApiError({ message: "Login não retornou uma sessão válida.", kind: "unknown" });
  return data.session;
}

/** `POST /auth/v1/otp` — "Enviar link mágico" (S-AUTH-01, alternativa a senha). */
export async function sendMagicLink(email: string): Promise<void> {
  const { error } = await getSupabaseClient().auth.signInWithOtp({ email });
  if (error) throw toAuthApiError(error);
}

/** "Esqueci minha senha" (S-AUTH-01) — `POST /auth/v1/recover`. */
export async function sendPasswordResetEmail(email: string): Promise<void> {
  const { error } = await getSupabaseClient().auth.resetPasswordForEmail(email);
  if (error) throw toAuthApiError(error);
}

/** Logout explícito (S-SET-01, RF-MVP-08 AC3) — encerra a sessão ativa no servidor e localmente. */
export async function signOut(): Promise<void> {
  const { error } = await getSupabaseClient().auth.signOut();
  if (error) throw toAuthApiError(error);
}

export async function getCurrentSession(): Promise<Session | null> {
  const { data, error } = await getSupabaseClient().auth.getSession();
  if (error) throw toAuthApiError(error);
  return data.session;
}

/** Força a renovação do JWT — necessário depois de `emailMfa.verifyEmailMfaCode` para o client passar a carregar `app_email_mfa_verified=true` (`custom_access_token_hook`, ADR-013). */
export async function refreshSession(): Promise<Session | null> {
  const { data, error } = await getSupabaseClient().auth.refreshSession();
  if (error) throw toAuthApiError(error);
  return data.session;
}

export function onAuthStateChange(callback: (session: Session | null) => void): () => void {
  const {
    data: { subscription },
  } = getSupabaseClient().auth.onAuthStateChange((_event, session) => callback(session));
  return () => subscription.unsubscribe();
}

/** Claim custom emitido por `custom_access_token_hook` (ADR-013) — gate de MFA das 4 tabelas sensíveis. */
export function isEmailMfaVerified(session: Session | null): boolean {
  if (!session) return false;
  try {
    const payload = JSON.parse(atob(session.access_token.split(".")[1] ?? ""));
    return payload.app_email_mfa_verified === true || payload.app_email_mfa_verified === "true";
  } catch {
    return false;
  }
}
