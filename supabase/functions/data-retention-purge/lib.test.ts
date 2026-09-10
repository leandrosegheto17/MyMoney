// BE-F3-08 — testes unitários das funções puras de `lib.ts` (RED antes de
// existir, GREEN depois). Execução: deno test --allow-none
// supabase/functions/data-retention-purge/lib.test.ts
//
// A fronteira de retenção em si (30 dias de CandidateTransaction, 24h de
// export) é coberta com dado real via SQL em
// supabase/tests/be_f3_08_data_retention_purge_jobs.test.sql (CASO 3-7) —
// este arquivo cobre só a lógica pura de cálculo/lote/autorização que roda
// dentro da Edge Function, sem depender de Postgres/Storage reais.

import { assert, assertEquals, assertFalse } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  CANDIDATE_RETENTION_DAYS,
  chunk,
  EXPORT_RETENTION_HOURS,
  exportCutoffIso,
  isAuthorizedCronRequest,
  isStale,
  overallStatus,
  type SubJobResult,
} from "./lib.ts";

Deno.test("EXPORT_RETENTION_HOURS/CANDIDATE_RETENTION_DAYS refletem ADR-011 literal", () => {
  assertEquals(EXPORT_RETENTION_HOURS, 24);
  assertEquals(CANDIDATE_RETENTION_DAYS, 30);
});

Deno.test("exportCutoffIso: fronteira de 24h — objeto criado exatamente no cutoff não é 'antes' dele mesmo", () => {
  const now = new Date("2026-09-10T12:00:00.000Z");
  const cutoff = exportCutoffIso(now);
  assertEquals(cutoff, "2026-09-09T12:00:00.000Z");
});

Deno.test("exportCutoffIso: retentionHours customizado é respeitado", () => {
  const now = new Date("2026-09-10T12:00:00.000Z");
  assertEquals(exportCutoffIso(now, 1), "2026-09-10T11:00:00.000Z");
});

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

Deno.test("isAuthorizedCronRequest: fail-closed nos 3 jeitos de faltar dado", () => {
  assertFalse(isAuthorizedCronRequest(null, null));
  assertFalse(isAuthorizedCronRequest(null, "secret"));
  assertFalse(isAuthorizedCronRequest("secret", null));
  assertFalse(isAuthorizedCronRequest("wrong", "secret"));
  assert(isAuthorizedCronRequest("secret", "secret"));
});

Deno.test("isStale: fronteira de 26h nos dois sentidos, e 'nunca rodou' é sempre stale", () => {
  const now = new Date("2026-09-10T12:00:00.000Z");
  assert(isStale(null, now));
  assertFalse(isStale(new Date("2026-09-10T00:00:01.000Z"), now)); // 11h59m59s atrás — dentro do limiar
  assert(isStale(new Date("2026-09-09T09:59:59.000Z"), now)); // 26h00m01s atrás — além do limiar
});

Deno.test("overallStatus: qualquer sub-job com failure marca o conjunto como failure", () => {
  const success: SubJobResult = { job_name: "candidate_transaction_purge", status: "success", detail: {}, error_message: null };
  const failure: SubJobResult = { job_name: "export_purge", status: "failure", detail: {}, error_message: "boom" };

  assertEquals(overallStatus([success]), "success");
  assertEquals(overallStatus([success, failure]), "failure");
  assertEquals(overallStatus([failure]), "failure");
});
