import { getSupabaseClient } from "../supabase/client";
import { ApiError, networkApiError } from "./errors";

/**
 * Invoca uma Edge Function (`API-CONTRACT.yaml`, servidor `functions/v1`) via
 * `supabase.functions.invoke` — que já anexa `Authorization: Bearer <JWT de sessão>`
 * automaticamente a partir da sessão ativa do client (`auth-email-mfa`,
 * `webauthn-register`, `webauthn-authenticate`, todas exigem esse header). Normaliza
 * o resultado do mesmo jeito que `unwrap` normaliza PostgREST: sucesso retorna o
 * corpo JSON tipado, falha lança `ApiError` com `status`/`code`/`message` extraídos
 * da resposta HTTP real (nunca só a mensagem genérica do supabase-js).
 */
export async function invokeEdgeFunction<T>(name: string, body: Record<string, unknown>): Promise<T> {
  let response: { data: T | null; error: unknown };
  try {
    response = await getSupabaseClient().functions.invoke<T>(name, { body });
  } catch (cause) {
    throw networkApiError(cause);
  }

  if (response.error) {
    throw await toEdgeFunctionError(response.error);
  }
  return response.data as T;
}

async function toEdgeFunctionError(error: unknown): Promise<ApiError> {
  // FunctionsHttpError (non-2xx da própria function): `context` é o `Response` real.
  const context = (error as { context?: unknown } | null)?.context;
  if (context && typeof context === "object" && "status" in context) {
    const response = context as Response;
    let body: { error?: string; message?: string; code?: string } = {};
    try {
      body = await response.clone().json();
    } catch {
      // corpo não é JSON — segue com mensagem genérica abaixo.
    }
    const status = response.status;
    const kind = status === 400 ? "validation" : status === 401 || status === 403 || status === 404 ? "forbidden" : status === 409 ? "conflict" : "unknown";
    return new ApiError({
      message: body.message ?? body.error ?? response.statusText ?? "Falha ao chamar o servidor",
      kind,
      status,
      code: body.code ?? body.error ?? null,
    });
  }
  const message = error instanceof Error ? error.message : "Falha ao chamar o servidor";
  return new ApiError({ message, kind: "unknown" });
}
