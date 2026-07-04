// Lightweight, framework-agnostic analytics tracker (a mini Plausible/Vercel
// beacon). Designed for near-zero page-performance impact:
//
//   • Nothing here is ever awaited by the UI — every send is fire-and-forget.
//   • Events are queued in memory and flushed in batches, on idle time.
//   • Flushes prefer navigator.sendBeacon (survives page unload, off the main
//     thread) and fall back to fetch(..., { keepalive: true }).
//   • Duplicate page views (same path in a short window) are dropped — this
//     absorbs React StrictMode's double-effect in development.
//   • Failed fetch flushes retry with exponential backoff; flushes are
//     client-rate-limited; admin pages are never tracked.
//
// The visitor id is an opaque random UUID in localStorage (no PII, ~1 year); the
// session id rotates after 30 minutes of inactivity. Neither is ever read back
// from the server, and the backend never returns them.
import { API_BASE_URL } from "@/lib/config";
import type { AnalyticsEventType, AnalyticsProps, EventBatch, QueuedEvent } from "./types";

const VISITOR_KEY = "bq_vid";
const SESSION_KEY = "bq_sid";
const SESSION_TS_KEY = "bq_sid_ts";

const SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30 min inactivity → new session
const BATCH_MAX = 15; // flush immediately once the queue reaches this
const FLUSH_DEBOUNCE_MS = 2000; // otherwise coalesce for this long
const DEDUP_WINDOW_MS = 1500; // ignore identical page_view within this window
const MAX_RETRIES = 4;
const RETRY_BASE_MS = 1000;
const RATE_MAX_FLUSHES = 20; // per rate window
const RATE_WINDOW_MS = 10_000;

const ENDPOINT = `${API_BASE_URL}/analytics/event`;

let queue: QueuedEvent[] = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;
let lastPageView: { path: string; ts: number } | null = null;
let flushTimestamps: number[] = [];
let lifecycleBound = false;

// --- id helpers ---------------------------------------------------------------

function uuid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}

function safeGet(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSet(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    /* private mode / storage disabled — analytics simply degrades to no-op */
  }
}

function getVisitorId(): string {
  let id = safeGet(VISITOR_KEY);
  if (!id) {
    id = uuid();
    safeSet(VISITOR_KEY, id);
  }
  return id;
}

function getSessionId(): string {
  const now = Date.now();
  const last = Number(safeGet(SESSION_TS_KEY) || 0);
  let id = safeGet(SESSION_KEY);
  if (!id || now - last > SESSION_TIMEOUT_MS) {
    id = uuid();
    safeSet(SESSION_KEY, id);
  }
  safeSet(SESSION_TS_KEY, String(now));
  return id;
}

// --- gating -------------------------------------------------------------------

function isEnabled(): boolean {
  if (typeof window === "undefined") return false;
  if (process.env.NEXT_PUBLIC_ANALYTICS_ENABLED === "false") return false;
  // Never track the admin dashboard itself.
  if (window.location.pathname.startsWith("/admin")) return false;
  return true;
}

// --- queue + flush ------------------------------------------------------------

function scheduleFlush(): void {
  if (flushTimer) return;
  const run = () => {
    flushTimer = null;
    flush(false);
  };
  flushTimer = setTimeout(() => {
    // Do the actual work when the browser is idle, if it supports it.
    const ric = (window as typeof window & {
      requestIdleCallback?: (cb: () => void) => void;
    }).requestIdleCallback;
    if (ric) ric(run);
    else run();
  }, FLUSH_DEBOUNCE_MS);
}

function rateLimited(): boolean {
  const now = Date.now();
  flushTimestamps = flushTimestamps.filter((t) => now - t < RATE_WINDOW_MS);
  if (flushTimestamps.length >= RATE_MAX_FLUSHES) return true;
  flushTimestamps.push(now);
  return false;
}

function buildBatch(events: QueuedEvent[]): EventBatch {
  return {
    visitorId: getVisitorId(),
    sessionId: getSessionId(),
    events,
    client: {
      screen: `${window.screen?.width || 0}x${window.screen?.height || 0}`,
      lang: document.documentElement.lang || navigator.language,
    },
  };
}

/**
 * Send the queued events. `useBeacon` is set on page-hide paths, where
 * sendBeacon is the only reliable transport. Otherwise we use keepalive fetch so
 * we can observe failures and retry.
 */
function flush(useBeacon: boolean, attempt = 0): void {
  if (flushTimer) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }
  if (queue.length === 0) return;
  if (rateLimited()) return;

  const events = queue;
  queue = [];
  const body = JSON.stringify(buildBatch(events));

  if (useBeacon && typeof navigator !== "undefined" && navigator.sendBeacon) {
    try {
      const ok = navigator.sendBeacon(ENDPOINT, new Blob([body], { type: "application/json" }));
      if (ok) return;
    } catch {
      /* fall through to fetch */
    }
  }

  fetch(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
    keepalive: true,
    // Analytics is anonymous; no cookies needed and this keeps it cheap.
    credentials: "omit",
    cache: "no-store",
  }).catch(() => {
    // Re-queue and retry with exponential backoff (best-effort).
    if (attempt < MAX_RETRIES) {
      queue = events.concat(queue);
      setTimeout(() => flush(false, attempt + 1), RETRY_BASE_MS * 2 ** attempt);
    }
  });
}

function bindLifecycle(): void {
  if (lifecycleBound || typeof window === "undefined") return;
  lifecycleBound = true;
  // Flush the moment the page is backgrounded/closed — the most reliable point.
  const beaconFlush = () => flush(true);
  window.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") beaconFlush();
  });
  window.addEventListener("pagehide", beaconFlush);
}

// --- public API ---------------------------------------------------------------

/**
 * Queue an analytics event. Safe to call anywhere on the client — it never
 * throws and never blocks. No-ops during SSR and on admin pages.
 */
export function track(type: AnalyticsEventType, props: AnalyticsProps = {}): void {
  if (!isEnabled()) return;
  bindLifecycle();

  const path = props.path ?? window.location.pathname + window.location.search;

  // Drop duplicate page views (StrictMode double-mount, rapid re-renders).
  if (type === "page_view") {
    const now = Date.now();
    if (lastPageView && lastPageView.path === path && now - lastPageView.ts < DEDUP_WINDOW_MS) {
      return;
    }
    lastPageView = { path, ts: now };
  }

  const event: QueuedEvent = {
    type,
    path,
    productId: props.productId != null ? Number(props.productId) : null,
    value: props.value,
    meta: props.meta,
    ts: Date.now(),
  };
  if (type === "page_view" && document.referrer) {
    event.referrer = document.referrer;
  }

  queue.push(event);
  if (queue.length >= BATCH_MAX) flush(false);
  else scheduleFlush();
}

/** Convenience wrapper used by the route-change effect. */
export function trackPageView(path?: string): void {
  track("page_view", path ? { path } : {});
}
