// BE-F3-08 — Job diário de expurgo de dado transitório (ADR-011, DIR-31/32).
//
// Disparada por `pg_cron` via `pg_net` (`public.trigger_data_retention_purge()`
// / `public.check_data_retention_health()`), NUNCA por um client autenticado —
// deployada com `--no-verify-jwt` (mesmo padrão de `backup-export`, BE-M-10).
// Autenticação por segredo compartilhado (`X-Cron-Secret`), fail-closed.
//
// Dois modos, via query string `?mode=`:
//   (default) purge — roda os sub-jobs de expurgo abaixo, cada um logado
//     individualmente em `public.data_retention_purge_log` (DIR-32, "execução
//     consultável"), sucesso ou falha. Falha de UM sub-job não impede os
//     demais de rodar (cada categoria de dado tem seu próprio orçamento de
//     falha — mesmo espírito de robustez de `runExport`/rotação em
//     `backup-export/index.ts`).
//   healthcheck — consulta `data_retention_purge_log` pelo último sucesso de
//     CADA sub-job implementado; se algum estiver stale (>26h), dispara
//     alerta por e-mail.
//
// Sub-jobs:
//   1. candidate_transaction_purge — via RPC `purge_expired_candidate_transactions`
//      (SECURITY DEFINER, faz o DELETE físico dentro do próprio Postgres).
//   2. export_purge — lista objetos expirados do bucket `exports` via RPC
//      `list_expired_export_objects`, remove via Storage API
//      (`storage.from('exports').remove(...)`, nunca DELETE direto em
//      storage.objects — só a Storage API garante remover o objeto físico
//      junto do metadado).
//
// RESOLUÇÃO DE BLOQUEIO (BLOCKERS.md Bloqueio 024, Resolvido —
// `ADR-020-foto-de-recibo-nunca-persistida-linhas-de-retencao-do-adr-011-sem-objeto.md`):
// um 3º sub-job (`confirmed_receipt_photo_purge`) existia nesta function como
// um "skip" registrado (`status: skipped_not_implemented`) enquanto a decisão
// de arquitetura estava pendente sobre se/como foto de recibo seria
// persistida. O Software Architect formalizou que foto de recibo NUNCA será
// persistida (decisão definitiva do stakeholder) — as 2 linhas de `ADR-011`
// sobre retenção de foto (90 dias/confirmado, 30 dias/candidato descartado)
// ficam sem objeto. Por isso esse 3º sub-job foi removido por completo (não
// existe mais nem como skip): não há, nem nunca haverá, foto para expurgar.
// Os 2 sub-jobs abaixo cobrem 100% do que de fato precisa ser expurgado.

import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2";
import {
  CANDIDATE_RETENTION_DAYS,
  chunk,
  exportCutoffIso,
  isAuthorizedCronRequest,
  isStale,
  overallStatus,
  type SubJobResult,
} from "./lib.ts";

const CRON_SECRET = Deno.env.get("DATA_RETENTION_CRON_SECRET") ?? null;
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? null;
const EMAIL_FROM = Deno.env.get("EMAIL_FROM") ?? null;
const ALERT_EMAIL_TO = Deno.env.get("DATA_RETENTION_ALERT_EMAIL_TO") ?? EMAIL_FROM;

// Client de service_role construído diretamente (mesmo padrão de
// `backup-export/index.ts`) — esta function só precisa de service_role,
// nunca do client anônimo de `_shared/supabase-clients.ts` (que existe para
// functions que também precisam identificar um usuário via JWT).
function adminClient(): SupabaseClient {
  const url = Deno.env.get("SUPABASE_URL")!;
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  return createClient(url, key, { auth: { persistSession: false } });
}

async function sendAlertEmail(subject: string, text: string): Promise<void> {
  if (!RESEND_API_KEY || !EMAIL_FROM || !ALERT_EMAIL_TO) {
    console.error("DATA RETENTION ALERT (e-mail não configurado, log apenas):", subject, text);
    return;
  }
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: EMAIL_FROM, to: [ALERT_EMAIL_TO], subject, text }),
    });
    if (!res.ok) {
      console.error("Falha ao enviar e-mail de alerta de retenção:", res.status, await res.text());
    }
  } catch (err) {
    console.error("Falha ao enviar e-mail de alerta de retenção:", err);
  }
}

