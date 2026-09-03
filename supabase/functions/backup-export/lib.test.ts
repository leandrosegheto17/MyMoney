// BE-M-10 — testes unitários das funções puras de `lib.ts` (RED antes de
// existir, GREEN depois). Execução: deno test --allow-none
// supabase/functions/backup-export/lib.test.ts

import {
  assert,
  assertEquals,
  assertNotEquals,
  assertRejects,
} from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  BACKUP_TABLES,
  buildObjectKey,
  isStale,
  sortKeysNewestFirst,
  objectsToDelete,
  importAesKey,
  encryptPayload,
  decryptPayload,
  bytesToBase64,
  isAuthorizedCronRequest,
} from "./lib.ts";

Deno.test("BACKUP_TABLES inclui as tabelas de produto auditadas (BE-M-00/BE-M-01) e exclui as efêmeras", () => {
  for (
    const t of [
      "profiles",
      "accounts",
      "categories",
      "payment_methods",
      "transactions",
      "budget",
    ]
  ) {
    assert(
      (BACKUP_TABLES as readonly string[]).includes(t),
      `${t} deveria estar em BACKUP_TABLES`,
    );
  }
  assert(
    !(BACKUP_TABLES as readonly string[]).includes("webauthn_challenges"),
    "webauthn_challenges (TTL de minutos) não deve ser incluída no backup",
  );
  assert(
    !(BACKUP_TABLES as readonly string[]).includes("backup_export_log"),
    "backup_export_log (metadado do próprio job) não deve ser incluída no backup",
  );
});

Deno.test("buildObjectKey gera chave particionada por data, determinística para o mesmo instante", () => {
  const d = new Date("2026-09-03T03:00:00.000Z");
  const key = buildObjectKey(d);
  assertEquals(
    key,
    "mymoney-backups/2026-09-03/export-2026-09-03T03-00-00-000Z.json.enc",
  );
});

Deno.test("isStale: null (nunca rodou) é sempre stale", () => {
  assertEquals(isStale(null, new Date()), true);
});

Deno.test("isStale: sucesso recente (1h atrás) não é stale (limiar 26h)", () => {
  const now = new Date("2026-09-03T10:00:00Z");
  const last = new Date("2026-09-03T09:00:00Z");
  assertEquals(isStale(last, now), false);
});

Deno.test("isStale: sucesso há 27h é stale (DIR-32, limiar 26h)", () => {
  const now = new Date("2026-09-03T10:00:00Z");
  const last = new Date("2026-09-02T07:00:00Z"); // 27h antes
  assertEquals(isStale(last, now), true);
});

Deno.test("isStale: exatamente no limiar (26h) ainda não é stale (comparação estrita)", () => {
  const now = new Date("2026-09-03T10:00:00Z");
  const last = new Date("2026-09-02T08:00:00Z"); // exatamente 26h
  assertEquals(isStale(last, now), false);
});

Deno.test("sortKeysNewestFirst ordena por data desc (prefixo ISO na própria chave)", () => {
  const keys = [
    "mymoney-backups/2026-09-01/export-a.json.enc",
    "mymoney-backups/2026-09-03/export-c.json.enc",
    "mymoney-backups/2026-09-02/export-b.json.enc",
  ];
  assertEquals(sortKeysNewestFirst(keys), [
    "mymoney-backups/2026-09-03/export-c.json.enc",
    "mymoney-backups/2026-09-02/export-b.json.enc",
    "mymoney-backups/2026-09-01/export-a.json.enc",
  ]);
});

Deno.test("objectsToDelete mantém só os 30 mais novos, retorna o excedente (ADR-011, rotação)", () => {
  const keys = Array.from({ length: 35 }, (_, i) => `k${i}`); // já "mais novo primeiro"
  const toDelete = objectsToDelete(keys, 30);
  assertEquals(toDelete.length, 5);
  assertEquals(toDelete, ["k30", "k31", "k32", "k33", "k34"]);
});

Deno.test("objectsToDelete com <= 30 chaves não apaga nada", () => {
  const keys = Array.from({ length: 10 }, (_, i) => `k${i}`);
  assertEquals(objectsToDelete(keys, 30), []);
});

Deno.test("encryptPayload/decryptPayload: round-trip preserva o conteúdo original (AES-256-GCM, DIR-31)", async () => {
  const rawKey = crypto.getRandomValues(new Uint8Array(32));
  const b64Key = bytesToBase64(rawKey);
  const key = await importAesKey(b64Key);
  const original = JSON.stringify({ hello: "mymoney", n: 123 });
  const plaintext = new TextEncoder().encode(original);

  const encrypted = await encryptPayload(key, plaintext);
  assertNotEquals(encrypted.length, plaintext.length); // IV (12) + tag (16) agregados

  const decrypted = await decryptPayload(key, encrypted);
  assertEquals(new TextDecoder().decode(decrypted), original);
});

Deno.test("encryptPayload gera IV diferente a cada chamada (nunca reaproveita nonce)", async () => {
  const rawKey = crypto.getRandomValues(new Uint8Array(32));
  const key = await importAesKey(bytesToBase64(rawKey));
  const plaintext = new TextEncoder().encode("mesmo conteúdo");

  const e1 = await encryptPayload(key, plaintext);
  const e2 = await encryptPayload(key, plaintext);

  assertNotEquals(bytesToBase64(e1.slice(0, 12)), bytesToBase64(e2.slice(0, 12)));
});

Deno.test("importAesKey rejeita chave de tamanho errado (não 32 bytes)", async () => {
  const shortKey = bytesToBase64(new Uint8Array(16));
  await assertRejects(() => importAesKey(shortKey));
});

Deno.test("isAuthorizedCronRequest: nega se o segredo não está configurado (fail-closed)", () => {
  assertEquals(isAuthorizedCronRequest("abc", null), false);
});

Deno.test("isAuthorizedCronRequest: nega se o header está ausente", () => {
  assertEquals(isAuthorizedCronRequest(null, "abc"), false);
});

Deno.test("isAuthorizedCronRequest: nega se os valores divergem", () => {
  assertEquals(isAuthorizedCronRequest("wrong", "abc"), false);
});

Deno.test("isAuthorizedCronRequest: aceita se os valores conferem", () => {
  assertEquals(isAuthorizedCronRequest("abc", "abc"), true);
});
