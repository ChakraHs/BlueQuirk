// Meta Pixel (Facebook Pixel) provider — the ONLY module in the app permitted to
// reference `window.fbq`. Everything else talks to Meta through the
// TrackingService, so the global stays encapsulated and swappable.
//
// It maps our vendor-neutral CommerceEvents onto Meta's current STANDARD events
// (PageView, ViewContent, AddToCart, InitiateCheckout, Purchase) with the
// official parameter names (content_ids, content_type, contents, value,
// currency, num_items). We never invent custom per-product event names — product
// identity travels in `content_ids`, exactly as Meta expects, which is what makes
// the events usable for Ads optimization and product-level reporting.
//
// The Pixel base snippet (injected by TrackingProvider via next/script) defines
// `window.fbq` as a queue shim immediately, so calls made here before the
// external library finishes downloading are buffered and replayed — we never poll
// for readiness. The 4th `eventID` argument is set on every event so a future
// Conversions API can deduplicate browser vs server hits.
import type { CommerceEvent, TrackingContext, TrackingProvider } from "../types";

type Fbq = ((...args: unknown[]) => void) & { loaded?: boolean };

const PROVIDER_NAME = "meta-pixel";

let debug = false;

/** Enable/disable low-level `[meta-pixel]` console diagnostics (no PII). */
export function setMetaPixelDebug(on: boolean): void {
  debug = on;
}

function log(...args: unknown[]): void {
  if (debug && typeof console !== "undefined") {
    console.info("[meta-pixel]", ...args);
  }
}

function getFbq(): Fbq | null {
  if (typeof window === "undefined") return null;
  const f = (window as unknown as { fbq?: Fbq }).fbq;
  return typeof f === "function" ? f : null;
}

/** Meta standard event name for each normalized commerce event. */
const EVENT_NAME: Record<CommerceEvent["type"], string> = {
  page_view: "PageView",
  view_content: "ViewContent",
  add_to_cart: "AddToCart",
  initiate_checkout: "InitiateCheckout",
  purchase: "Purchase",
};

/** Build the Meta parameter object for an event (official parameter names). */
function toParams(event: CommerceEvent, ctx: TrackingContext): Record<string, unknown> | undefined {
  switch (event.type) {
    case "page_view":
      return undefined;
    case "view_content":
      return {
        content_ids: event.contentIds,
        content_type: "product",
        ...(event.value != null ? { value: event.value } : {}),
        currency: ctx.currency,
      };
    case "add_to_cart":
      return {
        content_ids: event.contentIds,
        content_type: "product",
        contents: event.contents,
        value: event.value,
        currency: ctx.currency,
      };
    case "initiate_checkout":
      return {
        content_ids: event.contentIds,
        content_type: "product",
        contents: event.contents,
        num_items: event.numItems,
        value: event.value,
        currency: ctx.currency,
      };
    case "purchase":
      return {
        content_ids: event.contentIds,
        content_type: "product",
        contents: event.contents,
        num_items: event.numItems,
        value: event.value,
        currency: ctx.currency,
      };
  }
}

/**
 * Create the Meta Pixel provider. Registered with the TrackingService only when
 * Meta tracking is active (see TrackingProvider), so `handle` runs solely for
 * enabled, configured stores. It fails soft — a missing/broken `fbq` is a no-op,
 * never an exception that could bubble into the store.
 */
export function createMetaPixelProvider(): TrackingProvider {
  return {
    name: PROVIDER_NAME,
    handle(event: CommerceEvent, ctx: TrackingContext) {
      const fbq = getFbq();
      if (!fbq) {
        log("skip (fbq not ready)", event.type);
        return;
      }
      const name = EVENT_NAME[event.type];
      const params = toParams(event, ctx);
      // fbq('track', <StandardEvent>, <params?>, { eventID })
      if (params) {
        fbq("track", name, params, { eventID: event.eventId });
      } else {
        fbq("track", name, {}, { eventID: event.eventId });
      }
      log("sent", name, { eventID: event.eventId, ...(params ?? {}) });
    },
  };
}

export const META_PIXEL_PROVIDER_NAME = PROVIDER_NAME;
