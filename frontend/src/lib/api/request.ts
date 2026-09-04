import { getSupabaseClient } from "../supabase/client";
import { ApiError, networkApiError, toApiError } from "./errors";

interface SupabaseLikeResult<T> {
  data: T | null;
  error: { message: string; code?: string | null; details?: string | null; hint?: string | null } | null;
  status?: number;
}

/**
 * Executa uma chamada supabase-js (PostgREST `.from(...)`/`.rpc(...)`) e normaliza o
 * resultado: sucesso retorna `data` (nunca `null` para as chamadas deste módulo, que
 * sempre pedem `.select()`); falha lança `ApiError` (`errors.ts`), nunca um objeto
 * `{data, error}` cru — o resto do app trata erro só via `try/catch`/`ApiError`.
 */
export async function unwrap<T>(promise: PromiseLike<SupabaseLikeResult<T>>): Promise<T> {
  let result: SupabaseLikeResult<T>;
  try {
    result = await promise;
  } catch (cause) {
    throw networkApiError(cause);
  }
  if (result.error) {
    throw toApiError(result.error, result.status ?? null);
  }
  return result.data as T;
}

/**
 * Defesa em profundidade complementar (`BLOCKERS.md` Bloqueio 015, `SECURITY-REVIEW.md`
 * `SEC-DEBT-008`): toda tabela "ownable" exige `user_id` explícito no `INSERT` — RLS
 * (`WITH CHECK (user_id = auth.uid())`) já rejeita a escrita se omitido (fail-closed),
 * mas este helper evita depender silenciosamente de um `DEFAULT auth.uid()` de banco
 * (correção primária/sistêmica, Backend) que poderia ser removido/esquecido numa
 * migration futura. Sempre lê o `user.id` da sessão ativa **no momento da chamada**
 * (`auth.getUser()`, nunca de estado local em memória possivelmente obsoleto).
 */
export async function withOwnerId<T extends object>(input: T): Promise<T & { user_id: string }> {
  let result: Awaited<ReturnType<ReturnType<typeof getSupabaseClient>["auth"]["getUser"]>>;
  try {
    result = await getSupabaseClient().auth.getUser();
  } catch (cause) {
    throw networkApiError(cause);
  }
  const { data, error } = result;
  if (error || !data.user) {
    throw new ApiError({
      message: "Sessão inválida — faça login novamente.",
      kind: "forbidden",
      status: 401,
      code: error?.name ?? null,
    });
  }
  return { ...input, user_id: data.user.id };
}
