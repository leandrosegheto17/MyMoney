// BE-F2-06 — testes unitários dos helpers puros de `lib.ts` (RED antes de
// existir, GREEN depois). Execução:
// deno test supabase/functions/fixed-bill-generate/lib.test.ts

import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { buildErrorResult, buildResult, isAuthorizedCronRequest } from "./lib.ts";

Deno.test("isAuthorizedCronRequest: nega quando não há segredo configurado (fail-closed)", () => {
  assertEquals(isAuthorizedCronRequest("qualquer-coisa", null), false);
});

Deno.test("isAuthorizedCronRequest: nega quando não há header", () => {
  assertEquals(isAuthorizedCronRequest(null, "segredo-real"), false);
});

Deno.test("isAuthorizedCronRequest: nega quando os valores divergem", () => {
  assertEquals(isAuthorizedCronRequest("errado", "segredo-real"), false);
});

Deno.test("isAuthorizedCronRequest: nega quando os valores têm tamanhos diferentes", () => {
  assertEquals(isAuthorizedCronRequest("curto", "segredo-bem-mais-longo"), false);
});

Deno.test("isAuthorizedCronRequest: aceita quando os valores coincidem exatamente", () => {
  assertEquals(isAuthorizedCronRequest("segredo-real", "segredo-real"), true);
});

Deno.test("buildResult: monta payload de sucesso com a contagem do RPC", () => {
  assertEquals(buildResult(3), { ok: true, transactions_generated: 3 });
});

Deno.test("buildResult: aceita contagem zero (nenhuma conta fixa a gerar hoje)", () => {
  assertEquals(buildResult(0), { ok: true, transactions_generated: 0 });
});

Deno.test("buildErrorResult: monta payload de falha com a mensagem original preservada", () => {
  const result = buildErrorResult("RPC generate_fixed_bill_transactions falhou: boom");
  assert(!result.ok);
  assertEquals(result.transactions_generated, 0);
  assertEquals(result.error, "RPC generate_fixed_bill_transactions falhou: boom");
});
