"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getToken, isAuthenticated } from "@/lib/auth";
import {
  AdminNotification,
  fetchNotifications,
  fetchUnreadCount,
  markAllNotificationsRead,
  markNotificationRead,
  notificationStreamUrl,
} from "@/services/notifications";
import { playChime, showBrowserNotification } from "@/lib/adminNotify";

const LIST_LIMIT = 20;
const KEEP_IN_MEMORY = 30;
const RECONNECT_DELAY_MS = 5_000;
// Re-open the stream with a fresh token before the 15-min access token expires.
const ROTATE_MS = 10 * 60 * 1000;

/**
 * Owns the admin notification feed and its realtime SSE stream. The database is
 * the source of truth: on every (re)connect and on tab re-focus it re-fetches the
 * persisted list + unread count, so a temporary disconnect never silently drops a
 * notification. Incoming SSE events are de-duplicated by id, so a page refresh or
 * multiple tabs never double-count. Browser notification + sound fire only for a
 * genuinely new, unread event.
 */
export function useAdminNotifications() {
  const [items, setItems] = useState<AdminNotification[]>([]);
  const [unread, setUnread] = useState(0);
  const [connected, setConnected] = useState(false);

  const esRef = useRef<EventSource | null>(null);
  const reconnectRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rotateRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const seenRef = useRef<Set<number>>(new Set());
  const closedRef = useRef(false);

  /** Reconcile against the DB (source of truth). */
  const load = useCallback(async () => {
    // Only bail if there is no session at all. A merely-expired access token is
    // fine: the axios client transparently refreshes it on the 401. (Guarding on
    // isAuthenticated() here would wrongly kill the whole feed after 15 min.)
    if (!getToken()) return;
    try {
      const [list, count] = await Promise.all([
        fetchNotifications(LIST_LIMIT),
        fetchUnreadCount(),
      ]);
      seenRef.current = new Set(list.map((n) => n.id));
      setItems(list);
      setUnread(count);
    } catch {
      /* transient — the next reconnect/refresh will reconcile */
    }
  }, []);

  const handleIncoming = useCallback((n: AdminNotification) => {
    if (seenRef.current.has(n.id)) return; // dedupe: refresh / multi-event
    seenRef.current.add(n.id);
    setItems((prev) => [n, ...prev].slice(0, KEEP_IN_MEMORY));
    if (!n.read) setUnread((c) => c + 1);
    // Side effects only for genuinely new, unread notifications.
    playChime();
    showBrowserNotification(n, () => {
      if (n.orderId != null) window.location.href = `/admin-v2/orders/${n.orderId}`;
    });
  }, []);

  const connect = useCallback(async () => {
    if (typeof window === "undefined" || closedRef.current || !getToken()) return;
    // load() first: it reconciles missed events AND (via axios) refreshes an
    // expired access token, so the token we then put in the stream URL is valid.
    await load();
    if (closedRef.current) return;
    const token = getToken();
    // If the refresh failed the session is truly gone — don't open a doomed stream.
    if (!token || !isAuthenticated()) return;

    esRef.current?.close();
    const es = new EventSource(notificationStreamUrl(token));
    esRef.current = es;

    es.addEventListener("ready", () => setConnected(true));
    es.addEventListener("notification", (e) => {
      try {
        handleIncoming(JSON.parse((e as MessageEvent).data));
      } catch {
        /* malformed payload — ignore */
      }
    });
    es.onerror = () => {
      setConnected(false);
      es.close();
      if (closedRef.current) return;
      if (reconnectRef.current) clearTimeout(reconnectRef.current);
      reconnectRef.current = setTimeout(() => void connect(), RECONNECT_DELAY_MS);
    };
  }, [load, handleIncoming]);

  useEffect(() => {
    closedRef.current = false;
    void connect();

    rotateRef.current = setInterval(() => void connect(), ROTATE_MS);

    const onVisible = () => {
      if (document.visibilityState !== "visible") return;
      // Mobile browsers suspend background tabs and drop the stream. On refocus,
      // reconcile immediately, and re-open the stream if it was closed.
      void load();
      if (!esRef.current || esRef.current.readyState === EventSource.CLOSED) {
        void connect();
      }
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      closedRef.current = true;
      esRef.current?.close();
      if (reconnectRef.current) clearTimeout(reconnectRef.current);
      if (rotateRef.current) clearInterval(rotateRef.current);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [connect, load]);

  const markRead = useCallback((id: number) => {
    setItems((prev) => {
      const wasUnread = prev.some((n) => n.id === id && !n.read);
      if (wasUnread) setUnread((c) => Math.max(0, c - 1));
      return prev.map((n) =>
        n.id === id ? { ...n, read: true, readAt: new Date().toISOString() } : n
      );
    });
    void markNotificationRead(id).catch(() => {});
  }, []);

  const markAll = useCallback(() => {
    setItems((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnread(0);
    void markAllNotificationsRead().catch(() => {});
  }, []);

  return { items, unread, connected, markRead, markAll, reload: load };
}
