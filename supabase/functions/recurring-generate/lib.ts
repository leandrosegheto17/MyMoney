// BE-F2-03 — Geração mensal de lançamento recorrente (RF-F2-02 AC1).
// BE-F2-05 — estendida para também gerar parcela de compra parcelada
// (RF-F2-04 AC1/AC2): Recorrência e Parcelamento são o mesmo bounded
// context/Lote neste projeto (TASK.md Seção 6.3, DIR-09), reaproveitar o
// mesmo job diário evita duplicar Edge Function/pg_cron/secret/Vault para a
// mesma cadência (DIR-06 "não duplicada"). Helpers puros/testáveis,
// separados de `index.ts` (wiring HTTP) — mesmo princípio de
// supabase/functions/backup-export/lib.ts e invoice-close/lib.ts
// (automated-testing).

// ---- Autorização do gatilho (pg_cron/pg_net, sem JWT de usuário) ----
// Mesma lógica de backup-export/invoice-close — autocontida por Edge Function
// de propósito (cada uma decide seu próprio segredo/env var).

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

export interface RecurringGenerateResult {
  ok: boolean;
  recurring_transactions_generated: number;
  installment_transactions_generated: number;
  error?: string;
}

export function buildResult(
  recurringGenerated: number,
  installmentsGenerated: number,
): RecurringGenerateResult {
  return {
    ok: true,
    recurring_transactions_generated: recurringGenerated,
    installment_transactions_generated: installmentsGenerated,
  };
}

export function buildErrorResult(message: string): RecurringGenerateResult {
  return {
    ok: false,
    recurring_transactions_generated: 0,
    installment_transactions_generated: 0,
    error: message,
  };
}
