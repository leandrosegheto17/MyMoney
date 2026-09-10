// BE-F3-08 — Job diário de expurgo de dado transitório (ADR-011, DIR-31/32).
// Helpers puros/testáveis, separados de `index.ts` (wiring HTTP) — mesmo
// princípio de `backup-export/lib.ts`/`report-export/lib.ts`: rodar `deno
// test` sem depender de conexão real ao Postgres/Storage.

/** Fronteira do sub-job de exports (ADR-011: "até 24h após a geração"). */
export const EXPORT_RETENTION_HOURS = 24;

/** Fronteira do sub-job de CandidateTransaction (ADR-011: "30 dias"). */
export const CANDIDATE_RETENTION_DAYS = 30;

/** `now() - EXPORT_RETENTION_HOURS`, no formato ISO exigido pela RPC `list_expired_export_objects`. */
export function exportCutoffIso(now: Date, retentionHours = EXPORT_RETENTION_HOURS): string {
  return new Date(now.getTime() - retentionHours * 60 * 60 * 1000).toISOString();
}

/** Divide um array em blocos de tamanho `size` — Storage `.remove()` aceita um lote por chamada,
 *  mas um número muito grande de paths numa única chamada é evitado por segurança de payload. */
export function chunk<T>(items: T[], size: number): T[][] {
  if (size <= 0) throw new Error("chunk: size deve ser > 0");
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    out.push(items.slice(i, i + size));
  }
  return out;
}

// ---- Autorização do gatilho (pg_cron/pg_net, sem JWT de usuário) — mesmo
// mecanismo fail-closed de backup-export/lib.ts. ----

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** Fail-closed: sem segredo configurado, ou sem header, ou valores diferentes -> nega. */
export function isAuthorizedCronRequest(
  headerValue: string | null,
  expectedSecret: string | null,
): boolean {
  if (!expectedSecret) return false;
  if (!headerValue) return false;
  return timingSafeEqual(headerValue, expectedSecret);
}

/** DIR-32: "alerta se o job não rodar por >26h" — mesmo limiar de backup-export/lib.ts. */
export function isStale(
  lastSuccessAt: Date | null,
  now: Date,
  thresholdHours = 26,
): boolean {
  if (lastSuccessAt === null) return true;
  const diffMs = now.getTime() - lastSuccessAt.getTime();
  return diffMs > thresholdHours * 60 * 60 * 1000;
}

export interface SubJobResult {
  job_name: "candidate_transaction_purge" | "export_purge";
  status: "success" | "failure";
  detail: Record<string, unknown>;
  error_message: string | null;
}

/** Resultado agregado de sucesso/falha de todos os sub-jobs — usado para decidir o HTTP status. */
export function overallStatus(results: SubJobResult[]): "success" | "failure" {
  return results.some((r) => r.status === "failure") ? "failure" : "success";
}
