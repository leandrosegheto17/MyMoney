// F1-BE-11 — Edge Function `webauthn-authenticate` (SDD.md §3).
//
// Cerimônia de AUTENTICAÇÃO (desbloqueio local) com uma credencial WebAuthn já
// registrada. Duas ações, ambas exigindo um JWT Supabase válido — WebAuthn
// aqui é desbloqueio local complementar à sessão já existente, não um segundo
// fator independente do Supabase Auth (SDD.md §3):
//
//   - action "generate-options": gera as opções para `navigator.credentials
//     .get()` no client (tarefa do Frontend). Restringe `allowCredentials` às
//     credenciais já registradas do usuário autenticado.
//   - action "verify": recebe o `assertionResponse`, busca a credencial por
//     `credential_id`, valida com `verifyAuthenticationResponse` e, se
//     válido, atualiza `sign_count`/`last_used_at` via service role (o client
//     não tem GRANT de UPDATE nesta tabela — ver migration
//     20260827215308_webauthn_credentials.sql).
//
// Nota de arquitetura — desafio (challenge) sem estado entre invocações: ver
// explicação completa em `supabase/functions/webauthn-register/index.ts`
// (mesmo esquema stateless HMAC-SHA256). Mitigação de replay aplicada
// (BE-M-09, `BLOCKERS.md` Bloqueio 006 — "mitigar agora", veredito do CTO):
// `public.webauthn_challenges` registra consumo único — "generate-options"
// insere a linha, "verify" extrai o `challenge` do `clientDataJSON` da
// própria resposta e faz um `UPDATE ... WHERE consumed_at IS NULL AND
// expires_at > now() RETURNING` atômico ANTES de chamar
// `verifyAuthenticationResponse`; nenhuma linha afetada = 409, sem sequer
// tentar validar a assinatura. Ver `consumeChallenge`/`persistChallenge`
// abaixo (mesma implementação de `webauthn-register`).
//
// Logging: JSON estruturado (timestamp, level, function_name, request_id,
// user_id) — nunca loga `public_key`/`assertionResponse` brutos, só ids e
// resultado (CLAUDE.md, SDD.md §9.4).

import {
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
  type AuthenticationResponseJSON,
  type VerifiedAuthenticationResponse,
  type WebAuthnCredential,
} from "@simplewebauthn/server";
import { createClient } from "@supabase/supabase-js";

// ---------------------------------------------------------------------------
// Configuração (env vars — SUPABASE_URL/ANON_KEY/SERVICE_ROLE_KEY são
// injetadas automaticamente pelo runtime da Edge Function; as WEBAUTHN_* têm
// default seguro para dev local e devem ser setadas via `supabase secrets
// set` em produção; devem bater com as usadas em `webauthn-register`).
// ---------------------------------------------------------------------------
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const RP_ID = Deno.env.get("WEBAUTHN_RP_ID") ?? "localhost";
const ALLOWED_ORIGINS = (Deno.env.get("WEBAUTHN_ORIGIN") ?? "http://localhost:5173")
  .split(",")
  .map((origin) => origin.trim())
  .filter((origin) => origin.length > 0);

const FUNCTION_NAME = "webauthn-authenticate";
const CHALLENGE_TTL_SECONDS = 90;
const AUTH_TIMEOUT_MS = 5000;
const DB_TIMEOUT_MS = 8000;

// ---------------------------------------------------------------------------
// Logging estruturado (nunca logar payload bruto — só ids/resultado).
// ---------------------------------------------------------------------------
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

// ---------------------------------------------------------------------------
// CORS + resposta JSON padronizada (nunca um 500 sem corpo).
// ---------------------------------------------------------------------------
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

// ---------------------------------------------------------------------------
// Timeout explícito para chamadas que saem da invocação atual (Auth/Postgres),
// para nunca deixar a função pendurada indefinidamente (skill
// arquitetura-serverless).
// ---------------------------------------------------------------------------
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

