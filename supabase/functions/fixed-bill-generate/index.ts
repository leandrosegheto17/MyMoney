// BE-F2-06 — Geração de lançamento previsto de conta fixa por competência
// (RF-F2-06 AC1).
//
// Disparada por `pg_cron` via `pg_net` (`public.trigger_fixed_bill_generate()`),
// NUNCA por um client autenticado — mesmo padrão de auth de
// supabase/functions/backup-export, invoice-close e recurring-generate
// (segredo compartilhado `X-Cron-Secret`, fail-closed, deployada com
// `--no-verify-jwt`).
//
// A lógica de negócio em si (RF-F2-06 AC1: quais contas fixas geram
// lançamento hoje, idempotência por competência) vive em Postgres
// (generate_fixed_bill_transactions, migration 20260903190000) — esta
// function é só o wiring de autenticação/agendamento, o RPC faz o trabalho
// real, atômico e já coberto por supabase/tests/be_f2_06_fixed_bills.test.sql.
//
// AC2 ("marcar como paga") não precisa de nenhum endpoint novo — achado de
// desenho documentado na migration: PATCH /transactions?id=eq.{id} com
// status=cleared já funciona (transactions_set_status só roda no INSERT,
// UPDATE de status já era livre desde o MVP) e o saldo já reflete o
// lançamento desde a criação (transactions_maintain_account_balance).

import { serviceClient } from "../_shared/supabase-clients.ts";
import { buildErrorResult, buildResult, isAuthorizedCronRequest } from "./lib.ts";

const CRON_SECRET = Deno.env.get("FIXED_BILL_GENERATE_CRON_SECRET") ?? null;

async function runFixedBillGenerate(): Promise<Response> {
  const client = serviceClient();

  const { data: transactionsGenerated, error } = await client.rpc(
    "generate_fixed_bill_transactions",
  );
  if (error) {
    const result = buildErrorResult(`generate_fixed_bill_transactions falhou: ${error.message}`);
    return new Response(JSON.stringify(result), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  const result = buildResult(
    typeof transactionsGenerated === "number" ? transactionsGenerated : 0,
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

  return await runFixedBillGenerate();
});
