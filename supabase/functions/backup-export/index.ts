// BE-M-10 — Export lógico diário de backup (ADR-009, DIR-31/32, ADR-011 rotação).
//
// Disparada por `pg_cron` via `pg_net` (`public.trigger_backup_export()` /
// `public.check_backup_health()`), NUNCA por um client autenticado — por isso
// esta função é deployada com `--no-verify-jwt` (não há JWT de usuário no
// contexto de um cron job). A autenticação é por segredo compartilhado
// (`X-Cron-Secret`), fail-closed (`lib.ts:isAuthorizedCronRequest` — nega se o
// segredo não estiver configurado, mesmo que o header também esteja ausente).
//
// Dois modos, via query string `?mode=`:
//   (default) export — dump lógico de `BACKUP_TABLES` (service_role, ignora
//     RLS deliberadamente — é o próprio propósito de um backup completo),
//     criptografado (AES-256-GCM, DIR-31) e enviado a um bucket S3-compatível
//     fora do Supabase (vendor-agnóstico: AWS S3/Backblaze B2/Cloudflare R2/
//     MinIO — mesmo espírito de DIR-22, nunca amarrado 1:1 a um vendor).
//     Rotação: mantém só os últimos 30 snapshots diários (ADR-011). Log
//     sempre em `public.backup_export_log`, sucesso ou falha (DIR-32).
//   healthcheck — consulta `backup_export_log` pelo último sucesso; se >26h
//     (ou nunca rodou), dispara alerta por e-mail (DIR-32 — "não é fire and
//     forget").
//
// Nota de achado (Backend, BE-M-10, 2026-09-03): as credenciais reais do
// bucket S3-compatível (`BACKUP_S3_*`) não existem nesta sessão — só o
// próprio Backend conseguiu configurar `BACKUP_CRON_SECRET`/
// `BACKUP_ENCRYPTION_KEY` (material interno gerado pelo sistema). O
// provisionamento de uma conta/bucket real de storage externo depende do
// stakeholder (mesmo padrão do Bloqueio 004 do DevOps para credenciais
// Vercel) — ver `BLOCKERS.md` Bloqueio 006. Até lá, a execução diária real
// falha de forma controlada (log de falha + e-mail de alerta), nunca
// silenciosamente.

import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2";
import { AwsClient } from "npm:aws4fetch@1.0.20";
import {
  BACKUP_TABLES,
  buildObjectKey,
  encryptPayload,
  importAesKey,
  isAuthorizedCronRequest,
  isStale,
  objectsToDelete,
  sortKeysNewestFirst,
  toArrayBuffer,
} from "./lib.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const CRON_SECRET = Deno.env.get("BACKUP_CRON_SECRET") ?? null;
const ENCRYPTION_KEY_B64 = Deno.env.get("BACKUP_ENCRYPTION_KEY") ?? null;
const S3_ENDPOINT = Deno.env.get("BACKUP_S3_ENDPOINT") ?? null;
const S3_BUCKET = Deno.env.get("BACKUP_S3_BUCKET") ?? null;
const S3_REGION = Deno.env.get("BACKUP_S3_REGION") ?? "auto";
const S3_ACCESS_KEY_ID = Deno.env.get("BACKUP_S3_ACCESS_KEY_ID") ?? null;
const S3_SECRET_ACCESS_KEY = Deno.env.get("BACKUP_S3_SECRET_ACCESS_KEY") ?? null;
// Reaproveita os secrets já existentes de _shared/email.ts (auth-email-mfa),
// só leitura via env var — não importa nem toca no módulo legado (BE-M-09
// segue Bloqueada, fora de escopo desta tarefa).
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? null;
const EMAIL_FROM = Deno.env.get("EMAIL_FROM") ?? null;
const ALERT_EMAIL_TO = Deno.env.get("BACKUP_ALERT_EMAIL_TO") ?? EMAIL_FROM;

function serviceClient(): SupabaseClient {
  return createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });
}

async function sendAlertEmail(subject: string, text: string): Promise<void> {
  if (!RESEND_API_KEY || !EMAIL_FROM || !ALERT_EMAIL_TO) {
    console.error("BACKUP ALERT (e-mail não configurado, log apenas):", subject, text);
    return;
  }
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from: EMAIL_FROM, to: [ALERT_EMAIL_TO], subject, text }),
    });
    if (!res.ok) {
      console.error("Falha ao enviar e-mail de alerta de backup:", res.status, await res.text());
    }
  } catch (err) {
    console.error("Falha ao enviar e-mail de alerta de backup:", err);
  }
}

async function logResult(
  client: SupabaseClient,
  startedAt: string,
  status: "success" | "failure",
  objectKey: string | null,
  sizeBytes: number | null,
  errorMessage: string | null,
): Promise<void> {
  const { error } = await client.from("backup_export_log").insert({
    started_at: startedAt,
    finished_at: new Date().toISOString(),
    status,
    object_key: objectKey,
    size_bytes: sizeBytes,
    error_message: errorMessage,
  });
  if (error) {
    console.error("Falha ao registrar log de backup:", error.message);
  }
}

