// BE-F2-03 — Geração mensal automática de lançamento recorrente (RF-F2-02
// AC1).
// BE-F2-05 — estendida para também gerar parcela de compra parcelada
// (RF-F2-04 AC1/AC2, generate_installment_transactions, migration
// 20260903180000). Recorrência e Parcelamento são o mesmo bounded context/
// Lote neste projeto (TASK.md Seção 6.3) — reaproveita deliberadamente o
// mesmo job diário/segredo/cron em vez de duplicar infraestrutura (DIR-06).
//
// Disparada por `pg_cron` via `pg_net` (`public.trigger_recurring_generate()`),
// NUNCA por um client autenticado — mesmo padrão de auth de
// supabase/functions/backup-export e invoice-close (segredo compartilhado
// `X-Cron-Secret`, fail-closed, deployada com `--no-verify-jwt`).
//
// A lógica de negócio em si (quais templates/planos geram lançamento hoje,
// idempotência) vive em Postgres (generate_recurring_transactions,
// generate_installment_transactions) — esta function é só o wiring de
// autenticação/agendamento, os RPCs fazem o trabalho real, atômico e já
// cobertos por supabase/tests/be_f2_03_recurring_templates.test.sql e
// supabase/tests/be_f2_05_installment_purchases.test.sql.

import { serviceClient } from "../_shared/supabase-clients.ts";
import { buildErrorResult, buildResult, isAuthorizedCronRequest } from "./lib.ts";

const CRON_SECRET = Deno.env.get("RECURRING_GENERATE_CRON_SECRET") ?? null;

async function runRecurringGenerate(): Promise<Response> {
  const client = serviceClient();

  const { data: recurringGenerated, error: recurringError } = await client.rpc(
    "generate_recurring_transactions",
  );
  if (recurringError) {
    const result = buildErrorResult(
      `generate_recurring_transactions falhou: ${recurringError.message}`,
    );
    return new Response(JSON.stringify(result), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { data: installmentsGenerated, error: installmentsError } = await client.rpc(
    "generate_installment_transactions",
  );
  if (installmentsError) {
    const result = buildErrorResult(
      `generate_installment_transactions falhou: ${installmentsError.message}`,
    );
    return new Response(JSON.stringify(result), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  const result = buildResult(
    typeof recurringGenerated === "number" ? recurringGenerated : 0,
    typeof installmentsGenerated === "number" ? installmentsGenerated : 0,
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

  return await runRecurringGenerate();
});
