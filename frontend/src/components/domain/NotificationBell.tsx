import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Badge } from "../base/Badge";
import { EmptyState } from "../base/EmptyState";
import { Modal } from "../base/Modal";
import { Skeleton } from "../base/Skeleton";
import { countUnreadNotifications, listNotifications, markNotificationRead } from "../../lib/api/notifications";
import { ApiError } from "../../lib/api/errors";
import type { Notification } from "../../lib/api/types";

const POLL_INTERVAL_MS = 60_000;

/** Notificação → rota da entidade relacionada (UX-SPEC S-NOT-01: "toque leva à entidade relacionada"). */
function routeForNotification(notification: Notification): string | null {
  if (notification.related_entity_type === "budget_warning" || notification.related_entity_type === "budget_exceeded") {
    return "/orcamento";
  }
  if (notification.related_entity_type === "fixed_bill") {
    return "/contas-fixas";
  }
  return null;
}

const RELATIVE_FORMATTER = new Intl.RelativeTimeFormat("pt-BR", { numeric: "auto" });

function formatRelative(createdAt: string): string {
  const diffMs = new Date(createdAt).getTime() - Date.now();
  const diffMinutes = Math.round(diffMs / 60_000);
  if (Math.abs(diffMinutes) < 60) return RELATIVE_FORMATTER.format(diffMinutes, "minute");
  const diffHours = Math.round(diffMinutes / 60);
  if (Math.abs(diffHours) < 24) return RELATIVE_FORMATTER.format(diffHours, "hour");
  return RELATIVE_FORMATTER.format(Math.round(diffHours / 24), "day");
}

/**
 * NotificationBell + NotificationCenter — UX-SPEC.md S-NOT-01/02 (RF-F2-09 AC2, DIR-14).
 * "Sino sempre acessível independente de push ter sido entregue" — busca
 * `GET /notifications` ao montar e por polling (não depende só de push chegar para
 * atualizar o contador, AC literal de `FE-F2-07`). Toque em cada item leva à entidade
 * relacionada e marca como lida.
 */
export function NotificationBell() {
  const navigate = useNavigate();
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const refreshUnreadCount = useCallback(() => {
    // `try/catch` (não `.then/.catch`) porque `getSupabaseClient()` pode lançar
    // *sincronamente* (env ausente) antes de qualquer Promise existir — encadear só
    // `.catch()` não capturaria esse caso. Falha de rede/env não deve quebrar o resto
    // do app: o sino simplesmente não atualiza o contador até a próxima tentativa
    // (DIR-14, canal primário é o histórico consultado ao abrir, não o contador em si).
    void (async () => {
      try {
        setUnreadCount(await countUnreadNotifications());
      } catch {
        // degrada silenciosamente
      }
    })();
  }, []);

  useEffect(() => {
    refreshUnreadCount();
    const interval = setInterval(refreshUnreadCount, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [refreshUnreadCount]);

  async function openCenter() {
    setIsOpen(true);
    setLoadError(null);
    try {
      setNotifications(await listNotifications());
    } catch (cause) {
      setLoadError(cause instanceof ApiError ? cause.message : "Não foi possível carregar as notificações.");
    }
  }

  async function handleSelect(notification: Notification) {
    if (!notification.read_at) {
      try {
        await markNotificationRead(notification.id);
        setNotifications((current) => current?.map((n) => (n.id === notification.id ? { ...n, read_at: new Date().toISOString() } : n)) ?? null);
        refreshUnreadCount();
      } catch {
        // Marcar como lida é best-effort para a navegação — segue para a entidade mesmo se falhar.
      }
    }
    const route = routeForNotification(notification);
    setIsOpen(false);
    if (route) navigate(route);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => void openCenter()}
        aria-label={unreadCount > 0 ? `Notificações, ${unreadCount} não lidas` : "Notificações"}
        className="relative flex min-h-11 min-w-11 items-center justify-center rounded-md text-neutral-600 hover:bg-neutral-100 focus-visible:outline-2 focus-visible:outline-primary"
      >
        <span aria-hidden="true" className="text-xl">
          🔔
        </span>
        {unreadCount > 0 && (
          <span
            aria-hidden="true"
            className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-semibold text-white"
          >
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} title="Notificações">
        {loadError && <p className="text-sm text-danger">{loadError}</p>}
        {!notifications && !loadError && <Skeleton lines={4} aria-label="Carregando notificações" />}
        {notifications && notifications.length === 0 && <EmptyState title="Nenhuma notificação ainda" />}
        {notifications && notifications.length > 0 && (
          <ul className="flex flex-col gap-1">
            {notifications.map((notification) => (
              <li key={notification.id}>
                <button
                  type="button"
                  onClick={() => void handleSelect(notification)}
                  className="flex w-full items-start gap-2 rounded-md px-2 py-2 text-left text-sm hover:bg-neutral-100 focus-visible:outline-2 focus-visible:outline-primary"
                >
                  {!notification.read_at && (
                    <span aria-hidden="true" className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />
                  )}
                  {notification.read_at && <span aria-hidden="true" className="mt-1.5 h-2 w-2 shrink-0" />}
                  <div className="flex-1">
                    <p className={notification.read_at ? "text-neutral-600" : "font-medium text-neutral-900"}>{notification.message}</p>
                    <p className="text-xs text-neutral-400">{formatRelative(notification.created_at)}</p>
                  </div>
                  {!notification.read_at && <Badge tone="primary">Nova</Badge>}
                </button>
              </li>
            ))}
          </ul>
        )}
      </Modal>
    </>
  );
}
