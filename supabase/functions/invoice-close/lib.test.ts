// BE-F2-02 — testes unitários dos helpers puros de `lib.ts` (RED antes de
// existir, GREEN depois). Execução:
// deno test --allow-none supabase/functions/invoice-close/lib.test.ts

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

Deno.test("buildResult: monta payload de sucesso com as contagens dos 2 RPCs", () => {
  const result = buildResult(3, 1);
  assertEquals(result, { ok: true, cards_processed: 3, invoices_closed: 1 });
});

Deno.test("buildResult: aceita contagem zero (nenhum cartão/fatura a processar)", () => {
  const result = buildResult(0, 0);
  assertEquals(result, { ok: true, cards_processed: 0, invoices_closed: 0 });
});

Deno.test("buildErrorResult: monta payload de falha com a mensagem original preservada", () => {
  const result = buildErrorResult("RPC generate_upcoming_invoices falhou: boom");
  assert(!result.ok);
  assertEquals(result.cards_processed, 0);
  assertEquals(result.invoices_closed, 0);
  assertEquals(result.error, "RPC generate_upcoming_invoices falhou: boom");
});
