// Public event vocabulary shared by the tracker and its callers. Kept in sync
// with the backend EventType enum; adding a value here + there is all it takes to
// support a new event (the pipeline is otherwise generic).
export type AnalyticsEventType =
  | "page_view"
  | "product_view"
  | "add_to_cart"
  | "begin_checkout"
  | "purchase"
  | "search"
  | "login"
  | "register"
  | "newsletter_signup"
  | "wishlist_add";

/** Optional per-event properties. All fields are optional and small. */
export type AnalyticsProps = {
  /** Path override; defaults to the current location when omitted. */
  path?: string;
  productId?: number | string;
  /** Numeric payload — order total for purchase, quantity for add-to-cart, etc. */
  value?: number;
  /** Arbitrary small extras (e.g. search query); serialized as JSON. */
  meta?: Record<string, unknown>;
};

/** One queued event as sent to the backend batch endpoint. */
export type QueuedEvent = {
  type: AnalyticsEventType;
  path?: string;
  productId?: number | null;
  referrer?: string;
  value?: number;
  meta?: Record<string, unknown>;
  ts: number;
};

/** The batched request body posted to POST /api/analytics/event. */
export type EventBatch = {
  visitorId: string;
  sessionId: string;
  events: QueuedEvent[];
  client: { screen?: string; lang?: string };
};