// ---------------------------------------------------------------------------
// base64url helpers (sem libs externas — minimiza cold start).
// ---------------------------------------------------------------------------
function base64UrlEncode(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlDecode(value: string): Uint8Array {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padLength = (4 - (normalized.length % 4)) % 4;
  const padded = normalized + "=".repeat(padLength);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

// ---------------------------------------------------------------------------
// bytea <-> Uint8Array (PostgREST representa bytea como hex "\x...").
// ---------------------------------------------------------------------------
function fromPostgresBytea(value: string): Uint8Array<ArrayBuffer> {
  const hex = value.startsWith("\\x") ? value.slice(2) : value;
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.substring(i * 2, i * 2 + 2), 16);
  }
  // `.slice()` normalizes to `Uint8Array<ArrayBuffer>` (same as the lib's own
  // `Uint8Array_`/`WebAuthnCredential.publicKey` type), since a plain
  // `new Uint8Array(n)` type-checks as the wider `Uint8Array<ArrayBufferLike>`
  // under recent TS DOM lib typings.
  return bytes.slice();
}

// ---------------------------------------------------------------------------
// Challenge stateless (HMAC-SHA256, sem estado em memória entre invocações —
// ver nota de arquitetura no topo do arquivo).
// ---------------------------------------------------------------------------
type ChallengePurpose = "registration" | "authentication";

function getHmacKey(): Promise<CryptoKey> {
  const secret = SUPABASE_SERVICE_ROLE_KEY;
  if (!secret) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY não configurada no runtime da function");
  }
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

async function createChallenge(
  claims: { uid: string; purpose: ChallengePurpose },
): Promise<Uint8Array<ArrayBuffer>> {
  const payload = {
    uid: claims.uid,
    purpose: claims.purpose,
    exp: Math.floor(Date.now() / 1000) + CHALLENGE_TTL_SECONDS,
    nonce: base64UrlEncode(crypto.getRandomValues(new Uint8Array(16))),
  };
  const payloadBytes = new TextEncoder().encode(JSON.stringify(payload));
  const key = await getHmacKey();
  const signature = new Uint8Array(await crypto.subtle.sign("HMAC", key, payloadBytes));

  const combined = new Uint8Array(payloadBytes.length + signature.length);
  combined.set(payloadBytes, 0);
  combined.set(signature, payloadBytes.length);
  // `.slice()` normalizes to `Uint8Array<ArrayBuffer>` (same as the lib's own
  // `Uint8Array_` alias), since a plain `new Uint8Array(n)` type-checks as the
  // wider `Uint8Array<ArrayBufferLike>` under recent TS DOM lib typings.
  return combined.slice();
}

