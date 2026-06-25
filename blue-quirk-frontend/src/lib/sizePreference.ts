"use client";

// Lightweight, modular size-preference layer. Today it remembers the customer's
// last-selected size (from a prior product interaction) so we can preselect it.
// It is intentionally structured so a richer recommender (height/weight, or the
// customer's purchase history) can be slotted into `recommendSize` later without
// touching the product UI — the page only calls `recommendSize(...)`.

const KEY = "bluequirk_size_pref";

/** The persisted last-selected size label (e.g. "M"), or null if none yet. */
export function getPreferredSize(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(KEY);
    return raw && raw.trim() ? raw.trim() : null;
  } catch {
    return null;
  }
}

/** Remember the size the customer just chose, for next time. */
export function setPreferredSize(size: string): void {
  if (typeof window === "undefined" || !size?.trim()) return;
  try {
    localStorage.setItem(KEY, size.trim());
  } catch {
    /* ignore quota/private-mode errors */
  }
}

export type SizeRecommendationContext = {
  /** Size labels actually offered for this product (e.g. ["S","M","L"]). */
  available: string[];
  // Future signals — wire these up when the inputs exist; the call site is ready.
  // height?: number;
  // weight?: number;
  // purchasedSizes?: string[];
};

export type SizeRecommendation = {
  size: string;
  /** Why we suggested it — drives the hint copy and lets us tune later. */
  reason: "previous-selection";
};

/**
 * Returns a recommended size for this product, or null if we have nothing to go
 * on. Current strategy: the customer's previously-selected size, when it is one
 * of the available options. Extend here (height/weight, history) — callers and
 * UI need no changes.
 */
export function recommendSize(ctx: SizeRecommendationContext): SizeRecommendation | null {
  const available = ctx.available.map((s) => s.trim()).filter(Boolean);
  if (available.length === 0) return null;

  const previous = getPreferredSize();
  if (previous && available.some((s) => s.toLowerCase() === previous.toLowerCase())) {
    const match = available.find((s) => s.toLowerCase() === previous.toLowerCase())!;
    return { size: match, reason: "previous-selection" };
  }

  return null;
}
