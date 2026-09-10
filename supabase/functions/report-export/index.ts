// report-export — BE-F3-07 (TASK.md Seção 3.3, RF-F3-06 AC1-2).
//
// Gera a exportação CSV/PDF do período informado a partir dos lançamentos
// do usuário autenticado (`public.get_report_export_rows`, via `userClient`
// — RLS aplicada, nunca `service_role`), faz upload do arquivo gerado ao
// bucket privado `exports` (pasta `<user_id>/...`, isolamento por policy —
// ver migration `20260909110000_be_f3_07_report_export.sql`) e devolve uma
// signed URL de curta duração (SDD.md Seção 7 / ADR-011, mesmo princípio de
// G-18 já aplicado a fotos de recibo) para o download (S-REP-03: "indicador
// de geração → download").
//
// Exige `Authorization: Bearer <JWT de sessão>` — mesmo padrão de
// `/receipt-ocr`/`/voice-capture`/`/statement-import`.
//
// Formato de corpo: JSON `{ start_date, end_date, format }` (aaaa-mm-dd,
// "csv"|"pdf") — sem filtro de conta (UX-SPEC.md S-REP-03 só define período
// + formato, decisão de escopo documentada em `lib.ts`/migration desta
// tarefa).
//
// Logging: JSON estruturado (timestamp/level/function_name/request_id/
// user_id) — nunca loga o conteúdo do relatório (dado financeiro sensível
// do usuário), só metadados de resultado (CLAUDE.md).

import { createClient } from "npm:@supabase/supabase-js@2";
import { userClient } from "../_shared/supabase-clients.ts";
import {
  buildCsvContent,
  computeReportSummary,
  validateReportExportInput,
  type ReportExportRow,
} from "./lib.ts";
import { buildReportPdfBytes } from "./pdf.ts";

const FUNCTION_NAME = "report-export";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";

// Mesmo padrão de reuso de secret já existente de `receipt-ocr`/
// `voice-capture`/`statement-import` (WEBAUTHN_ORIGIN como lista de
// origens permitidas da aplicação).
const ALLOWED_ORIGINS = (Deno.env.get("WEBAUTHN_ORIGIN") ?? "http://localhost:5173")
  .split(",")
  .map((origin) => origin.trim())
  .filter((origin) => origin.length > 0);

const AUTH_TIMEOUT_MS = 5000;
const QUERY_TIMEOUT_MS = 8000;
// Curta duração o suficiente para o download imediato (S-REP-03), mesmo
// princípio de G-18 ("acesso apenas via signed URL de curta duração").
const SIGNED_URL_TTL_SECONDS = 300;
const EXPORTS_BUCKET = "exports";

type LogLevel = "info" | "warn" | "error";

function log(
  level: LogLevel,
  ctx: { requestId: string; userId?: string | null },
  message: string,
  extra?: Record<string, unknown>,
) {
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    function_name: FUNCTION_NAME,
    request_id: ctx.requestId,
    user_id: ctx.userId ?? null,
    message,
    ...extra,
  };
  const line = JSON.stringify(entry);
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}

function corsHeaders(origin: string | null): HeadersInit {
  const allowOrigin = origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowOrigin ?? "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    Vary: "Origin",
  };
}

function jsonResponse(body: unknown, status: number, origin: string | null): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders(origin) },
  });
}

class TimeoutError extends Error {}

function withTimeout<T>(promise: PromiseLike<T>, ms: number, label: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new TimeoutError(`timeout aguardando ${label}`)), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      },
    );
  });
}

interface AuthenticatedUser {
  id: string;
}

async function getAuthenticatedUser(req: Request): Promise<AuthenticatedUser | null> {
  const authHeader = req.headers.get("Authorization") ?? "";
  const jwt = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (!jwt) return null;

  const authClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await withTimeout(
    authClient.auth.getUser(jwt),
    AUTH_TIMEOUT_MS,
    "auth.getUser",
  );
  if (error || !data.user) return null;
  return { id: data.user.id };
}