async function isValidChallenge(
  challenge: string,
  expected: { uid: string; purpose: ChallengePurpose },
): Promise<boolean> {
  try {
    const combined = base64UrlDecode(challenge);
    if (combined.length <= 32) return false;

    const signature = combined.slice(combined.length - 32);
    const payloadBytes = combined.slice(0, combined.length - 32);

    const key = await getHmacKey();
    const signatureValid = await crypto.subtle.verify("HMAC", key, signature, payloadBytes);
    if (!signatureValid) return false;

    const payload = JSON.parse(new TextDecoder().decode(payloadBytes)) as {
      uid: string;
      purpose: string;
      exp: number;
    };

    if (payload.uid !== expected.uid) return false;
    if (payload.purpose !== expected.purpose) return false;
    if (payload.exp < Math.floor(Date.now() / 1000)) return false;

    return true;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Mitigação Bloqueio 006 — consumo único de challenge (public.webauthn_challenges).
// ---------------------------------------------------------------------------

/** Extrai `clientDataJSON.challenge` (string base64url) sem reimplementar o
 *  parsing completo de WebAuthn — só o campo necessário para consultar
 *  `public.webauthn_challenges` antes de chamar a lib de verificação. */
function decodeClientDataChallenge(clientDataJSON: string | undefined): string | null {
  if (typeof clientDataJSON !== "string" || clientDataJSON.length === 0) return null;
  try {
    const decoded = new TextDecoder().decode(base64UrlDecode(clientDataJSON));
    const parsed = JSON.parse(decoded) as { challenge?: unknown };
    return typeof parsed.challenge === "string" ? parsed.challenge : null;
  } catch {
    return null;
  }
}

/** Registra o challenge emitido em "generate-options" — pré-condição para
 *  "verify" poder consumi-lo (linha precisa existir para ser marcada). */
async function persistChallenge(
  admin: ReturnType<typeof createAdminClient>,
  params: { userId: string; challenge: string; ceremonyType: ChallengePurpose; expiresAtIso: string },
): Promise<void> {
  const { error } = await withTimeout(
    admin.from("webauthn_challenges").insert({
      user_id: params.userId,
      challenge: params.challenge,
      ceremony_type: params.ceremonyType,
      expires_at: params.expiresAtIso,
    }),
    DB_TIMEOUT_MS,
    "insert webauthn_challenges",
  );
  if (error) throw error;
}

/** Marca o challenge como consumido de forma atômica (`UPDATE ... WHERE
 *  consumed_at IS NULL AND expires_at > now() RETURNING id`) — se nenhuma
 *  linha for afetada, o challenge já foi usado, expirou, ou nunca existiu
 *  (nunca emitido por "generate-options" para este user_id/ceremony_type).
 *  Retorna `true` só quando o consumo teve sucesso (uso legítimo, único). */
async function consumeChallenge(
  admin: ReturnType<typeof createAdminClient>,
  params: { userId: string; challenge: string; ceremonyType: ChallengePurpose },
): Promise<boolean> {
  const { data, error } = await withTimeout(
    admin
      .from("webauthn_challenges")
      .update({ consumed_at: new Date().toISOString() })
      .eq("user_id", params.userId)
      .eq("challenge", params.challenge)
      .eq("ceremony_type", params.ceremonyType)
      .is("consumed_at", null)
      .gt("expires_at", new Date().toISOString())
      .select("id"),
    DB_TIMEOUT_MS,
    "consume webauthn_challenges",
  );
  if (error) throw error;
  return Boolean(data && data.length > 0);
}

// ---------------------------------------------------------------------------
// Supabase clients.
// ---------------------------------------------------------------------------
function createAdminClient() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

interface AuthenticatedUser {
  id: string;
  email: string | null;
}

async function getAuthenticatedUser(req: Request): Promise<AuthenticatedUser | null> {
  const authHeader = req.headers.get("Authorization") ?? "";
  const jwt = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (!jwt) return null;

  const authClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await withTimeout(authClient.auth.getUser(jwt), AUTH_TIMEOUT_MS, "auth.getUser");
  if (error || !data.user) return null;
  return { id: data.user.id, email: data.user.email ?? null };
}

interface WebauthnCredentialRow {
  id: string;
  user_id: string;
  credential_id: string;
  public_key: string;
  sign_count: number;
}

// ---------------------------------------------------------------------------
// Handler principal.
// ---------------------------------------------------------------------------
Deno.serve(async (req) => {
  const requestId = crypto.randomUUID();
  const origin = req.headers.get("Origin");

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders(origin) });
  }

  if (req.method !== "POST") {
    return jsonResponse(
      { error: "method_not_allowed", message: "Use POST." },
      405,
      origin,
    );
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

  const action = typeof body.action === "string" ? body.action : null;
  const admin = createAdminClient();

  try {
    if (action === "generate-options") {
      const { data: ownCredentials, error: ownError } = await withTimeout(
        admin.from("webauthn_credentials").select("credential_id").eq("user_id", user.id),
        DB_TIMEOUT_MS,
        "select webauthn_credentials",
      );

      if (ownError) {
        log("error", { requestId, userId: user.id }, "Falha ao consultar credenciais do usuário", {
          db_error_code: ownError.code ?? null,
        });
        return jsonResponse(
          { error: "internal_error", message: "Não foi possível preparar a autenticação. Tente novamente." },
          500,
          origin,
        );
      }

      if (!ownCredentials || ownCredentials.length === 0) {
        log("warn", { requestId, userId: user.id }, "Usuário sem credenciais WebAuthn registradas");
        return jsonResponse(
          { error: "no_credentials", message: "Nenhuma credencial WebAuthn registrada para este dispositivo." },
          404,
          origin,
        );
      }

      const challenge = await createChallenge({ uid: user.id, purpose: "authentication" });

      const options = await generateAuthenticationOptions({
        rpID: RP_ID,
        challenge,
        userVerification: "preferred",
        allowCredentials: ownCredentials.map((row) => ({ id: row.credential_id as string })),
      });

      // Mitigação Bloqueio 006: persiste o challenge para consumo único em
      // "verify" (public.webauthn_challenges) — ANTES de responder ao client.
      try {
        await persistChallenge(admin, {
          userId: user.id,
          challenge: options.challenge,
          ceremonyType: "authentication",
          expiresAtIso: new Date(Date.now() + CHALLENGE_TTL_SECONDS * 1000).toISOString(),
        });
      } catch (err) {
        log("error", { requestId, userId: user.id }, "Falha ao persistir challenge (mitigação Bloqueio 006)", {
          error: err instanceof Error ? err.message : String(err),
        });
        return jsonResponse(
          { error: "internal_error", message: "Não foi possível preparar a autenticação. Tente novamente." },
          500,
          origin,
        );
      }

      log("info", { requestId, userId: user.id }, "Opções de autenticação WebAuthn geradas", {
        allowed_credentials_count: ownCredentials.length,
      });

      return jsonResponse({ options }, 200, origin);
    }

    if (action === "verify") {
      const assertionResponse = body.assertionResponse as AuthenticationResponseJSON | undefined;

      if (!assertionResponse || typeof assertionResponse !== "object" || typeof assertionResponse.id !== "string") {
        log("warn", { requestId, userId: user.id }, "assertionResponse ausente ou inválido no corpo");
        return jsonResponse(
          { error: "invalid_body", message: "assertionResponse é obrigatório." },
          400,
          origin,
        );
      }

      const { data: credentialRow, error: lookupError } = await withTimeout(
        admin
          .from("webauthn_credentials")
          .select("id, user_id, credential_id, public_key, sign_count")
          .eq("credential_id", assertionResponse.id)
          .maybeSingle(),
        DB_TIMEOUT_MS,
        "select webauthn_credentials by credential_id",
      );

      if (lookupError) {
        log("error", { requestId, userId: user.id }, "Falha ao buscar credencial por credential_id", {
          db_error_code: lookupError.code ?? null,
        });
        return jsonResponse(
          { error: "internal_error", message: "Não foi possível concluir a autenticação. Tente novamente." },
          500,
          origin,
        );
      }

      const credentialRowTyped = credentialRow as WebauthnCredentialRow | null;

      if (!credentialRowTyped) {
        log("warn", { requestId, userId: user.id }, "Credencial informada não encontrada");
        return jsonResponse(
          { error: "credential_not_found", message: "Credencial não reconhecida." },
          404,
          origin,
        );
      }

      if (credentialRowTyped.user_id !== user.id) {
        log("warn", { requestId, userId: user.id }, "Credencial pertence a outro usuário", {
          credential_id: credentialRowTyped.credential_id,
        });
        return jsonResponse(
          { error: "credential_not_found", message: "Credencial não reconhecida." },
          404,
          origin,
        );
      }

      const credential: WebAuthnCredential = {
        id: credentialRowTyped.credential_id,
        publicKey: fromPostgresBytea(credentialRowTyped.public_key),
        counter: credentialRowTyped.sign_count,
      };

      const challengeString = decodeClientDataChallenge(assertionResponse.response?.clientDataJSON);
      if (!challengeString) {
        log("warn", { requestId, userId: user.id }, "clientDataJSON sem challenge decodificável");
        return jsonResponse(
          { error: "invalid_body", message: "assertionResponse inválido." },
          400,
          origin,
        );
      }

      // Mitigação Bloqueio 006: consome o challenge de forma atômica ANTES de
      // chamar verifyAuthenticationResponse — rejeita qualquer reenvio da
      // mesma dupla challenge+assertion dentro da janela de 90s (replay).
      let challengeConsumed: boolean;
      try {
        challengeConsumed = await consumeChallenge(admin, {
          userId: user.id,
          challenge: challengeString,
          ceremonyType: "authentication",
        });
      } catch (err) {
        log("error", { requestId, userId: user.id }, "Falha ao consumir challenge (mitigação Bloqueio 006)", {
          error: err instanceof Error ? err.message : String(err),
        });
        return jsonResponse(
          { error: "internal_error", message: "Não foi possível concluir a autenticação. Tente novamente." },
          500,
          origin,
        );
      }

      if (!challengeConsumed) {
        log("warn", { requestId, userId: user.id }, "Challenge desconhecido, expirado ou já consumido (possível replay)", {
          credential_id: credentialRowTyped.credential_id,
        });
        return jsonResponse(
          {
            error: "challenge_replayed",
            message: "Este desafio já foi utilizado, expirou, ou é inválido. Solicite uma nova autenticação.",
          },
          409,
          origin,
        );
      }

      let verification: VerifiedAuthenticationResponse;
      try {
        verification = await verifyAuthenticationResponse({
          response: assertionResponse,
          expectedChallenge: (challenge) =>
            isValidChallenge(challenge, { uid: user!.id, purpose: "authentication" }),
          expectedOrigin: ALLOWED_ORIGINS,
          expectedRPID: RP_ID,
          credential,
        });
      } catch (err) {
        log("warn", { requestId, userId: user.id }, "assertionResponse rejeitado na verificação", {
          credential_id: credentialRowTyped.credential_id,
          error: err instanceof Error ? err.message : String(err),
        });
        return jsonResponse(
          { error: "verification_failed", message: "Não foi possível validar a credencial informada." },
          400,
          origin,
        );
      }

      if (!verification.verified) {
        log("warn", { requestId, userId: user.id }, "Autenticação WebAuthn não verificada", {
          credential_id: credentialRowTyped.credential_id,
        });
        return jsonResponse(
          { error: "verification_failed", message: "Não foi possível validar a credencial informada." },
          400,
          origin,
        );
      }

      const { error: updateError } = await withTimeout(
        admin
          .from("webauthn_credentials")
          .update({
            sign_count: verification.authenticationInfo.newCounter,
            last_used_at: new Date().toISOString(),
          })
          .eq("id", credentialRowTyped.id),
        DB_TIMEOUT_MS,
        "update webauthn_credentials",
      );

      if (updateError) {
        // A assinatura já foi validada — o desbloqueio é legítimo. Uma falha
        // aqui é só a atualização de auditoria (sign_count/last_used_at), não
        // deve derrubar o desbloqueio do usuário; loga como erro para
        // investigação, mas ainda responde sucesso.
        log("error", { requestId, userId: user.id }, "Falha ao atualizar sign_count/last_used_at", {
          credential_id: credentialRowTyped.credential_id,
          db_error_code: updateError.code ?? null,
        });
      } else {
        log("info", { requestId, userId: user.id }, "Autenticação WebAuthn verificada com sucesso", {
          credential_id: credentialRowTyped.credential_id,
        });
      }

      return jsonResponse({ success: true }, 200, origin);
    }

    log("warn", { requestId, userId: user.id }, "Ação desconhecida recebida", { action });
    return jsonResponse(
      { error: "invalid_action", message: "action deve ser 'generate-options' ou 'verify'." },
      400,
      origin,
    );
  } catch (err) {
    const isTimeout = err instanceof TimeoutError;
    log("error", { requestId, userId: user.id }, "Erro inesperado ao processar requisição", {
      error: err instanceof Error ? err.message : String(err),
      timeout: isTimeout,
    });
    return jsonResponse(
      {
        error: isTimeout ? "upstream_timeout" : "internal_error",
        message: "Não foi possível processar a solicitação. Tente novamente.",
      },
      isTimeout ? 504 : 500,
      origin,
    );
  }
});
