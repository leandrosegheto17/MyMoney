// BE-F2-09 — testes unitários dos helpers puros de `lib.ts` (RED antes de
// existir, GREEN depois). Execução:
// deno test supabase/functions/push-dispatch/lib.test.ts

import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { buildPushPayload, isAuthorizedCronRequest, isExpiredSubscriptionStatus } from "./lib.ts";

Deno.test("isAuthorizedCronRequest: nega quando não há segredo configurado (fail-closed)", () => {
  assertEquals(isAuthorizedCronRequest("qualquer-coisa", null), false);
});

Deno.test("isAuthorizedCronRequest: nega quando não há header", () => {
  assertEquals(isAuthorizedCronRequest(null, "segredo-real"), false);
});

Deno.test("isAuthorizedCronRequest: aceita quando os valores coincidem exatamente", () => {
  assertEquals(isAuthorizedCronRequest("segredo-real", "segredo-real"), true);
});

Deno.test("buildPushPayload: notificação de orçamento monta título/corpo/data corretos", () => {
  const payload = buildPushPayload({
    id: "11111111-1111-1111-1111-111111111111",
    user_id: "22222222-2222-2222-2222-222222222222",
    type: "budget_alert",
    message: "Orçamento de Alimentação está próximo do teto (85% gasto)",
    related_entity_type: "budget_warning",
    related_entity_id: "33333333-3333-3333-3333-333333333333",
  });
  assertEquals(payload.title, "Orçamento");
  assertEquals(payload.body, "Orçamento de Alimentação está próximo do teto (85% gasto)");
  assertEquals(payload.data.notification_id, "11111111-1111-1111-1111-111111111111");
  assertEquals(payload.data.type, "budget_alert");
  assertEquals(payload.data.related_entity_type, "budget_warning");
});

Deno.test("buildPushPayload: notificação de conta fixa monta título correto", () => {
  const payload = buildPushPayload({
    id: "id",
    user_id: "user",
    type: "fixed_bill_due",
    message: "Aluguel vence em 15/09",
    related_entity_type: "fixed_bill",
    related_entity_id: "bill-id",
  });
  assertEquals(payload.title, "Conta fixa");
  assertEquals(payload.body, "Aluguel vence em 15/09");
});

Deno.test("isExpiredSubscriptionStatus: reconhece 404 e 410 como expirado", () => {
  assertEquals(isExpiredSubscriptionStatus(404), true);
  assertEquals(isExpiredSubscriptionStatus(410), true);
});

Deno.test("isExpiredSubscriptionStatus: não trata outros códigos como expirado", () => {
  assertEquals(isExpiredSubscriptionStatus(200), false);
  assertEquals(isExpiredSubscriptionStatus(500), false);
  assertEquals(isExpiredSubscriptionStatus(undefined), false);
});
