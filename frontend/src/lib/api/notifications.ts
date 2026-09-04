import { getSupabaseClient } from "../supabase/client";
import { unwrap } from "./request";
import type { NewPushSubscription, Notification, PushSubscription } from "./types";

/** `GET /notifications?order=created_at.desc` (RF-F2-09 AC2, S-NOT-01) — histórico sempre disponível, independente de push. */
export async function listNotifications(): Promise<Notification[]> {
  return unwrap(getSupabaseClient().from("notifications").select("*").order("created_at", { ascending: false }));
}

/** `GET /notifications?read_at=is.null` — usado pelo `NotificationBell` para o contador de não lidas. */
export async function countUnreadNotifications(): Promise<number> {
  const rows = await unwrap<{ id: string }[]>(getSupabaseClient().from("notifications").select("id").is("read_at", null));
  return rows.length;
}

/** `PATCH /notifications?id=eq.{id}` — marcar como lida. */
export async function markNotificationRead(id: string): Promise<Notification> {
  return unwrap(
    getSupabaseClient().from("notifications").update({ read_at: new Date().toISOString() }).eq("id", id).select().single(),
  );
}

/** `POST /push_subscriptions` — registra o resultado de `PushManager.subscribe()` no client (FE-F2-07). */
export async function createPushSubscription(input: NewPushSubscription): Promise<PushSubscription> {
  return unwrap(getSupabaseClient().from("push_subscriptions").insert(input).select().single());
}

/** `DELETE /push_subscriptions?id=eq.{id}` */
export async function deletePushSubscription(id: string): Promise<void> {
  await unwrap(getSupabaseClient().from("push_subscriptions").delete().eq("id", id).select());
}

/** `GET /push_subscriptions` — usado para checar se o endpoint atual do navegador já está inscrito. */
export async function listPushSubscriptions(): Promise<PushSubscription[]> {
  return unwrap(getSupabaseClient().from("push_subscriptions").select("*"));
}
