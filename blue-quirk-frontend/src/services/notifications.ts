import api from "@/services/api";
import { API_BASE_URL } from "@/lib/config";

/** One admin notification as returned by the backend + SSE stream. */
export type AdminNotification = {
  id: number;
  type: string;
  title: string;
  message: string | null;
  orderId: number | null;
  orderNumber: string | null;
  customerName: string | null;
  total: number;
  itemCount: number;
  createdAt: string;
  readAt: string | null;
  read: boolean;
};

/** Recent notifications for the current admin (newest first). */
export async function fetchNotifications(limit = 20): Promise<AdminNotification[]> {
  const { data } = await api.get<AdminNotification[]>("/admin/notifications", {
    params: { limit },
  });
  return data;
}

/** Unread count for the bell badge (authoritative, from the DB). */
export async function fetchUnreadCount(): Promise<number> {
  const { data } = await api.get<{ count: number }>("/admin/notifications/unread-count");
  return data.count ?? 0;
}

export async function markNotificationRead(id: number): Promise<void> {
  await api.post(`/admin/notifications/${id}/read`);
}

export async function markAllNotificationsRead(): Promise<void> {
  await api.post("/admin/notifications/read-all");
}

/**
 * SSE stream URL. EventSource cannot send an Authorization header, so the
 * short-lived access token rides in the query string — the backend accepts it
 * for this one path only (SseBearerTokenResolver) and still fully validates it.
 */
export function notificationStreamUrl(token: string): string {
  return `${API_BASE_URL}/admin/notifications/stream?access_token=${encodeURIComponent(token)}`;
}

// --- Web Push (VAPID) ---------------------------------------------------------

/** VAPID public key + whether the backend has push configured. */
export async function fetchPushPublicKey(): Promise<{ enabled: boolean; publicKey: string }> {
  const { data } = await api.get<{ enabled: boolean; publicKey: string }>(
    "/admin/push/public-key"
  );
  return data;
}

/** Registers this browser's push subscription for the current admin. */
export async function savePushSubscription(sub: PushSubscriptionJSON): Promise<void> {
  await api.post("/admin/push/subscribe", {
    endpoint: sub.endpoint,
    keys: sub.keys,
  });
}

/** Removes this browser's push subscription. */
export async function deletePushSubscription(endpoint: string): Promise<void> {
  await api.post("/admin/push/unsubscribe", { endpoint });
}
