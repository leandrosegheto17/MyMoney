// BE-F2-09 — Ponto único de disparo de Web Push (RF-F2-09 AC1). Chamada por
// `public.notify_user()` via `pg_net` a cada notificação criada (orçamento
// próximo do teto — check_budget_alerts, RF-MVP-07 — ou conta fixa a vencer
// — check_fixed_bill_due_alerts, RF-F2-07/BE-F2-07) — NUNCA por um client
// autenticado. Sob demanda, não é um job pg_cron: dispara 1x por
// notificação, por isso não tem agendamento próprio (diferente de
// backup-export/invoice-close/recurring-generate/fixed-bill-generate).
//
// Mesmo padrão de auth das demais Edge Functions internas: segredo
// compartilhado `X-Cron-Secret`, fail-closed, deployada com
// `--no-verify-jwt` (não há JWT de usuário nesse contexto).
//
// A notificação em si já foi persistida por notify_user() ANTES desta
// function ser chamada (histórico consultável no app independente de push
// entregue, RF-F2-09 AC2, DIR-14) — esta function só entrega o push, nunca
// decide se/quando notificar (isso é check_budget_alerts/check_fixed_bill_
// due_alerts, camada SQL).
//
// Usa `npm:web-push` para a assinatura VAPID (RFC 8292) e criptografia do
// payload (RFC 8291, aes128gcm) — protocolo correto e sutil o bastante para
// preferir uma implementação já testada em produção a reimplementar a
// criptografia à mão (diferente de backup-export, que usa Web Crypto direto
// para AES-GCM simples; aqui o formato aes128gcm + derivação ECDH/HKDF tem
// muito mais superfície pra erro sutil e silencioso).

import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2";
import webpush from "npm:web-push@3";
import { buildPushPayload, isAuthorizedCronRequest, isExpiredSubscriptionStatus } from "./lib.ts";
import type { NotificationRow } from "./lib.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const CRON_SECRET = Deno.env.get("PUSH_DISPATCH_CRON_SECRET") ?? null;
const VAPID_PUBLIC_KEY = Deno.env.get("VAPID_PUBLIC_KEY") ?? null;
const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY") ?? null;
const VAPID_SUBJECT = Deno.env.get("VAPID_SUBJECT") ?? null;

function serviceClient(): SupabaseClient {
  return createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });
}

interface DispatchSummary {
  ok: boolean;
  notification_id?: string;
  subscriptions_total: number;
  sent: number;
  expired_removed: number;
  failed: number;
  error?: string;
}

async function dispatch(notificationId: string): Promise<Response> {
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY || !VAPID_SUBJECT) {
    const summary: DispatchSummary = {
      ok: false,
      notification_id: notificationId,
      subscriptions_total: 0,
      sent: 0,
      expired_removed: 0,
      failed: 0,
      error: "VAPID_PUBLIC_KEY/VAPID_PRIVATE_KEY/VAPID_SUBJECT não configuradas",
    };
    console.error(summary.error);
    return new Response(JSON.stringify(summary), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

  const client = serviceClient();

  const { data: notification, error: notifError } = await client
    .from("notifications")
    .select("id, user_id, type, message, related_entity_type, related_entity_id")
    .eq("id", notificationId)
    .maybeSingle<NotificationRow>();

  if (notifError || !notification) {
    const summary: DispatchSummary = {
      ok: false,
      notification_id: notificationId,
      subscriptions_total: 0,
      sent: 0,
      expired_removed: 0,
      failed: 0,
      error: notifError ? notifError.message : "notificação não encontrada",
    };
    return new Response(JSON.stringify(summary), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { data: subscriptions, error: subError } = await client
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth_key")
    .eq("user_id", notification.user_id);

  if (subError) {
    const summary: DispatchSummary = {
      ok: false,
      notification_id: notificationId,
      subscriptions_total: 0,
      sent: 0,
      expired_removed: 0,
      failed: 0,
      error: subError.message,
    };
    return new Response(JSON.stringify(summary), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  const payload = JSON.stringify(buildPushPayload(notification));
  let sent = 0;
  let expiredRemoved = 0;
  let failed = 0;

  for (const sub of subscriptions ?? []) {
    try {
      await webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh, auth: sub.auth_key },
        },
        payload,
      );
      sent++;
    } catch (err) {
      const statusCode = (err as { statusCode?: number })?.statusCode;
      if (isExpiredSubscriptionStatus(statusCode)) {
        await client.from("push_subscriptions").delete().eq("id", sub.id);
        expiredRemoved++;
      } else {
        failed++;
        console.error(`push-dispatch: falha ao enviar para subscription ${sub.id}:`, err);
      }
    }
  }

  const summary: DispatchSummary = {
    ok: true,
    notification_id: notificationId,
    subscriptions_total: (subscriptions ?? []).length,
    sent,
    expired_removed: expiredRemoved,
    failed,
  };
  return new Response(JSON.stringify(summary), {
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

  let body: { notification_id?: string };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ ok: false, error: "invalid JSON body" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (!body.notification_id) {
    return new Response(JSON.stringify({ ok: false, error: "notification_id ausente" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  return await dispatch(body.notification_id);
});
