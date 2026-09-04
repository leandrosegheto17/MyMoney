// BE-F2-02 — Fechamento de fatura (RN-01) + geração antecipada (DIR-13).
// Helpers puros/testáveis, separados de `index.ts` (wiring HTTP) — mesmo
// princípio de supabase/functions/backup-export/lib.ts (automated-testing).

// ---- Autorização do gatilho (pg_cron/pg_net, sem JWT de usuário) ----
// Mesma lógica de backup-export/lib.ts — não movida para _shared por ser uma
// função pequena e autocontida por Edge Function (cada uma decide seu próprio
// segredo/env var; nenhuma dependência cruzada entre functions).

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

export interface InvoiceCloseResult {
  ok: boolean;
  cards_processed: number;
  invoices_closed: number;
  error?: string;
}

/** Formata o corpo de resposta a partir dos 2 RPCs (contagens simples, sem
 *  estado adicional) — separado do wiring HTTP para ser testável sem rede. */
export function buildResult(
  cardsProcessed: number,
  invoicesClosed: number,
): InvoiceCloseResult {
  return { ok: true, cards_processed: cardsProcessed, invoices_closed: invoicesClosed };
}

export function buildErrorResult(message: string): InvoiceCloseResult {
  return { ok: false, cards_processed: 0, invoices_closed: 0, error: message };
}
