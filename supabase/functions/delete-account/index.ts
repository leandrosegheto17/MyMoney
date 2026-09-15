// delete-account — BE-F3-09 (TASK.md Seção 3.3, ADR-011 tabela-resumo, linha
// "Exclusão de conta").
//
// Edge Function privilegiada e dedicada (ADR-011: "role de serviço, nunca
// exposta como operação direta do cliente"): a capacidade de apagar TODA a
// conta de um usuário nunca é um RPC/endpoint chamável diretamente pelo
// client com o papel `authenticated` — `public.delete_user_data` (ver
// migration `20260915090000_be_f3_09_delete_account_data.sql`) só é
// executável por `service_role` (GRANT/REVOKE explícito na própria
// migration). Esta Edge Function é o ÚNICO caminho de acesso: identifica o
// chamador via JWT (mesmo padrão de `report-export`), confirma que a ação é
// sobre a própria conta (nunca aceita `user_id` arbitrário do payload sem
// bater com o JWT — ver `lib.ts#validateTargetUserId`), e só então orquestra,
// com `service_role`, os 3 passos definidos em ADR-011, nesta ordem:
//
//   (i)   `public.delete_user_data(user.id)` — remove toda linha de `public`
//         associada ao usuário, numa única transação atômica (a própria
//         função SQL; se qualquer DELETE falhar, TUDO é revertido — nunca
//         uma exclusão parcial silenciosa).
//   (ii)  Objetos pendentes do bucket `exports` (BE-F3-07) do usuário —
//         removidos via Storage API (`storage.from('exports').remove(...)`,
//         nunca DELETE direto em `storage.objects`, mesmo princípio de
//         `data-retention-purge`). Falha aqui é logada mas NÃO impede o
//         passo (iii) — o dado financeiro (o que importa de verdade) já foi
//         removido no passo (i); um objeto de export órfão é só bloat de
//         Storage, não um vazamento de dado (bucket privado, sem policy de
//         acesso para um usuário que deixará de existir).
//         Fotos de recibo: SEM OBJETO (ADR-020) — nenhuma foto é persistida
//         em nenhum caminho do sistema, nada a remover aqui.
//   (iii) `auth.admin.deleteUser(user.id)` (Admin API do GoTrue, nunca
//         `DELETE FROM auth.users` via SQL puro — a Admin API cuida
//         corretamente da limpeza das demais tabelas do schema `auth`:
//         sessions/refresh_tokens/identities/mfa_factors). Falha aqui É
//         crítica (dado público já apagado, mas o usuário ainda pode logar
//         numa conta "vazia") — logada como erro e devolvida ao client como
//         tal, nunca mascarada como sucesso.
//
// Exige `Authorization: Bearer <JWT de sessão>` — mesmo padrão de
// `/report-export`/`/receipt-ocr`/`/voice-capture`/`/statement-import`.
// Deployada COM verificação de JWT (sem `--no-verify-jwt`) — mesma
// convenção já documentada em `DEPLOY.md` §9.13.3 para toda function que
// atende chamada de sessão de usuário (diferente de `data-retention-purge`/
// `backup-export`, que são cron-only).
//
// Reautenticação para ação sensível (TASK.md linha 156-157, "usa outro
// mecanismo, a confirmar na tarefa correspondente, não WebAuthn"): o
// mecanismo é a própria exigência de um JWT de sessão válido do usuário-alvo
// — SDD.md Seção 7 confirma que o claim `app_email_mfa_verified` é sempre
// `'true'` por decisão definitiva do stakeholder (ADR-014, sem gate real),
// então adicionar uma checagem desse claim aqui seria uma barreira
// decorativa, não uma proteção real. Um fluxo de confirmação de UI dedicado
// (ex.: "digite EXCLUIR para confirmar") é responsabilidade do Frontend
// (FE-F3-09), hoje bloqueado por falta de tela formalizada no UX-SPEC.md
// (TASK.md Seção 4.3) — fora do escopo desta tarefa de Backend.
//
// Logging: JSON estruturado (timestamp/level/function_name/request_id/
// user_id) — nunca loga dado financeiro do usuário, só metadados de
// resultado (CLAUDE.md, mesmo padrão de report-export).

import { createClient } from "npm:@supabase/supabase-js@2";
import { buildExportObjectPaths, chunk, totalDeletedRows, validateTargetUserId } from "./lib.ts";

const FUNCTION_NAME = "delete-account";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

// Mesmo padrão de reuso de secret já existente de `receipt-ocr`/
// `voice-capture`/`statement-import`/`report-export` (WEBAUTHN_ORIGIN como
// lista de origens permitidas da aplicação).
const ALLOWED_ORIGINS = (Deno.env.get("WEBAUTHN_ORIGIN") ?? "http://localhost:5173")
  .split(",")
  .map((origin) => origin.trim())
  .filter((origin) => origin.length > 0);