async function runExport(): Promise<Response> {
  const startedAt = new Date().toISOString();
  const client = serviceClient();

  try {
    if (!ENCRYPTION_KEY_B64) {
      throw new Error("BACKUP_ENCRYPTION_KEY não configurada");
    }
    if (!S3_ENDPOINT || !S3_BUCKET || !S3_ACCESS_KEY_ID || !S3_SECRET_ACCESS_KEY) {
      throw new Error(
        "Storage externo não configurado (BACKUP_S3_ENDPOINT/BUCKET/ACCESS_KEY_ID/" +
          "SECRET_ACCESS_KEY ausentes) — ver BLOCKERS.md Bloqueio 006",
      );
    }

    // 1. Dump lógico de todas as tabelas de produto (service_role, ignora RLS
    //    deliberadamente — é o próprio propósito de um backup completo).
    const tables: Record<string, unknown[]> = {};
    for (const table of BACKUP_TABLES) {
      const { data, error } = await client.from(table).select("*");
      if (error) throw new Error(`Falha ao ler ${table}: ${error.message}`);
      tables[table] = data ?? [];
    }
    const plaintext = new TextEncoder().encode(
      JSON.stringify({ generated_at: startedAt, tables }),
    );

    // 2. Criptografia antes de sair do perímetro do Supabase (DIR-31).
    const key = await importAesKey(ENCRYPTION_KEY_B64);
    const encrypted = await encryptPayload(key, plaintext);

    // 3. Upload S3-compatível (vendor-agnóstico).
    const objectKey = buildObjectKey(new Date(startedAt));
    const aws = new AwsClient({
      accessKeyId: S3_ACCESS_KEY_ID,
      secretAccessKey: S3_SECRET_ACCESS_KEY,
      region: S3_REGION,
      service: "s3",
    });
    const putRes = await aws.fetch(`${S3_ENDPOINT}/${S3_BUCKET}/${objectKey}`, {
      method: "PUT",
      // `ArrayBuffer` explícito (via `toArrayBuffer`) em vez de `Uint8Array`
      // diretamente — contorna incompatibilidade de tipo entre
      // `Uint8Array<ArrayBufferLike>` e `BodyInit` no lib.dom atual, sem
      // afetar o conteúdo binário transmitido.
      body: toArrayBuffer(encrypted),
      headers: { "Content-Type": "application/octet-stream" },
    });
    if (!putRes.ok) {
      throw new Error(`Upload S3 falhou: HTTP ${putRes.status} ${await putRes.text()}`);
    }

    // 4. Rotação — mantém só os últimos 30 snapshots diários (ADR-011).
    try {
      const listRes = await aws.fetch(
        `${S3_ENDPOINT}/${S3_BUCKET}?list-type=2&prefix=mymoney-backups/`,
        { method: "GET" },
      );
      if (listRes.ok) {
        const xml = await listRes.text();
        const keys = [...xml.matchAll(/<Key>([^<]+)<\/Key>/g)].map((m) => m[1]);
        const toDelete = objectsToDelete(sortKeysNewestFirst(keys), 30);
        for (const oldKey of toDelete) {
          await aws.fetch(`${S3_ENDPOINT}/${S3_BUCKET}/${oldKey}`, { method: "DELETE" });
        }
      } else {
        console.error("Rotação de backup: falha ao listar objetos", listRes.status);
      }
    } catch (rotationErr) {
      // Rotação é best-effort — falha nela não deve marcar o backup do dia
      // como falho (o dado do dia já foi gravado com sucesso no passo 3).
      console.error("Rotação de backup: erro não bloqueante", rotationErr);
    }

    // 5. Log de sucesso (DIR-32 — execução consultável).
    await logResult(client, startedAt, "success", objectKey, encrypted.byteLength, null);

    return new Response(
      JSON.stringify({ ok: true, object_key: objectKey, size_bytes: encrypted.byteLength }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await logResult(client, startedAt, "failure", null, null, message);
    await sendAlertEmail(
      "[MyMoney] Falha no export diário de backup",
      `O job de backup lógico diário (BE-M-10, ADR-009) falhou em ${startedAt}.\n\nErro: ${message}`,
    );
    return new Response(JSON.stringify({ ok: false, error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

async function runHealthcheck(): Promise<Response> {
  const client = serviceClient();
  const { data, error } = await client
    .from("backup_export_log")
    .select("finished_at")
    .eq("status", "success")
    .order("finished_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("Healthcheck de backup: falha ao consultar log", error.message);
    return new Response(JSON.stringify({ ok: false, error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  const lastSuccessAt = data?.finished_at ? new Date(data.finished_at as string) : null;
  const stale = isStale(lastSuccessAt, new Date());

  if (stale) {
    await sendAlertEmail(
      "[MyMoney] Alerta: backup diário sem execução recente (>26h)",
      lastSuccessAt
        ? `Último backup bem-sucedido em ${lastSuccessAt.toISOString()}, há mais de 26h (DIR-32).`
        : "Nenhum backup bem-sucedido foi registrado ainda (DIR-32).",
    );
  }

  return new Response(
    JSON.stringify({ ok: true, stale, last_success_at: lastSuccessAt?.toISOString() ?? null }),
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
  return await runExport();
});
