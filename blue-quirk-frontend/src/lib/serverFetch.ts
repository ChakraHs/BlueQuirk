// Cache policy for server-side storefront reads.
//
// The storefront's global + catalog data (shop config, categories, announcement
// bar, product detail, trending, review summary/first page) is PUBLIC and
// non-personalized, so it can be served from Next's Data Cache and refreshed on
// a fixed interval (ISR) instead of hitting the backend on every request.
// Passing a `revalidate` window opts a read into that cache; omitting it keeps
// the read fully dynamic (`cache: "no-store"`) — the correct default for
// admin/live callers and any per-request data.
//
// Why this is safe for the storefront:
//   • User-specific state (cart, wishlist, auth, live shipping sync) is already
//     resolved CLIENT-side, so a cached server render carries nothing personal.
//   • Order pricing is ALWAYS recomputed server-side from the catalog at
//     checkout (OrderService.createOrder / CreateOrderRequest carry no price),
//     so a stale product page can never corrupt an order total.
//   • A `revalidate` window bounds how long an admin edit can look stale.
export const STOREFRONT_REVALIDATE = 300; // 5 minutes

/**
 * Build the fetch init for a server-side storefront read. With a `revalidate`
 * window the response is cached by Next's Data Cache (ISR); without one the read
 * stays fully dynamic. Returned object is a plain `RequestInit` (Next augments it
 * with the `next` field in the app).
 */
export function serverReadInit(revalidate?: number): RequestInit {
  return typeof revalidate === "number"
    ? { next: { revalidate } }
    : { cache: "no-store" };
}
