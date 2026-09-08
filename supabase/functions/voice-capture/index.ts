// voice-capture — BE-F3-02 (TASK.md Seção 3.3, RF-F3-01 AC1, ADR-006).
//
// Recebe a transcrição já produzida pelo client via Web Speech API (camada
// obrigatória de ADR-006) e extrai campos estruturados (valor, data,
// tipo, descrição, categoria sugerida) para pré-preencher o formulário de
// confirmação (RF-F3-01 AC1). Aceita, alternativamente, um áudio para
// fallback de STT em nuvem — ADR-006 decide explicitamente que esse fallback
// é "extensão futura, não dependência obrigatória do início da Fase 3": sem
// vendor configurado (`_shared/sttProvider.ts`), a requisição responde `503
// stt_fallback_not_configured` de forma controlada, nunca finge sucesso.
//
// Exige `Authorization: Bearer <JWT de sessão>` (usuário já logado — mesmo
// padrão de `/webauthn-register`/`/receipt-ocr`; `verify_jwt` não desabilitado
// em config.toml para esta function). Não grava nada no banco: RF-F3-01 AC2
// exige que nenhum dado seja persistido antes da confirmação explícita do
// usuário no formulário de captura (responsabilidade do Frontend, FE-F3-02/
// FE-F3-04) — esta function é pura extração, sem efeito colateral.
//
// Formato de corpo: JSON `{ transcript }` ou `{ audio_base64, mime_type }` —
// mesmo padrão de todas as outras Edge Functions deste projeto que
// transportam dado sensível/binário dentro de um corpo JSON (nunca
// `multipart/form-data`).
//
// Logging: JSON estruturado (timestamp/level/function_name/request_id/
// user_id) — nunca loga o `transcript`/áudio em si (pode conter dado pessoal
// do usuário), só metadados de resultado (CLAUDE.md).

import { createClient } from "npm:@supabase/supabase-js@2";
import { getConfiguredSTTProvider } from "../_shared/sttProvider.ts";
import { buildVoiceExtractionResult, validateVoiceInput } from "./lib.ts";

const FUNCTION_NAME = "voice-capture";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";

// Mesmo padrão de reuso de secret já existente que `receipt-ocr` aplicou
// (WEBAUTHN_ORIGIN como lista de origens permitidas da aplicação), em vez de
// criar uma env var nova para o mesmo conceito ("origens do app").
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

  const validation = validateVoiceInput(body.transcript, body.audio_base64, body.mime_type);
  if (!validation.ok) {
    log("warn", { requestId, userId: user.id }, "Entrada de captura por voz inválida", {
      validation_error: validation.error,
    });
    return jsonResponse({ error: validation.error, message: validation.message }, 400, origin);
  }

  let transcript: string;

  if (validation.source === "client_transcript") {
    transcript = validation.transcript;
  } else {
    // ADR-006: fallback de STT em nuvem é extensão futura, sem vendor
    // decidido/configurado ainda — nunca finge sucesso nem tenta transcrever
    // sem um provider real por trás.
    const provider = getConfiguredSTTProvider();
    if (!provider) {
      log(
        "warn",
        { requestId, userId: user.id },
        "Fallback de STT em nuvem solicitado, mas nenhum vendor está configurado (ADR-006)",
      );
      return jsonResponse(
        {
          error: "stt_fallback_not_configured",
          message:
            "Reconhecimento de voz pelo navegador não está disponível e o fallback em nuvem ainda não está configurado. Tente novamente ou preencha manualmente.",
        },
        503,
        origin,
      );
    }

    try {
      const transcribed = await provider.transcribeAudio(validation.bytes, validation.mimeType);
      transcript = transcribed.transcript;
    } catch (err) {
      log("error", { requestId, userId: user.id }, "Falha no fallback de STT em nuvem (vendor)", {
        error: err instanceof Error ? err.message : String(err),
      });
      return jsonResponse(
        {
          error: "stt_provider_failed",
          message: "Não foi possível transcrever o áudio. Tente novamente ou preencha manualmente.",
        },
        502,
        origin,
      );
    }
  }

  const result = buildVoiceExtractionResult(transcript);
  log("info", { requestId, userId: user.id }, "Extração de captura por voz concluída", {
    source: validation.source,
    amount_extracted: result.amount_cents !== undefined,
    date_extracted: result.transaction_date !== undefined,
    type_extracted: result.type !== undefined,
    description_extracted: result.description !== undefined,
    category_extracted: result.category_suggestion_label !== undefined,
  });
  return jsonResponse({ result }, 200, origin);
});
