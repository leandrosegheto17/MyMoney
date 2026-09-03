// auth-email-mfa — F1-BE-13 (SDD.md §3, §2.16).
//
// Segundo fator de login por e-mail (RF11), em 2 passos, sobre a API padrão
// do GoTrue (não é um fator de MFA nativo — ver SDD.md §3 para o porquê):
//
//   action "request": gera um código numérico de 6 dígitos, grava
//   hash(SHA-256) + expiração de 10 min em `email_mfa_challenges` e envia o
//   código por e-mail de forma síncrona (não passa pela fila do
//   `notifications-dispatcher` — latência incompatível com um código de
//   validade curta).
//
//   action "verify": confere o código informado contra o hash da sessão
//   corrente, com no máximo 5 tentativas por código.
//
// `user_id`/`session_id` vêm do JWT (AAL1) emitido pelo `signInWithPassword`
// no passo 1 do login — este projeto usa o comportamento padrão de Edge
// Functions do Supabase (`verify_jwt` não desabilitado em config.toml para
// esta function), ou seja, o gateway já validou a assinatura do token antes
// de invocar este código. Por isso o payload é só decodificado aqui, não
// reassinado/reverificado — se `verify_jwt` for desabilitado no futuro para
// esta function, este arquivo precisa passar a validar a assinatura também.
//
// `email_mfa_challenges` tem RLS deny-all (ver migration
// 20260827215316_email_mfa_challenges.sql) — só a service role (usada aqui)
// e o `custom_access_token_hook` (F1-BE-14, SECURITY DEFINER) tocam a
// tabela.
//
// Logging: SEMPRE estruturado em JSON (timestamp/level/function_name/
// request_id/user_id), e NUNCA inclui o código em claro nem o hash — ver
// CLAUDE.md ("Nunca logar em texto puro dado sensível") e a tarefa F1-BE-13.

import { createClient } from "npm:@supabase/supabase-js@2";
import { EmailSendError, sendEmail } from "../_shared/email.ts";

const FUNCTION_NAME = "auth-email-mfa";

const CODE_TTL_MS = 10 * 60 * 1000; // 10 min (SDD.md §2.16)
const RESEND_COOLDOWN_MS = 60 * 1000; // cooldown de reenvio: 60s
const MAX_REQUESTS_PER_WINDOW = 5; // máx. 5 envios / 30 min
const REQUEST_WINDOW_MS = 30 * 60 * 1000;
const MAX_VERIFY_ATTEMPTS = 5;

const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Cliente com a service role: `email_mfa_challenges` não tem GRANT para
// `authenticated`/`anon` de propósito (deny-all — ver migration), então só
// a service role consegue ler/gravar nela.
const supabaseAdmin = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  { auth: { persistSession: false } },
);

// ---------------------------------------------------------------------------
// Logging estruturado — nunca recebe `code`/`code_hash` como campo.
// ---------------------------------------------------------------------------
type LogLevel = "info" | "warn" | "error";

function logEvent(
  requestId: string,
  level: LogLevel,
  message: string,
  extra?: Record<string, unknown>,
) {
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    function_name: FUNCTION_NAME,
    request_id: requestId,
    message,
    ...extra,
  };
  const line = JSON.stringify(entry);
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}

// ---------------------------------------------------------------------------
// JWT (AAL1) — extrai sub/session_id/email do payload já validado pelo
// gateway do Supabase.
// ---------------------------------------------------------------------------
interface Aal1Claims {
  userId: string;
  sessionId: string;
  email: string;
}

