// receipt-ocr — BE-F3-01 (TASK.md Seção 3.3, RF-F3-02 AC1-3, ADR-007, SPK-002,
// DIR-22).
//
// Extrai campos estruturados (valor/data/estabelecimento/categoria sugerida)
// de uma foto de recibo/nota fiscal, atrás da interface `OCRProvider`
// (`_shared/ocrProvider.ts`). Vendor primário decidido em SPK-002: Google
// Cloud Vision (`DOCUMENT_TEXT_DETECTION`) — ver `googleVisionAdapter.ts`.
//
// Exige `Authorization: Bearer <JWT de sessão>` (usuário já logado — mesmo
// padrão de `webauthn-register`/`webauthn-authenticate`; `verify_jwt` não
// desabilitado em config.toml para esta function). Não grava nada no banco:
// RF-F3-02 AC2 exige que nenhum dado seja persistido antes da confirmação
// explícita do usuário no formulário de captura (responsabilidade do
// Frontend, FE-F3-03) — esta function é pura extração, sem efeito colateral.
//
// Formato de corpo escolhido: JSON `{ image_base64, mime_type }` (em vez de
// `multipart/form-data`) — mesmo padrão de todas as outras Edge Functions
// deste projeto (auth-email-mfa, webauthn-register/authenticate), que também
// transportam dado binário (attestationResponse, código) como campo dentro de
// um corpo JSON. Simplifica o cliente (um único `fetch` com
// `Content-Type: application/json`, sem lidar com boundary de multipart) e
// mantém a chave de API do Google só neste servidor (DIR-30/critério de
// aceite de BE-F3-01) — a escolha de formato de transporte da imagem não
// influencia onde a chave fica, só a ergonomia do client.
//
// Logging: JSON estruturado (timestamp/level/function_name/request_id/
// user_id) — nunca loga a imagem em si nem `raw_text` (pode conter dado
// pessoal do recibo), só metadados de resultado (CLAUDE.md).

import { createClient } from "npm:@supabase/supabase-js@2";
import { createGoogleVisionAdapter, OCRProviderError } from "./googleVisionAdapter.ts";
import { validateImageInput } from "./lib.ts";

const FUNCTION_NAME = "receipt-ocr";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
// Nome de env var esperado — ver nota de pendência operacional no final deste
// arquivo e a nota de status de BE-F3-01 em TASK.md.
const GOOGLE_VISION_API_KEY = Deno.env.get("GOOGLE_VISION_API_KEY") ?? "";

// Reaproveita a mesma env var de origem já usada por webauthn-register/
// webauthn-authenticate (`WEBAUTHN_ORIGIN`) como lista de origens permitidas
// da aplicação — mesmo padrão de reuso de secret já existente que
// `backup-export` aplicou para `RESEND_API_KEY`/`EMAIL_FROM`, em vez de criar
// uma env var nova para o mesmo conceito ("origens do app").
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

  const validation = validateImageInput(body.mime_type, body.image_base64);
  if (!validation.ok) {
    log("warn", { requestId, userId: user.id }, "Imagem de recibo inválida", {
      validation_error: validation.error,
    });
    return jsonResponse({ error: validation.error, message: validation.message }, 400, origin);
  }

  if (!GOOGLE_VISION_API_KEY) {
    // Pendência de configuração operacional (ver nota de status de BE-F3-01
    // em TASK.md) — nunca finge sucesso nem retorna resultado parcial
    // silencioso quando a integração real não está configurada.
    log("error", { requestId, userId: user.id }, "GOOGLE_VISION_API_KEY não configurada");
    return jsonResponse(
      {
        error: "ocr_not_configured",
        message: "Extração automática de recibo está temporariamente indisponível.",
      },
      503,
      origin,
    );
  }

  const provider = createGoogleVisionAdapter(GOOGLE_VISION_API_KEY);

  try {
    const result = await provider.extractReceipt(validation.bytes);
    log("info", { requestId, userId: user.id }, "Extração de recibo concluída", {
      amount_extracted: result.amount_cents !== undefined,
      date_extracted: result.transaction_date !== undefined,
      merchant_extracted: result.merchant_name !== undefined,
      category_extracted: result.category_suggestion_label !== undefined,
    });
    return jsonResponse({ result }, 200, origin);
  } catch (err) {
    // RF-F3-02 AC2: falha total do vendor (rede/cota/chave inválida/imagem
    // irreconhecível) vira erro claro, nunca resultado parcial persistido —
    // esta function não persiste nada em nenhum caminho, então "não
    // persistir nada" já vale por construção; aqui só garantimos uma
    // resposta de erro sem vazar detalhe sensível do vendor (ex. chave de
    // API) ao cliente.
    const isOcrError = err instanceof OCRProviderError;
    log("error", { requestId, userId: user.id }, "Falha na extração de recibo (vendor)", {
      error: err instanceof Error ? err.message : String(err),
      timeout: err instanceof TimeoutError,
    });
    return jsonResponse(
      {
        error: isOcrError ? "ocr_provider_failed" : "internal_error",
        message: "Não foi possível extrair os dados do recibo. Tente novamente ou preencha manualmente.",
      },
      502,
      origin,
    );
  }
});