async function logSubJob(client: SupabaseClient, startedAt: string, result: SubJobResult): Promise<void> {
  const { error } = await client.from("data_retention_purge_log").insert({
    job_name: result.job_name,
    started_at: startedAt,
    finished_at: new Date().toISOString(),
    status: result.status,
    detail: result.detail,
    error_message: result.error_message,
  });
  if (error) {
    console.error(`Falha ao registrar log de ${result.job_name}:`, error.message);
  }
}

async function runCandidateTransactionPurge(client: SupabaseClient): Promise<SubJobResult> {
  try {
    const { data, error } = await client.rpc("purge_expired_candidate_transactions", {
      p_retention_days: CANDIDATE_RETENTION_DAYS,
    });
    if (error) throw new Error(error.message);
    return {
      job_name: "candidate_transaction_purge",
      status: "success",
      detail: { deleted_count: data ?? 0, retention_days: CANDIDATE_RETENTION_DAYS },
      error_message: null,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { job_name: "candidate_transaction_purge", status: "failure", detail: {}, error_message: message };
  }
}

async function runExportPurge(client: SupabaseClient): Promise<SubJobResult> {
  try {
    const cutoff = exportCutoffIso(new Date());
    const { data, error } = await client.rpc("list_expired_export_objects", { p_before: cutoff });
    if (error) throw new Error(error.message);

    const paths: string[] = (data ?? []).map((row: { name: string }) => row.name);
    let removedCount = 0;
    for (const batch of chunk<string>(paths, 100)) {
      if (batch.length === 0) continue;
      const { error: removeError } = await client.storage.from("exports").remove(batch);
      if (removeError) throw new Error(`falha ao remover lote de exports: ${removeError.message}`);
      removedCount += batch.length;
    }

    return {
      job_name: "export_purge",
      status: "success",
      detail: { removed_count: removedCount, cutoff },
      error_message: null,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { job_name: "export_purge", status: "failure", detail: {}, error_message: message };
  }
}

async function runPurge(): Promise<Response> {
  const client = adminClient();
  const startedAt = new Date().toISOString();

  const results: SubJobResult[] = [
    await runCandidateTransactionPurge(client),
    await runExportPurge(client),
  ];

  for (const result of results) {
    await logSubJob(client, startedAt, result);
  }

  const failed = results.filter((r) => r.status === "failure");
  if (failed.length > 0) {
    await sendAlertEmail(
      "[MyMoney] Falha no job diário de expurgo de dado transitório",
      `O job de expurgo diário (BE-F3-08, ADR-011) teve ${failed.length} sub-job(s) com falha em ${startedAt}.\n\n` +
        failed.map((r) => `- ${r.job_name}: ${r.error_message}`).join("\n"),
    );
  }

  return new Response(
    JSON.stringify({ ok: failed.length === 0, results }),
    { status: failed.length === 0 ? 200 : 500, headers: { "Content-Type": "application/json" } },
  );
}

async function runHealthcheck(): Promise<Response> {
  const client = adminClient();
  const jobNames = ["candidate_transaction_purge", "export_purge"] as const;
  const staleJobs: string[] = [];

  for (const jobName of jobNames) {
    const { data, error } = await client
      .from("data_retention_purge_log")
      .select("finished_at")
      .eq("job_name", jobName)
      .eq("status", "success")
      .order("finished_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error(`Healthcheck de retenção: falha ao consultar log de ${jobName}`, error.message);
      staleJobs.push(jobName);
      continue;
    }

    const lastSuccessAt = data?.finished_at ? new Date(data.finished_at as string) : null;
    if (isStale(lastSuccessAt, new Date())) {
      staleJobs.push(jobName);
    }
  }

  if (staleJobs.length > 0) {
    await sendAlertEmail(
      "[MyMoney] Alerta: job de expurgo de dado sem execução recente (>26h)",
      `Sub-job(s) sem sucesso registrado nas últimas 26h (DIR-32): ${staleJobs.join(", ")}.`,
    );
  }

  return new Response(
    JSON.stringify({ ok: true, stale_jobs: staleJobs }),
    { status: 200, headers: { "Content-Type": "application/json" } },
  );
}

Deno.serve(async (req: Request) => {
  const url = new URL(req.url);
  const cronSecretHeader = req.headers.get("x-cron-secret");

  if (!isAuthorizedCronRequest(cronSecretHeader, CRON_SECRET)) {
    return new Response(JSON.stringify({ ok: false, error: "unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (url.searchParams.get("mode") === "healthcheck") {
    return await runHealthcheck();
  }
  return await runPurge();
});

// Exportado só para clareza de teste (overallStatus é usada por lib.test.ts).
export { overallStatus };
