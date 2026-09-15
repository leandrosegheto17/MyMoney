// BE-F3-09 — testes unitários das funções puras de `lib.ts` (RED antes de
// existir, GREEN depois). Execução: deno test --allow-none
// supabase/functions/delete-account/lib.test.ts
//
// A remoção real de linhas em cada tabela (critério de aceite (a) da tarefa)
// é coberta com dado real via SQL em
// supabase/tests/be_f3_09_delete_account_data.test.sql — este arquivo cobre
// só a lógica pura que roda dentro da Edge Function (autorização de alvo,
// montagem de paths de Storage, lote de remoção, soma para log), sem
// depender de Postgres/Storage/Auth reais.

import { assert, assertEquals, assertFalse } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { buildExportObjectPaths, chunk, totalDeletedRows, validateTargetUserId } from "./lib.ts";

// ===================== validateTargetUserId — critério de aceite (d) =====================

Deno.test("validateTargetUserId: corpo sem user_id (undefined/null) é aceito — alvo é sempre o próprio autenticado", () => {
  const authenticated = "11111111-1111-1111-1111-111111111111";
  assertEquals(validateTargetUserId(undefined, authenticated), { ok: true });
  assertEquals(validateTargetUserId(null, authenticated), { ok: true });
});

Deno.test("validateTargetUserId: user_id igual ao autenticado é aceito (redundante, mas não é ataque)", () => {
  const authenticated = "11111111-1111-1111-1111-111111111111";
  assertEquals(validateTargetUserId(authenticated, authenticated), { ok: true });
});

Deno.test("validateTargetUserId: user_id de OUTRO usuário é rejeitado — critério de aceite (d) literal", () => {
  const authenticated = "11111111-1111-1111-1111-111111111111";
  const outroUsuario = "22222222-2222-2222-2222-222222222222";

  const result = validateTargetUserId(outroUsuario, authenticated);
  assert(!result.ok, "chamada tentando excluir outro usuário deveria ser rejeitada");
  if (!result.ok) {
    assertEquals(result.error, "forbidden_target_mismatch");
  }
});

Deno.test("validateTargetUserId: user_id de tipo inválido (não-string) é rejeitado, nunca tratado como ausente", () => {
  const authenticated = "11111111-1111-1111-1111-111111111111";

  const resultNumber = validateTargetUserId(12345, authenticated);
  assert(!resultNumber.ok);
  if (!resultNumber.ok) assertEquals(resultNumber.error, "invalid_user_id");

  const resultEmpty = validateTargetUserId("   ", authenticated);
  assert(!resultEmpty.ok);
  if (!resultEmpty.ok) assertEquals(resultEmpty.error, "invalid_user_id");

  const resultObject = validateTargetUserId({ id: authenticated }, authenticated);
  assert(!resultObject.ok);
  if (!resultObject.ok) assertEquals(resultObject.error, "invalid_user_id");
});

// ===================== buildExportObjectPaths =====================

Deno.test("buildExportObjectPaths: monta path completo <user_id>/<nome> a partir da listagem por pasta", () => {
  const userId = "11111111-1111-1111-1111-111111111111";
  const entries = [{ name: "a1b2c3.csv" }, { name: "d4e5f6.pdf" }];
  assertEquals(buildExportObjectPaths(userId, entries), [
    `${userId}/a1b2c3.csv`,
    `${userId}/d4e5f6.pdf`,
  ]);
});

Deno.test("buildExportObjectPaths: lista vazia devolve array vazio (nenhum export pendente é o caso comum)", () => {
  assertEquals(buildExportObjectPaths("11111111-1111-1111-1111-111111111111", []), []);
});

Deno.test("buildExportObjectPaths: entradas sem nome (ex. placeholder de pasta vazia do Storage) são ignoradas", () => {
  const userId = "11111111-1111-1111-1111-111111111111";
  const entries = [{ name: "" }, { name: "real.csv" }];
  assertEquals(buildExportObjectPaths(userId, entries), [`${userId}/real.csv`]);
});

// ===================== chunk =====================

Deno.test("chunk: divide em lotes do tamanho pedido, incluindo resto menor no último lote", () => {
  assertEquals(chunk([1, 2, 3, 4, 5], 2), [[1, 2], [3, 4], [5]]);
  assertEquals(chunk([1, 2, 3], 3), [[1, 2, 3]]);
  assertEquals(chunk<number>([], 10), []);
});

Deno.test("chunk: size <= 0 lança, nunca loop infinito silencioso", () => {
  let threw = false;
  try {
    chunk([1, 2], 0);
  } catch {
    threw = true;
  }
  assert(threw, "chunk(items, 0) deveria lançar");
});

// ===================== totalDeletedRows =====================

Deno.test("totalDeletedRows: soma as contagens numéricas de todas as tabelas", () => {
  assertEquals(
    totalDeletedRows({ accounts: 2, categories: 3, transactions: 10 }),
    15,
  );
});

Deno.test("totalDeletedRows: objeto vazio soma 0, valor não-numérico é ignorado (nunca lança/NaN)", () => {
  assertEquals(totalDeletedRows({}), 0);
  assertEquals(totalDeletedRows({ accounts: 2, weird: "not-a-number" as unknown as number }), 2);
  assertFalse(Number.isNaN(totalDeletedRows({ accounts: 2, weird: "x" as unknown as number })));
});