const AUTH_TIMEOUT_MS = 5000;
const DB_TIMEOUT_MS = 15000; // delete_user_data varre ~20 tabelas numa transação — orçamento maior que uma query simples.
const EXPORTS_BUCKET = "exports";
const STORAGE_REMOVE_BATCH_SIZE = 100; // mesmo lote de data-retention-purge/lib.ts.

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

  // Corpo é opcional — se ausente/vazio, a ação é sempre sobre o próprio
  // usuário autenticado (nunca é preciso informar um alvo).
  let body: Record<string, unknown> = {};
  const rawBody = await req.text();
  if (rawBody.trim().length > 0) {
    try {
      body = JSON.parse(rawBody);
    } catch {
      log("warn", { requestId, userId: user.id }, "Corpo da requisição não é JSON válido");
      return jsonResponse(
        { error: "invalid_body", message: "Corpo da requisição, quando enviado, deve ser JSON válido." },
        400,
        origin,
      );
    }
  }

  const targetValidation = validateTargetUserId(body.user_id, user.id);
  if (!targetValidation.ok) {
    log("warn", { requestId, userId: user.id }, "Tentativa de exclusão rejeitada — alvo não corresponde ao usuário autenticado", {
      validation_error: targetValidation.error,
    });
    const status = targetValidation.error === "forbidden_target_mismatch" ? 403 : 400;
    return jsonResponse({ error: targetValidation.error, message: targetValidation.message }, status, origin);
  }

  const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });

  // ---------------------------------------------------------------------
  // (i) Remove toda linha de `public` associada ao usuário — transação
  // atômica dentro da própria função SQL. Falha aqui interrompe tudo: nada
  // foi apagado (nem Storage, nem auth.users), resposta de erro clara.
  // ---------------------------------------------------------------------
  let deletedCounts: Record<string, unknown> = {};
  try {
    const { data, error } = await withTimeout(
      adminClient.rpc("delete_user_data", { p_user_id: user.id }),
      DB_TIMEOUT_MS,
      "rpc delete_user_data",
    );
    if (error) throw error;
    deletedCounts = (data ?? {}) as Record<string, unknown>;
  } catch (err) {
    log("error", { requestId, userId: user.id }, "Falha ao remover dado de public — exclusão de conta abortada, nenhuma linha removida", {
      error: err instanceof Error ? err.message : String(err),
    });
    return jsonResponse(
      {
        error: "account_data_deletion_failed",
        message: "Não foi possível excluir os dados da conta. Nenhuma alteração foi feita. Tente novamente.",
      },
      502,
      origin,
    );
  }

  log("info", { requestId, userId: user.id }, "Dados de public removidos", {
    total_rows_deleted: totalDeletedRows(deletedCounts),
    detail: deletedCounts,
  });

  // ---------------------------------------------------------------------
  // (ii) Exports pendentes do bucket `exports` — não fatal (dado financeiro
  // já foi removido no passo (i); um objeto órfão é bloat, não vazamento).
  // ---------------------------------------------------------------------
  let storageRemovedCount = 0;
  let storageWarning: string | null = null;
  try {
    const { data: entries, error: listError } = await withTimeout(
      adminClient.storage.from(EXPORTS_BUCKET).list(user.id),
      DB_TIMEOUT_MS,
      "storage list exports",
    );
    if (listError) throw listError;

    const paths = buildExportObjectPaths(user.id, entries ?? []);
    for (const batch of chunk(paths, STORAGE_REMOVE_BATCH_SIZE)) {
      if (batch.length === 0) continue;
      const { error: removeError } = await adminClient.storage.from(EXPORTS_BUCKET).remove(batch);
      if (removeError) throw removeError;
      storageRemovedCount += batch.length;
    }
  } catch (err) {
    storageWarning = err instanceof Error ? err.message : String(err);
    log("error", { requestId, userId: user.id }, "Falha ao remover exports pendentes do Storage — prosseguindo mesmo assim (dado financeiro já removido)", {
      error: storageWarning,
    });
  }

  // ---------------------------------------------------------------------
  // (iii) Remove o usuário de Supabase Auth via Admin API. Falha aqui é
  // crítica: dado público já foi apagado, mas a conta em auth.users ainda
  // existe — nunca mascarado como sucesso.
  // ---------------------------------------------------------------------
  try {
    const { error: deleteUserError } = await withTimeout(
      adminClient.auth.admin.deleteUser(user.id),
      DB_TIMEOUT_MS,
      "auth.admin.deleteUser",
    );
    if (deleteUserError) throw deleteUserError;
  } catch (err) {
    log("error", { requestId, userId: user.id }, "CRÍTICO: dado de public já removido, mas falha ao remover o usuário de auth.users — estado parcial", {
      error: err instanceof Error ? err.message : String(err),
    });
    return jsonResponse(
      {
        error: "auth_account_deletion_failed",
        message:
          "Os dados financeiros da conta foram removidos, mas não foi possível concluir a remoção do login. Contate o suporte.",
        partial: true,
      },
      500,
      origin,
    );
  }

  log("info", { requestId, userId: user.id }, "Conta excluída com sucesso", {
    total_rows_deleted: totalDeletedRows(deletedCounts),
    storage_removed_count: storageRemovedCount,
    storage_warning: storageWarning,
  });

  return jsonResponse(
    {
      ok: true,
      deleted_rows: deletedCounts,
      storage_removed_count: storageRemovedCount,
      storage_warning: storageWarning,
    },
    200,
    origin,
  );
});
