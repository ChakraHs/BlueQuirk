// TrackingService — the single façade the storefront uses for marketing/ads
// tracking. Business logic calls the high-level methods below; the service
// normalizes each into a CommerceEvent and fans it out to every registered
// provider (Meta Pixel today; GA4 / TikTok / Meta CAPI can be added by simply
// registering another provider — the commerce code never changes).
//
// Design guarantees:
//   • Fail-safe: every provider dispatch is wrapped in try/catch. A tracking
//     failure can NEVER throw into product/cart/checkout/order flows.
//   • No-op until a provider is registered — so a disabled/unconfigured store
//     does zero work.
//   • Purchase is idempotent (see `purchase`) — the same order can't emit two
//     conversion events across refresh / back-forward / re-render / re-render.
import type { CommerceContent, CommerceEvent, TrackingContext, TrackingProvider } from "./types";

const PURCHASED_KEY = "bq_meta_purchased"; // order ids already counted as Purchase
const PURCHASED_MAX = 50; // keep the dedup list bounded

let providers: TrackingProvider[] = [];
let context: TrackingContext = { currency: "MAD" };
let debug = false;

// --- configuration ------------------------------------------------------------

/** Merge runtime context (currency, …). Called once config resolves. */
export function configureTracking(patch: Partial<TrackingContext>): void {
  context = { ...context, ...patch };
}

/** Toggle service-level `[tracking]` diagnostics (no PII). */
export function setTrackingDebug(on: boolean): void {
  debug = on;
}

/** Register a destination (idempotent by provider name). */
export function registerProvider(provider: TrackingProvider): void {
  if (!providers.some((p) => p.name === provider.name)) {
    providers = [...providers, provider];
    log("provider registered:", provider.name);
  }
}

/** Remove a destination by name (used on unmount / when tracking is disabled). */
export function unregisterProvider(name: string): void {
  providers = providers.filter((p) => p.name !== name);
}

function log(...args: unknown[]): void {
  if (debug && typeof console !== "undefined") {
    console.info("[tracking]", ...args);
  }
}

// --- helpers ------------------------------------------------------------------

function newEventId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `evt-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function round(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

/** Dispatch to every provider, isolating failures so one can't affect another. */
function emit(event: CommerceEvent): void {
  if (providers.length === 0) return;
  for (const provider of providers) {
    try {
      provider.handle(event, context);
    } catch (err) {
      // Swallow — tracking must never break the store. Surface only in debug.
      log("provider error", provider.name, err);
    }
  }
}

// --- purchase idempotency -----------------------------------------------------

function alreadyPurchased(orderId: string): boolean {
  try {
    const raw = window.localStorage.getItem(PURCHASED_KEY);
    const ids: string[] = raw ? JSON.parse(raw) : [];
    return ids.includes(orderId);
  } catch {
    return false; // storage unavailable → best-effort, allow the send
  }
}

function markPurchased(orderId: string): void {
  try {
    const raw = window.localStorage.getItem(PURCHASED_KEY);
    const ids: string[] = raw ? JSON.parse(raw) : [];
    if (ids.includes(orderId)) return;
    ids.push(orderId);
    // Keep only the most recent ids so the list can't grow unbounded.
    const trimmed = ids.slice(-PURCHASED_MAX);
    window.localStorage.setItem(PURCHASED_KEY, JSON.stringify(trimmed));
  } catch {
    /* ignore */
  }
}

// --- public funnel API --------------------------------------------------------

export type ProductLike = { id: number | string; price?: number };
export type CartLineLike = { id: number | string; price: number; quantity: number };

export const trackingService = {
  /** PageView. Deduping of rapid repeats is handled by the caller (route effect). */
  pageView(path?: string): void {
    emit({ type: "page_view", eventId: newEventId(), path });
  },

  /** ViewContent — a customer opened a product detail page. */
  viewContent(product: ProductLike): void {
    emit({
      type: "view_content",
      eventId: newEventId(),
      contentIds: [String(product.id)],
      value: product.price != null ? round(product.price) : undefined,
    });
  },

  /** AddToCart — fired only AFTER the cart mutation actually succeeds. */
  addToCart(line: CartLineLike): void {
    const quantity = Math.max(1, line.quantity || 1);
    emit({
      type: "add_to_cart",
      eventId: newEventId(),
      contentIds: [String(line.id)],
      contents: [{ id: String(line.id), quantity }],
      value: round(line.price * quantity),
      quantity,
    });
  },

  /** InitiateCheckout — the customer actually started checkout. */
  initiateCheckout(cart: { items: CartLineLike[]; value?: number }): void {
    const contents: CommerceContent[] = cart.items.map((i) => ({
      id: String(i.id),
      quantity: Math.max(1, i.quantity || 1),
    }));
    const numItems = contents.reduce((sum, c) => sum + c.quantity, 0);
    const value =
      cart.value != null
        ? round(cart.value)
        : round(cart.items.reduce((sum, i) => sum + i.price * Math.max(1, i.quantity || 1), 0));
    emit({
      type: "initiate_checkout",
      eventId: newEventId(),
      contentIds: contents.map((c) => c.id),
      contents,
      numItems,
      value,
    });
  },

  /**
   * Purchase — fired ONCE per confirmed order. Idempotency is enforced here:
   * the order id is recorded in localStorage the first time and any later call
   * for the same order (refresh, back/forward, re-render, duplicate callback)
   * is dropped. The Meta eventID is derived deterministically from the order id
   * (`order-<id>`) so a future Conversions API send can dedupe against it too.
   *
   * Returns true if the event was emitted, false if it was a duplicate.
   */
  purchase(order: { orderId: number | string; items: CartLineLike[]; value: number }): boolean {
    const orderId = String(order.orderId);
    if (!orderId || alreadyPurchased(orderId)) {
      log("purchase deduped for order", orderId);
      return false;
    }
    const contents: CommerceContent[] = order.items.map((i) => ({
      id: String(i.id),
      quantity: Math.max(1, i.quantity || 1),
    }));
    markPurchased(orderId);
    emit({
      type: "purchase",
      eventId: `order-${orderId}`,
      orderId,
      contentIds: contents.map((c) => c.id),
      contents,
      numItems: contents.reduce((sum, c) => sum + c.quantity, 0),
      value: round(order.value),
    });
    return true;
  },
};
