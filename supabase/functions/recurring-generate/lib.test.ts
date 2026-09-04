// BE-F2-03 — testes unitários dos helpers puros de `lib.ts` (RED antes de
// existir, GREEN depois). Execução:
// deno test supabase/functions/recurring-generate/lib.test.ts

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

Deno.test("buildResult: monta payload de sucesso com as contagens dos 2 RPCs (BE-F2-05)", () => {
  assertEquals(buildResult(4, 2), {
    ok: true,
    recurring_transactions_generated: 4,
    installment_transactions_generated: 2,
  });
});

Deno.test("buildResult: aceita contagem zero nos 2 RPCs (nada a gerar hoje)", () => {
  assertEquals(buildResult(0, 0), {
    ok: true,
    recurring_transactions_generated: 0,
    installment_transactions_generated: 0,
  });
});

Deno.test("buildErrorResult: monta payload de falha com a mensagem original preservada", () => {
  const result = buildErrorResult("RPC generate_recurring_transactions falhou: boom");
  assert(!result.ok);
  assertEquals(result.recurring_transactions_generated, 0);
  assertEquals(result.installment_transactions_generated, 0);
  assertEquals(result.error, "RPC generate_recurring_transactions falhou: boom");
});
