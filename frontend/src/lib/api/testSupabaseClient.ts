import { vi } from "vitest";

/**
 * Duplo de teste mínimo do client supabase-js usado pelos módulos de `src/lib/api`.
 * Cobre só a fatia da fluent API (`.from().select()/.insert()/.update()/.eq()/...`,
 * `.rpc()`) usada por este projeto — não é um mock genérico de supabase-js.
 *
 * Uso: `vi.mock("../supabase/client", () => ({ getSupabaseClient: () => fakeClient }))`
 * e configurar `queueResult` com a resposta que a próxima chamada deve `await`.
 */
export interface FakeResult<T = unknown> {
  data: T | null;
  error: { message: string; code?: string; details?: string | null; hint?: string | null } | null;
  status?: number;
}

/** Usuário autenticado padrão devolvido por `auth.getUser()` — sobrescrever com `setAuthUser`/`setAuthGetUserError`. */
const DEFAULT_TEST_USER_ID = "test-user-id";

export function createFakeSupabaseClient() {
  let nextResult: FakeResult = { data: null, error: null, status: 200 };
  const calls: { table: string; method: string; args: unknown[] }[] = [];
  let authUser: { id: string } | null = { id: DEFAULT_TEST_USER_ID };
  let authGetUserError: { message: string; name?: string } | null = null;

  function queueResult<T>(result: FakeResult<T>) {
    nextResult = result;
  }

  /** Configura o usuário que `auth.getUser()` (`withOwnerId`, Bloqueio 015) deve devolver na próxima chamada. */
  function setAuthUser(user: { id: string } | null) {
    authUser = user;
    authGetUserError = null;
  }

  /** Simula `auth.getUser()` falhando (ex.: sessão expirada) — `withOwnerId` deve lançar `ApiError kind:"forbidden"`. */
  function setAuthGetUserError(error: { message: string; name?: string } | null) {
    authGetUserError = error;
  }

  function makeBuilder(table: string) {
    const builder: Record<string, unknown> = {};
    const chain = (method: string) => (...args: unknown[]) => {
      calls.push({ table, method, args });
      return builder;
    };
    for (const method of ["select", "insert", "update", "delete", "eq", "gte", "lte", "order", "single"]) {
      builder[method] = chain(method);
    }
    // Thenable: permite `await query` retornar o resultado configurado, como o builder real do supabase-js.
    builder.then = (resolve: (value: FakeResult) => void) => resolve(nextResult);
    return builder;
  }

  const client = {
    from: vi.fn((table: string) => makeBuilder(table)),
    rpc: vi.fn((fn: string, args?: unknown) => {
      calls.push({ table: fn, method: "rpc", args: [args] });
      return { then: (resolve: (value: FakeResult) => void) => resolve(nextResult) };
    }),
    auth: {
      getUser: vi.fn(async () => {
        if (authGetUserError) {
          return { data: { user: null }, error: authGetUserError };
        }
        return { data: { user: authUser }, error: null };
      }),
    },
  };

  return { client, queueResult, calls, setAuthUser, setAuthGetUserError };
}
