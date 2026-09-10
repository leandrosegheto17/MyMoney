// statement-import — BE-F3-03 (TASK.md Seção 3.3, RF-F3-03 AC1-3).
//
// Interpreta um arquivo de extrato bancário (OFX ou CSV) e devolve uma lista
// de transações candidatas normalizadas, cada uma já sinalizada como
// possível duplicata (AC2) de um lançamento existente do usuário (mesma
// data/valor/conta). A ÚNICA leitura ao banco feita aqui é
// `SELECT id, transaction_date, amount_cents FROM transactions WHERE
// account_id = :account_id` (via `userClient`, JWT do próprio usuário — RLS
// aplicada, nunca service_role) — só para a detecção de duplicata.
//
// **Não persiste nada** (AC1/AC3, mesmo princípio de `receipt-ocr`/
// `voice-capture`): nenhuma linha é criada em `import_batch` ou
// `candidate_transaction` por esta function. A resposta já vem no formato de
// `NewCandidateTransaction` (`BE-F3-00`) pronta para o Frontend decidir
// quando o usuário revisou/selecionou a lista e então persistir via
// `POST /import_batch` + `POST /candidate_transaction` (fluxo já publicado
// em 0.20.0) — reuso explícito de FL-05, não um mecanismo de persistência
// paralelo.
//
// Exige `Authorization: Bearer <JWT de sessão>` — mesmo padrão de
// `/receipt-ocr`/`/voice-capture`; `verify_jwt` não desabilitado em
// config.toml para esta function.
//
// Formato de corpo: JSON `{ file_content_base64, file_format, account_id }`
// — mesmo padrão de todas as outras Edge Functions deste projeto que
// transportam dado binário/sensível dentro de um corpo JSON.
//
// Logging: JSON estruturado (timestamp/level/function_name/request_id/
// user_id) — nunca loga o conteúdo do arquivo (extrato bancário é dado
// financeiro sensível do usuário), só metadados de resultado (CLAUDE.md).

import { createClient } from "npm:@supabase/supabase-js@2";
import { userClient } from "../_shared/supabase-clients.ts";
import {
  buildStatementCandidatePayload,
  findDuplicateMatch,
  parseStatementFile,
  validateStatementImportInput,
  type ExistingTransactionForDuplicateCheck,
} from "./lib.ts";

const FUNCTION_NAME = "statement-import";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";

// Mesmo padrão de reuso de secret já existente que `receipt-ocr`/
// `voice-capture` aplicaram (WEBAUTHN_ORIGIN como lista de origens
// permitidas da aplicação), em vez de criar uma env var nova para o mesmo
// conceito ("origens do app").
const ALLOWED_ORIGINS = (Deno.env.get("WEBAUTHN_ORIGIN") ?? "http://localhost:5173")
  .split(",")
  .map((origin) => origin.trim())
  .filter((origin) => origin.length > 0);

const AUTH_TIMEOUT_MS = 5000;

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

  const validation = validateStatementImportInput(body.file_content_base64, body.file_format, body.account_id);
  if (!validation.ok) {
    log("warn", { requestId, userId: user.id }, "Entrada de importação de extrato inválida", {
      validation_error: validation.error,
    });
    return jsonResponse({ error: validation.error, message: validation.message }, 400, origin);
  }

  const { fileText, format, accountId } = validation;

  const parseResult = parseStatementFile(fileText, format);

  if (parseResult.transactions.length === 0) {
    // AC3/fallback gracioso: nenhuma transação reconhecível — arquivo vazio,
    // formato errado, ou cabeçalho de CSV não reconhecido. Nunca um crash;
    // sempre um 422 claro, sem persistir nada (nada foi criado até aqui).
    log("warn", { requestId, userId: user.id }, "Nenhuma transação reconhecível no arquivo", {
      format,
      skipped_lines: parseResult.skipped_lines,
    });
    return jsonResponse(
      {
        error: "unprocessable_file",
        message:
          format === "ofx"
            ? "Não foi possível interpretar nenhuma transação do arquivo OFX. Verifique se o arquivo não está corrompido."
            : "Não foi possível interpretar o CSV. Verifique se a primeira linha é um cabeçalho com colunas de data e valor reconhecíveis (ex.: data, valor, descrição).",
      },
      422,
      origin,
    );
  }

  // RF-F3-03 AC2: possível duplicata é sempre "mesma data/valor/conta" contra
  // os lançamentos JÁ existentes do usuário na conta informada. Única query
  // de leitura desta function, via cliente com o JWT do próprio usuário (RLS
  // aplicada — nunca service_role).
  const dbClient = userClient(authHeader);
  const dates = parseResult.transactions.map((t) => t.transaction_date);
  const minDate = dates.reduce((a, b) => (b < a ? b : a));
  const maxDate = dates.reduce((a, b) => (b > a ? b : a));

  let existing: ExistingTransactionForDuplicateCheck[] = [];
  try {
    const { data, error } = await withTimeout(
      dbClient
        .from("transactions")
        .select("id, transaction_date, amount_cents")
        .eq("account_id", accountId)
        .gte("transaction_date", minDate)
        .lte("transaction_date", maxDate),
      AUTH_TIMEOUT_MS,
      "select transactions (duplicate check)",
    );
    if (error) throw error;
    existing = (data ?? []) as ExistingTransactionForDuplicateCheck[];
  } catch (err) {
    // Falha na checagem de duplicata não deve bloquear a apresentação da
    // lista de candidatos (AC1 continua valendo) — degrada para "nenhuma
    // duplicata sinalizada" nesta resposta, nunca finge sucesso silencioso:
    // fica registrado em log de erro para investigação.
    log("error", { requestId, userId: user.id }, "Falha ao consultar transações existentes para checagem de duplicata", {
      error: err instanceof Error ? err.message : String(err),
    });
  }

  const candidates = parseResult.transactions.map((transaction) =>
    buildStatementCandidatePayload(transaction, findDuplicateMatch(transaction, existing))
  );

  const duplicateCount = candidates.filter((c) => c.duplicate_of_transaction_id !== null).length;

  log("info", { requestId, userId: user.id }, "Importação de extrato interpretada", {
    format,
    total_parsed: candidates.length,
    skipped_lines: parseResult.skipped_lines,
    duplicate_count: duplicateCount,
  });

  return jsonResponse(
    {
      candidates,
      total_parsed: candidates.length,
      skipped_lines: parseResult.skipped_lines,
      duplicate_count: duplicateCount,
    },
    200,
    origin,
  );
});
