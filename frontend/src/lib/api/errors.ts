/**
 * Mapeamento de erro de API — `API-CONTRACT.yaml` v0.6.0, "Convenção de erro
 * (PostgREST)": violação de CHECK/regra de negócio embutida em trigger (SQLSTATE
 * classe `23`) vira HTTP 409, corpo `{code, message, details, hint}`; campo
 * obrigatório ausente vira HTTP 400; RLS negando acesso vira 403 (ou 404 — PostgREST
 * não distingue "não existe" de "não autorizado" por padrão, propositalmente).
 *
 * `@supabase/supabase-js` expõe, em toda resposta do PostgREST/RPC, `{ data, error,
 * status, statusText }` — `status` é o HTTP status real da resposta, `error.code` é o
 * `errcode`/código PostgREST. Este módulo centraliza a tradução desses dois campos
 * para uma mensagem de UI e um `kind` que as telas usam para decidir o tratamento
 * (ex.: exibir sugestão de inativação em vez de exclusão em RN-08).
 */
export type ApiErrorKind =
  | "validation" // 400 — campo obrigatório ausente
  | "conflict" // 409 — CHECK/regra de negócio (RN-08, RN-09, unique constraint, etc.)
  | "forbidden" // 403/404 — RLS (dado de outro usuário, MFA não verificado, ou objeto system-default)
  | "network" // falha de rede/timeout, sem resposta HTTP
  | "unknown";

export class ApiError extends Error {
  readonly kind: ApiErrorKind;
  readonly status: number | null;
  readonly code: string | null;
  readonly details: string | null;
  readonly hint: string | null;

  constructor(params: { message: string; kind: ApiErrorKind; status?: number | null; code?: string | null; details?: string | null; hint?: string | null }) {
    super(params.message);
    this.name = "ApiError";
    this.kind = params.kind;
    this.status = params.status ?? null;
    this.code = params.code ?? null;
    this.details = params.details ?? null;
    this.hint = params.hint ?? null;
  }
}

interface PostgrestLikeError {
  message: string;
  code?: string | null;
  details?: string | null;
  hint?: string | null;
}

function kindFromStatus(status: number, code: string | null | undefined): ApiErrorKind {
  if (status === 400) return "validation";
  if (status === 409) return "conflict";
  if (status === 403 || status === 404) return "forbidden";
  // Fallback por classe de SQLSTATE quando o `status` HTTP não estiver disponível
  // (ex.: chamada feita fora do builder do supabase-js).
  if (code?.startsWith("23")) return "conflict";
  return "unknown";
}

/** Mensagens amigáveis para os achados de erro já documentados no contrato (RN-08/RN-09/gate de MFA). */
function friendlyMessage(kind: ApiErrorKind, error: PostgrestLikeError): string {
  if (kind === "forbidden") {
    return "Você não tem permissão para esta ação, ou precisa confirmar o segundo fator de segurança novamente.";
  }
  if (kind === "validation") {
    return "Preencha todos os campos obrigatórios antes de salvar.";
  }
  if (kind === "conflict") {
    return error.message || "Não foi possível concluir a operação porque ela conflita com uma regra do sistema.";
  }
  return error.message || "Ocorreu um erro inesperado. Tente novamente.";
}

/**
 * Converte `{ error, status }` de uma chamada supabase-js (PostgREST/RPC) em
 * `ApiError`. Chamar sempre que `error` não for `null` na resposta.
 */
export function toApiError(error: PostgrestLikeError, status?: number | null): ApiError {
  const kind = status != null ? kindFromStatus(status, error.code) : (error.code?.startsWith("23") ? "conflict" : "unknown");
  return new ApiError({
    message: friendlyMessage(kind, error),
    kind,
    status: status ?? null,
    code: error.code ?? null,
    details: error.details ?? null,
    hint: error.hint ?? null,
  });
}

/** Erro de rede (fetch falhou antes de qualquer resposta HTTP) — ex.: offline. */
export function networkApiError(cause: unknown): ApiError {
  const message = cause instanceof Error ? cause.message : "Falha de rede";
  return new ApiError({ message: `Sem conexão com o servidor: ${message}`, kind: "network" });
}
