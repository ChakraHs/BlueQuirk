// Isolated Microsoft Clarity service.
//
// This is the ONLY module in the app permitted to reference `window.clarity` —
// every other file talks to Clarity through these helpers, so the global stays
// encapsulated and swappable. Clarity is scoped to session replay, heatmaps and
// UX diagnostics ONLY; it never carries business metrics (the native analytics
// tracker in ./tracker.ts owns those) and it must never receive PII.
//
// The Clarity loader snippet (injected by ClarityProvider via next/script)
// defines `window.clarity` as a queue shim immediately, so calls made here
// before the external tag finishes downloading are buffered and replayed — we
// never need to poll for readiness.

type ClarityFn = (...args: unknown[]) => void;

function getClarity(): ClarityFn | null {
  if (typeof window === "undefined") return null;
  const c = (window as unknown as { clarity?: ClarityFn }).clarity;
  return typeof c === "function" ? c : null;
}

/**
 * Associate the current recording with an INTERNAL user id only. No-op for
 * anonymous visitors (no id → never called) and when Clarity isn't loaded.
 *
 * We deliberately pass nothing beyond the id — no email, phone, address, name,
 * payment info or password ever reaches Clarity.
 */
export function clarityIdentify(userId: string | number | null | undefined): void {
  const clarity = getClarity();
  if (!clarity || userId == null || userId === "") return;
  clarity("identify", String(userId));
}

/**
 * Attach a custom tag to the session for filtering replays/heatmaps in the
 * Clarity dashboard. Reserved for non-PII, low-cardinality UX signals (e.g.
 * "locale", "experiment"). Left available for future use.
 */
export function claritySetTag(key: string, value: string | string[]): void {
  const clarity = getClarity();
  if (!clarity) return;
  clarity("set", key, value);
}
