import { networkApiError, toApiError } from "./errors";

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
