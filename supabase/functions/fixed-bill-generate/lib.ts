// BE-F2-06 — Geração de lançamento previsto de conta fixa por competência
// (RF-F2-06 AC1). Helpers puros/testáveis, separados de `index.ts` (wiring
// HTTP) — mesmo princípio de backup-export/invoice-close/recurring-generate
// (automated-testing). Edge Function própria (não reaproveita
// recurring-generate): Contas Fixas é um Lote/bounded context separado de
// Recorrência & Parcelamento neste projeto (TASK.md Seção 6.3, DIR-09).

// ---- Autorização do gatilho (pg_cron/pg_net, sem JWT de usuário) ----

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

export interface FixedBillGenerateResult {
  ok: boolean;
  transactions_generated: number;
  error?: string;
}

export function buildResult(transactionsGenerated: number): FixedBillGenerateResult {
  return { ok: true, transactions_generated: transactionsGenerated };
}

export function buildErrorResult(message: string): FixedBillGenerateResult {
  return { ok: false, transactions_generated: 0, error: message };
}
