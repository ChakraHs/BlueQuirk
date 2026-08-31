// Advertising / campaign attribution capture (UTM + Meta click id).
//
// When a visitor first arrives — typically from a Meta ad — the landing URL
// carries `utm_*` parameters (and `fbclid`). We capture them ONCE (first-touch)
// and persist them in localStorage so they survive the whole journey:
//
//     Landing → Product → Cart → Checkout → Purchase
//
// IMPORTANT: attribution is NOT a Meta event and must never be confused with
// product identifiers. `utm_content` (which ad card was clicked, e.g. a carousel
// card) is completely separate from a product's `content_ids`. Meta's own
// attribution works off the `_fbp` / `_fbc` cookies the Pixel sets automatically
// (it reads `fbclid` for us); these captured UTMs are for OUR records and for the
// future Conversions API to forward as custom data. We store them, we don't send
// them into standard Pixel events.

const KEY = "bq_attribution";
const UTM_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"] as const;

export type Attribution = {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
  /** Meta click id from the landing URL (the Pixel also reads this itself). */
  fbclid?: string;
  /** When first captured (ISO) — lets a consumer expire stale attribution. */
  capturedAt?: string;
};

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
    /* private mode / storage disabled — attribution simply degrades to no-op */
  }
}

/** The stored first-touch attribution, or an empty object. Never throws. */
export function getAttribution(): Attribution {
  if (typeof window === "undefined") return {};
  const raw = safeGet(KEY);
  if (!raw) return {};
  try {
    return JSON.parse(raw) as Attribution;
  } catch {
    return {};
  }
}

/**
 * Capture UTM params + fbclid from the CURRENT url, first-touch wins. Called on
 * initial load (and route changes) by the TrackingProvider. If attribution is
 * already stored we keep it — the first ad that brought the visitor in is the one
 * that should get credit. Only writes when the current URL actually carries
 * campaign params, so ordinary internal navigation never clobbers it.
 */
export function captureAttribution(): Attribution {
  if (typeof window === "undefined") return {};

  const existing = getAttribution();
  if (existing.utm_source || existing.utm_campaign || existing.fbclid) {
    return existing; // first-touch already recorded
  }

  const params = new URLSearchParams(window.location.search);
  const next: Attribution = {};
  for (const key of UTM_KEYS) {
    const v = params.get(key);
    if (v) next[key] = v.slice(0, 256);
  }
  const fbclid = params.get("fbclid");
  if (fbclid) next.fbclid = fbclid.slice(0, 512);

  // Nothing to record — leave storage untouched.
  if (Object.keys(next).length === 0) return existing;

  next.capturedAt = new Date().toISOString();
  safeSet(KEY, JSON.stringify(next));
  return next;
}
