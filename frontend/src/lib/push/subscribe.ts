import { getVapidPublicKey } from "../env";
import { createPushSubscription, deletePushSubscription, listPushSubscriptions } from "../api/notifications";

/**
 * Web Push (FE-F2-07) — wiring de `PushManager.subscribe()` no client, gerando o
 * registro em `push_subscriptions` que `BE-F2-09` já sabe consumir (`notify_user()` →
 * `push-dispatch`), mas que nenhuma tarefa de Frontend anterior chamava ainda.
 *
 * DIR-14 (`NotificationCenter` é sempre o canal primário, push é reforço): toda função
 * aqui degrada silenciosamente (retorna `false`/`null`) quando o navegador não suporta
 * Service Worker/Push (ex. iOS Safari em versões antigas, ADR-003) ou quando
 * `VITE_VAPID_PUBLIC_KEY` não está configurada — nunca lança e nunca bloqueia o resto
 * do app.
 */

/** `applicationServerKey` do `PushManager.subscribe()` exige `Uint8Array<ArrayBuffer>`, não a string base64url bruta. */
function urlBase64ToUint8Array(base64Url: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64Url.length % 4)) % 4);
  const base64 = (base64Url + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const output = new Uint8Array(new ArrayBuffer(rawData.length));
  for (let i = 0; i < rawData.length; i += 1) {
    output[i] = rawData.charCodeAt(i);
  }
  return output;
}

export function isPushSupported(): boolean {
  return typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window;
}

/** Se já existe inscrição ativa neste navegador (Service Worker), independente de já estar persistida no servidor. */
export async function getExistingPushSubscription(): Promise<PushSubscription | null> {
  if (!isPushSupported()) return null;
  const registration = await navigator.serviceWorker.ready;
  return registration.pushManager.getSubscription();
}

/**
 * Inscreve o navegador atual em Web Push e persiste em `POST /push_subscriptions`.
 * Retorna `true` em sucesso, `false` em qualquer degradação (sem suporte, chave
 * ausente, permissão negada) — nunca lança, para nunca quebrar S-SET-02.
 */
export async function subscribeToPush(): Promise<boolean> {
  if (!isPushSupported()) return false;
  const vapidPublicKey = getVapidPublicKey();
  if (!vapidPublicKey) return false;

  try {
    const permission = await Notification.requestPermission();
    if (permission !== "granted") return false;

    const registration = await navigator.serviceWorker.ready;
    let subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
      });
    }

    const json = subscription.toJSON();
    if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) return false;

    await createPushSubscription({
      endpoint: json.endpoint,
      p256dh: json.keys.p256dh,
      auth_key: json.keys.auth,
      user_agent: navigator.userAgent,
    });
    return true;
  } catch {
    return false;
  }
}

/** Desinscreve o navegador atual e remove o registro correspondente do servidor (se existir). */
export async function unsubscribeFromPush(): Promise<void> {
  if (!isPushSupported()) return;
  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription();
  if (!subscription) return;

  const endpoint = subscription.endpoint;
  await subscription.unsubscribe().catch(() => undefined);

  try {
    const existing = await listPushSubscriptions();
    const match = existing.find((row) => row.endpoint === endpoint);
    if (match) await deletePushSubscription(match.id);
  } catch {
    // Best-effort — a inscrição local já foi removida; um registro órfão no servidor
    // só significa uma tentativa de push que falhará silenciosamente (404/410, já
    // tratado por `push-dispatch`), nunca quebra a UI.
  }
}
