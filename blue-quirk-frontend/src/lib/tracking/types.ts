// Provider-neutral marketing/ads tracking vocabulary.
//
// The storefront's business logic (product page, cart, checkout) speaks ONLY in
// these vendor-agnostic `CommerceEvent`s via the TrackingService. Each concrete
// provider (Meta Pixel today; GA4 / TikTok / Meta CAPI later) translates them
// into its own SDK calls — so adding or removing a destination never touches the
// commerce code. This is deliberately separate from the native analytics tracker
// (`src/lib/analytics/*`), which owns internal business metrics.

/** Runtime context shared with every provider (filled once config resolves). */
export type TrackingContext = {
  /** ISO-4217 currency code (e.g. "MAD"). Store "DH" is mapped to "MAD". */
  currency: string;
};

/** One line item, in the shape Meta's `contents` array expects. */
export type CommerceContent = {
  /** The product id, as a string (Meta content ids are strings). */
  id: string;
  quantity: number;
};

/**
 * The normalized events the funnel emits. Each carries a stable-ish `eventId`
 * so a future server-side provider (Meta Conversions API) can DEDUPLICATE the
 * same logical event across browser + server. Purchase uses a deterministic id
 * derived from the order id; the rest use a random id per fire.
 */
export type CommerceEvent =
  | { type: "page_view"; eventId: string; path?: string }
  | {
      type: "view_content";
      eventId: string;
      contentIds: string[];
      value?: number;
    }
  | {
      type: "add_to_cart";
      eventId: string;
      contentIds: string[];
      contents: CommerceContent[];
      value: number;
      quantity: number;
    }
  | {
      type: "initiate_checkout";
      eventId: string;
      contentIds: string[];
      contents: CommerceContent[];
      numItems: number;
      value: number;
    }
  | {
      type: "purchase";
      eventId: string;
      orderId: string;
      contentIds: string[];
      contents: CommerceContent[];
      numItems: number;
      value: number;
    };

export type CommerceEventType = CommerceEvent["type"];

/**
 * A tracking destination. Providers must be self-contained and NON-THROWING:
 * `handle` runs inside a try/catch in the service, but a provider should still
 * fail soft so one broken vendor never affects another (or the store).
 */
export interface TrackingProvider {
  /** Stable, unique key (e.g. "meta-pixel"). Used to de-dupe registration. */
  readonly name: string;
  /** Translate a normalized event into vendor calls. Must not throw. */
  handle(event: CommerceEvent, ctx: TrackingContext): void;
}