Deno.serve(async (req: Request) => {
  const requestId = crypto.randomUUID();
  const origin = req.headers.get("Origin");

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders(origin) });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "method_not_allowed", message: "Use POST." }, 405, origin);
  }

  const authHeader = req.headers.get("Authorization");

  let user: AuthenticatedUser | null;
  try {
    user = await getAuthenticatedUser(req);
  } catch (err) {
    log("error", { requestId }, "Falha ao validar sessão autenticada", {
      error: err instanceof Error ? err.message : String(err),
    });
    return jsonResponse(
      { error: "auth_unavailable", message: "Não foi possível validar a sessão. Tente novamente." },
      503,
      origin,
    );
  }

  if (!user) {
    log("warn", { requestId }, "Requisição sem sessão autenticada válida");
    return jsonResponse(
      { error: "unauthorized", message: "Sessão inválida ou expirada. Faça login novamente." },
      401,
      origin,
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    log("warn", { requestId, userId: user.id }, "Corpo da requisição não é JSON válido");
    return jsonResponse(
      { error: "invalid_body", message: "Corpo da requisição deve ser JSON válido." },
      400,
      origin,
    );
  }

  const validation = validateReportExportInput(body.start_date, body.end_date, body.format);
  if (!validation.ok) {
    log("warn", { requestId, userId: user.id }, "Entrada de exportação de relatório inválida", {
      validation_error: validation.error,
    });
    return jsonResponse({ error: validation.error, message: validation.message }, 400, origin);
  }

  const { startDate, endDate, format } = validation;
  const dbClient = userClient(authHeader);

  let rows: ReportExportRow[] = [];
  try {
    const { data, error } = await withTimeout(
      dbClient.rpc("get_report_export_rows", { p_start_date: startDate, p_end_date: endDate }),
      QUERY_TIMEOUT_MS,
      "rpc get_report_export_rows",
    );
    if (error) throw error;
    rows = (data ?? []) as ReportExportRow[];
  } catch (err) {
    log("error", { requestId, userId: user.id }, "Falha ao consultar lançamentos do período", {
      error: err instanceof Error ? err.message : String(err),
    });
    return jsonResponse(
      { error: "report_data_unavailable", message: "Não foi possível ler os lançamentos do período. Tente novamente." },
      502,
      origin,
    );
  }

  let fileBytes: Uint8Array;
  let contentType: string;
  let extension: string;
  try {
    if (format === "csv") {
      const csvContent = buildCsvContent(rows);
      // BOM UTF-8: Excel no Windows (pt-BR) só reconhece acentuação
      // corretamente com BOM em CSV — mesma prática comum de export
      // financeiro brasileiro.
      fileBytes = new TextEncoder().encode("﻿" + csvContent);
      contentType = "text/csv; charset=utf-8";
      extension = "csv";
    } else {
      const summary = computeReportSummary(rows);
      fileBytes = await buildReportPdfBytes(summary, startDate, endDate);
      contentType = "application/pdf";
      extension = "pdf";
    }
  } catch (err) {
    // Falha na geração do arquivo em si (nunca esperada — buildCsvContent/
    // computeReportSummary/buildReportPdfBytes não lançam por dado válido)
    // nunca deve devolver um arquivo parcial/corrompido silenciosamente.
    log("error", { requestId, userId: user.id }, "Falha ao gerar o arquivo de exportação", {
      format,
      error: err instanceof Error ? err.message : String(err),
    });
    return jsonResponse(
      { error: "export_generation_failed", message: "Não foi possível gerar o arquivo de exportação. Tente novamente." },
      500,
      origin,
    );
  }

  const objectPath = `${user.id}/${crypto.randomUUID()}.${extension}`;

  try {
    const { error: uploadError } = await withTimeout(
      dbClient.storage.from(EXPORTS_BUCKET).upload(objectPath, fileBytes, {
        contentType,
        upsert: false,
      }),
      QUERY_TIMEOUT_MS,
      "storage upload",
    );
    if (uploadError) throw uploadError;

    const { data: signedUrlData, error: signError } = await withTimeout(
      dbClient.storage.from(EXPORTS_BUCKET).createSignedUrl(objectPath, SIGNED_URL_TTL_SECONDS),
      QUERY_TIMEOUT_MS,
      "storage createSignedUrl",
    );
    if (signError || !signedUrlData) throw signError ?? new Error("signed_url_empty");

    log("info", { requestId, userId: user.id }, "Exportação de relatório gerada", {
      format,
      total_rows: rows.length,
      start_date: startDate,
      end_date: endDate,
    });

    return jsonResponse(
      {
        signed_url: signedUrlData.signedUrl,
        filename: `relatorio_${startDate}_a_${endDate}.${extension}`,
        expires_in: SIGNED_URL_TTL_SECONDS,
        total_rows: rows.length,
      },
      200,
      origin,
    );
  } catch (err) {
    // Nunca finge sucesso: se o arquivo não pôde ser persistido no bucket
    // privado (ou a signed URL não pôde ser criada), a resposta é sempre um
    // erro claro — nenhum download parcial/quebrado é oferecido ao usuário.
    log("error", { requestId, userId: user.id }, "Falha ao persistir/assinar o arquivo de exportação", {
      format,
      error: err instanceof Error ? err.message : String(err),
    });
    return jsonResponse(
      { error: "export_storage_failed", message: "Não foi possível preparar o download da exportação. Tente novamente." },
      502,
      origin,
    );
  }
});
