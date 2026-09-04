// BE-F2-02 — Fechamento de fatura (RN-01) + geração antecipada de invoice
// para competência atual + 2 futuras (DIR-13).
//
// Disparada por `pg_cron` via `pg_net` (`public.trigger_invoice_close()`),
// NUNCA por um client autenticado — mesmo padrão de auth de
// supabase/functions/backup-export (segredo compartilhado `X-Cron-Secret`,
// fail-closed, deployada com `--no-verify-jwt` — não há JWT de usuário no
// contexto de um cron job).
//
// A lógica de negócio em si (RN-01: qual competência um lançamento pertence;
// RF-F2-05 AC3: quando uma fatura fecha) vive em Postgres
// (credit_card_invoice_competencia/close_due_invoices/
// generate_upcoming_invoices, migration 20260903130000) — esta function é só
// o wiring de autenticação/agendamento/log, os dois RPCs fazem o trabalho
// real, atômico e já coberto por supabase/tests/be_f2_02_invoices.test.sql.
// A atribuição de fatura por lançamento (item mais crítico de RN-01) já
// acontece de forma síncrona no INSERT de `transactions` (trigger dedicado) —
// esta function só cuida da geração antecipada (DIR-13) e do fechamento por
// status, para leitura (RF-F2-05 AC3).

import { serviceClient } from "../_shared/supabase-clients.ts";
import { buildErrorResult, buildResult, isAuthorizedCronRequest } from "./lib.ts";

const CRON_SECRET = Deno.env.get("INVOICE_CLOSE_CRON_SECRET") ?? null;

async function runInvoiceClose(): Promise<Response> {
  const client = serviceClient();

  const { data: cardsProcessed, error: genError } = await client.rpc(
    "generate_upcoming_invoices",
  );
  if (genError) {
    const result = buildErrorResult(`generate_upcoming_invoices falhou: ${genError.message}`);
    return new Response(JSON.stringify(result), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { data: invoicesClosed, error: closeError } = await client.rpc("close_due_invoices");
  if (closeError) {
    const result = buildErrorResult(`close_due_invoices falhou: ${closeError.message}`);
    return new Response(JSON.stringify(result), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  const result = buildResult(
    typeof cardsProcessed === "number" ? cardsProcessed : 0,
    typeof invoicesClosed === "number" ? invoicesClosed : 0,
  );
  return new Response(JSON.stringify(result), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  const cronSecretHeader = req.headers.get("x-cron-secret");

  if (!isAuthorizedCronRequest(cronSecretHeader, CRON_SECRET)) {
    return new Response(JSON.stringify({ ok: false, error: "unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  return await runInvoiceClose();
});