function base64UrlDecode(segment: string): string {
  const normalized = segment.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(
    normalized.length + ((4 - (normalized.length % 4)) % 4),
    "=",
  );
  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

function extractClaims(authHeader: string | null): Aal1Claims | null {
  if (!authHeader?.startsWith("Bearer ")) return null;
  const token = authHeader.slice("Bearer ".length).trim();
  const parts = token.split(".");
  if (parts.length !== 3) return null;

  try {
    const payload = JSON.parse(base64UrlDecode(parts[1]));
    if (
      typeof payload.sub !== "string" ||
      typeof payload.session_id !== "string" ||
      typeof payload.email !== "string"
    ) {
      return null;
    }
    return {
      userId: payload.sub,
      sessionId: payload.session_id,
      email: payload.email,
    };
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Código de 6 dígitos e hash — crypto.getRandomValues (nunca Math.random),
// SHA-256 via Web Crypto.
// ---------------------------------------------------------------------------
function generateSixDigitCode(): string {
  // Rejection sampling contra bias de módulo: descarta valores no topo do
  // range de uint32 que não caem em múltiplos exatos de 1_000_000.
  const RANGE = 1_000_000;
  const LIMIT = Math.floor(0x1_0000_0000 / RANGE) * RANGE;
  const buffer = new Uint32Array(1);
  let value: number;
  do {
    crypto.getRandomValues(buffer);
    value = buffer[0];
  } while (value >= LIMIT);
  return String(value % RANGE).padStart(6, "0");
}

async function sha256Hex(input: string): Promise<string> {
  const bytes = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Comparação em tempo constante entre dois hashes hex de mesmo tamanho. */
function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

function buildEmailHtml(code: string): string {
  return `
    <p>Seu código de verificação do MyMoney é:</p>
    <p style="font-size:28px;font-weight:bold;letter-spacing:4px;">${code}</p>
    <p>Ele expira em 10 minutos. Se você não pediu este código, ignore este e-mail.</p>
  `.trim();
}

// ---------------------------------------------------------------------------
// Respostas HTTP
// ---------------------------------------------------------------------------
function jsonResponse(body: Record<string, unknown>, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

// ---------------------------------------------------------------------------
// action: request
// ---------------------------------------------------------------------------
async function handleRequest(
  requestId: string,
  claims: Aal1Claims,
): Promise<Response> {
  const { userId, sessionId, email } = claims;

  const windowStart = new Date(Date.now() - REQUEST_WINDOW_MS).toISOString();
  const { data: recent, error: recentError } = await supabaseAdmin
    .from("email_mfa_challenges")
    .select("created_at")
    .eq("user_id", userId)
    .gte("created_at", windowStart)
    .order("created_at", { ascending: false });

  if (recentError) {
    logEvent(requestId, "error", "falha ao consultar rate limit", {
      user_id: userId,
      action: "request",
      db_error: recentError.message,
    });
    return jsonResponse({ error: "Erro interno. Tente novamente." }, 500);
  }

  if (recent.length >= MAX_REQUESTS_PER_WINDOW) {
    logEvent(requestId, "warn", "rate limit de reenvio excedido (5/30min)", {
      user_id: userId,
      action: "request",
    });
    return jsonResponse(
      { error: "Muitas tentativas. Aguarde alguns minutos e tente de novo." },
      429,
    );
  }

  if (recent.length > 0) {
    const lastCreatedAt = new Date(recent[0].created_at).getTime();
    if (Date.now() - lastCreatedAt < RESEND_COOLDOWN_MS) {
      logEvent(requestId, "warn", "cooldown de reenvio ainda ativo", {
        user_id: userId,
        action: "request",
      });
      return jsonResponse(
        { error: "Aguarde um minuto antes de pedir um novo código." },
        429,
      );
    }
  }

  const code = generateSixDigitCode();
  const codeHash = await sha256Hex(code);
  const expiresAt = new Date(Date.now() + CODE_TTL_MS).toISOString();

  const { error: insertError } = await supabaseAdmin
    .from("email_mfa_challenges")
    .insert({
      user_id: userId,
      session_id: sessionId,
      code_hash: codeHash,
      expires_at: expiresAt,
    });

  if (insertError) {
    logEvent(requestId, "error", "falha ao gravar desafio de MFA", {
      user_id: userId,
      action: "request",
      db_error: insertError.message,
    });
    return jsonResponse({ error: "Erro interno. Tente novamente." }, 500);
  }

  try {
    await sendEmail(email, "Seu código de verificação MyMoney", buildEmailHtml(code));
  } catch (err) {
    // Timeout/erro do provedor: responde com mensagem clara ao client em vez
    // de deixar a function pendurada (skill arquitetura-serverless). O
    // desafio já gravado continua contando para o rate limit, de propósito
    // — evita reenvio imediato em loop contra um provedor instável.
    logEvent(requestId, "error", "falha ao enviar e-mail de MFA", {
      user_id: userId,
      action: "request",
      send_error: err instanceof EmailSendError ? err.message : String(err),
    });
    return jsonResponse(
      { error: "Não foi possível enviar o e-mail agora. Tente novamente em instantes." },
      502,
    );
  }

  logEvent(requestId, "info", "código de MFA gerado e enviado", {
    user_id: userId,
    action: "request",
  });
  return jsonResponse({ success: true }, 200);
}

// ---------------------------------------------------------------------------
// action: verify
// ---------------------------------------------------------------------------
async function handleVerify(
  requestId: string,
  claims: Aal1Claims,
  body: Record<string, unknown>,
): Promise<Response> {
  const { userId, sessionId } = claims;
  const code = body.code;

  if (typeof code !== "string" || !/^\d{6}$/.test(code)) {
    return jsonResponse({ error: "Código inválido." }, 400);
  }

  const { data: challenge, error: selectError } = await supabaseAdmin
    .from("email_mfa_challenges")
    .select("id, code_hash, expires_at, attempts")
    .eq("user_id", userId)
    .eq("session_id", sessionId)
    .is("consumed_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (selectError) {
    logEvent(requestId, "error", "falha ao consultar desafio de MFA", {
      user_id: userId,
      action: "verify",
      db_error: selectError.message,
    });
    return jsonResponse({ error: "Erro interno. Tente novamente." }, 500);
  }

  if (!challenge || new Date(challenge.expires_at).getTime() < Date.now()) {
    logEvent(requestId, "warn", "nenhum desafio válido encontrado", {
      user_id: userId,
      action: "verify",
    });
    return jsonResponse(
      { error: "Código inválido ou expirado. Solicite um novo código." },
      400,
    );
  }

  if (challenge.attempts >= MAX_VERIFY_ATTEMPTS) {
    logEvent(requestId, "warn", "tentativas de verificação esgotadas", {
      user_id: userId,
      action: "verify",
    });
    return jsonResponse(
      { error: "Limite de tentativas esgotado. Solicite um novo código." },
      429,
    );
  }

  const candidateHash = await sha256Hex(code);
  if (!constantTimeEqual(candidateHash, challenge.code_hash)) {
    const { error: attemptsError } = await supabaseAdmin
      .from("email_mfa_challenges")
      .update({ attempts: challenge.attempts + 1 })
      .eq("id", challenge.id);

    if (attemptsError) {
      logEvent(requestId, "error", "falha ao incrementar attempts", {
        user_id: userId,
        action: "verify",
        db_error: attemptsError.message,
      });
    }

    logEvent(requestId, "warn", "código incorreto informado", {
      user_id: userId,
      action: "verify",
    });
    return jsonResponse({ error: "Código incorreto." }, 400);
  }

  const { error: consumeError } = await supabaseAdmin
    .from("email_mfa_challenges")
    .update({ consumed_at: new Date().toISOString() })
    .eq("id", challenge.id);

  if (consumeError) {
    logEvent(requestId, "error", "falha ao marcar desafio como consumido", {
      user_id: userId,
      action: "verify",
      db_error: consumeError.message,
    });
    return jsonResponse({ error: "Erro interno. Tente novamente." }, 500);
  }

  logEvent(requestId, "info", "código de MFA verificado com sucesso", {
    user_id: userId,
    action: "verify",
  });
  return jsonResponse({ success: true }, 200);
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------
Deno.serve(async (req: Request) => {
  const requestId = crypto.randomUUID();

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Método não suportado." }, 405);
  }

  const claims = extractClaims(req.headers.get("Authorization"));
  if (!claims) {
    logEvent(requestId, "warn", "requisição sem JWT AAL1 válido");
    return jsonResponse({ error: "Sessão inválida. Faça login novamente." }, 401);
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "Corpo da requisição inválido." }, 400);
  }

  try {
    switch (body.action) {
      case "request":
        return await handleRequest(requestId, claims);
      case "verify":
        return await handleVerify(requestId, claims, body);
      default:
        return jsonResponse(
          { error: "Campo 'action' deve ser 'request' ou 'verify'." },
          400,
        );
    }
  } catch (err) {
    logEvent(requestId, "error", "erro não tratado", {
      user_id: claims.userId,
      action: body.action,
      error: err instanceof Error ? err.message : String(err),
    });
    return jsonResponse({ error: "Erro interno. Tente novamente." }, 500);
  }
});
