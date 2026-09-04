// BE-F2-09 — Ponto único de disparo de Web Push (RF-F2-09 AC1). Helpers
// puros/testáveis, separados de `index.ts` (wiring HTTP/push-service) —
// mesmo princípio de backup-export/invoice-close/recurring-generate/
// fixed-bill-generate (automated-testing).

// ---- Autorização do gatilho (notify_user via pg_net, sem JWT de usuário) ----

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** Fail-closed: sem segredo configurado, ou sem header, ou valores diferentes -> nega. */
export function isAuthorizedCronRequest(
  headerValue: string | null,
  expectedSecret: string | null,
): boolean {
  if (!expectedSecret) return false;
  if (!headerValue) return false;
  return timingSafeEqual(headerValue, expectedSecret);
}

export interface NotificationRow {
  id: string;
  user_id: string;
  type: "budget_alert" | "fixed_bill_due";
  message: string;
  related_entity_type: string | null;
  related_entity_id: string | null;
}

export interface PushPayload {
  title: string;
  body: string;
  data: {
    notification_id: string;
    type: string;
    related_entity_type: string | null;
    related_entity_id: string | null;
  };
}

/** DIR-14: título curto + mensagem completa no corpo; `data` carrega o
 *  suficiente pro client navegar até a entidade relacionada ao tocar. */
export function buildPushPayload(notification: NotificationRow): PushPayload {
  const title = notification.type === "budget_alert" ? "Orçamento" : "Conta fixa";
  return {
    title,
    body: notification.message,
    data: {
      notification_id: notification.id,
      type: notification.type,
      related_entity_type: notification.related_entity_type,
      related_entity_id: notification.related_entity_id,
    },
  };
}

/** RFC 8030 — subscription expirado/cancelado: remover, não é falha a
 *  reportar (higiene padrão de Web Push, evita re-tentar pra sempre). */
export function isExpiredSubscriptionStatus(statusCode: number | undefined): boolean {
  return statusCode === 404 || statusCode === 410;
}
