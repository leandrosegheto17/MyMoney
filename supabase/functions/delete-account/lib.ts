// BE-F3-09 — Exclusão de conta a pedido do usuário (ADR-011, tabela-resumo,
// linha "Exclusão de conta"). Helpers puros/testáveis, separados de
// `index.ts` (wiring HTTP) — mesmo princípio de `data-retention-purge/lib.ts`/
// `report-export/lib.ts`: rodar `deno test` sem depender de conexão real ao
// Postgres/Storage/Auth.

/**
 * Guardrail central desta tarefa (ADR-011: "chamada sem o JWT do próprio
 * usuário-alvo é rejeitada"): a Edge Function NUNCA aceita um `user_id`
 * arbitrário no corpo da requisição sem confirmar que bate com o `id` do
 * usuário já identificado via JWT (`getAuthenticatedUser`, `index.ts`).
 *
 * - Corpo sem `user_id` (undefined/null): ok — a ação sempre tem como alvo o
 *   próprio usuário autenticado, nunca é preciso informar quem é o alvo.
 * - Corpo com `user_id` IGUAL ao autenticado: ok — redundante, mas aceito
 *   (ex.: client que sempre envia o id por hábito de outras chamadas).
 * - Corpo com `user_id` DIFERENTE do autenticado (a tentativa literal de
 *   "excluir outro usuário" citada no critério de aceite): rejeitado.
 * - Corpo com `user_id` de tipo inválido (não-string, string vazia): tratado
 *   como entrada inválida, rejeitado — nunca interpretado como "ausente".
 */
export type TargetValidation =
  | { ok: true }
  | { ok: false; error: "invalid_user_id" | "forbidden_target_mismatch"; message: string };

export function validateTargetUserId(
  bodyUserId: unknown,
  authenticatedUserId: string,
): TargetValidation {
  if (bodyUserId === undefined || bodyUserId === null) {
    return { ok: true };
  }
  if (typeof bodyUserId !== "string" || bodyUserId.trim().length === 0) {
    return {
      ok: false,
      error: "invalid_user_id",
      message: "Campo user_id, quando informado, deve ser uma string não vazia.",
    };
  }
  if (bodyUserId !== authenticatedUserId) {
    return {
      ok: false,
      error: "forbidden_target_mismatch",
      message: "Só é possível excluir a própria conta. user_id informado não corresponde ao usuário autenticado.",
    };
  }
  return { ok: true };
}

/** Divide um array em blocos de tamanho `size` — mesmo utilitário de
 *  `data-retention-purge/lib.ts` (Storage `.remove()` aceita um lote por
 *  chamada, mas um número muito grande de paths numa única chamada é
 *  evitado por segurança de payload). Duplicado aqui intencionalmente (cada
 *  Edge Function é um módulo Deno isolado, sem import cross-function no
 *  projeto — mesmo padrão já aceito de CORS/log duplicados entre functions). */
export function chunk<T>(items: T[], size: number): T[][] {
  if (size <= 0) throw new Error("chunk: size deve ser > 0");
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    out.push(items.slice(i, i + size));
  }
  return out;
}

/** Monta o path completo (`<user_id>/<nome>`) de cada objeto pendente do
 *  bucket `exports` (BE-F3-07: `objectPath = ${user.id}/${uuid}.${ext}`) a
 *  partir da listagem por pasta (`storage.from('exports').list(userId)`,
 *  que devolve nomes RELATIVOS à pasta, não o path completo). */
export function buildExportObjectPaths(userId: string, entries: { name: string }[]): string[] {
  return entries
    .filter((e) => e.name && e.name.length > 0)
    .map((e) => `${userId}/${e.name}`);
}

/** Nomenclatura das linhas retornadas por `public.delete_user_data` (mesmas
 *  chaves do `jsonb_build_object` da migration) — usado só para somar um
 *  total de linhas removidas para o log estruturado, nunca para decidir
 *  ordem de exclusão (isso é responsabilidade exclusiva da função SQL,
 *  dentro de uma única transação atômica). */
export function totalDeletedRows(counts: Record<string, unknown>): number {
  return Object.values(counts).reduce((sum: number, v) => {
    const n = typeof v === "number" ? v : 0;
    return sum + n;
  }, 0);
}
