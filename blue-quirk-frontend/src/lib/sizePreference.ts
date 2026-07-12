"use client";

// Lightweight, modular size-preference layer. Today it remembers the customer's
// last-selected size (from a prior product interaction) so we can preselect it.
// It is intentionally structured so a richer recommender (height/weight, or the
// customer's purchase history) can be slotted into `recommendSize` later without
// touching the product UI — the page only calls `recommendSize(...)`.

import { sizeScore } from "@/lib/sizeGuide";

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
  reason: "previous-selection" | "body-measurements";
};

/**
 * Returns a recommended size for this product, or null if we have nothing to go
 * on. Current strategy: the customer's previously-selected size, when it is one
 * of the available options. Extend here (history) — callers and UI need no changes.
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

// Canonical garment size ladder used to position a recommendation and snap it to
// the nearest size a product actually offers.
const SIZE_SCALE = ["XXS", "XS", "S", "M", "L", "XL", "XXL", "XXXL", "4XL"];

function scaleIndex(label: string): number {
  const u = label.trim().toUpperCase();
  const i = SIZE_SCALE.indexOf(u);
  if (i !== -1) return i;
  // Numeric forms like "2XL", "3XL" → XL + (n-1).
  const m = u.match(/^(\d)XL$/);
  if (m) return SIZE_SCALE.indexOf("XL") + (Number(m[1]) - 1);
  return -1;
}

export type BodyMeasurements = { heightCm: number; weightKg: number };

// Where size "S" sits on the canonical ladder — the SIZE_GUIDE (S…XXL) is
// positioned onto SIZE_SCALE so we can snap to sizes outside the guide (XS, 3XL)
// when a product happens to offer them.
const GUIDE_BASE_INDEX = scaleIndex("S");

/**
 * Recommends a t-shirt size from height + weight, snapped to the closest size a
 * product actually offers. Uses the continuous scoring model in lib/sizeGuide
 * (built from the real garment measurements): height sets the length-driven base
 * and weight fine-tunes for build, so every centimeter/kilogram shifts the
 * result gradually instead of falling into a bucket. The call site/UI are
 * unchanged.
 */
export function recommendSizeFromBody(
  body: BodyMeasurements,
  available: string[]
): SizeRecommendation | null {
  const { heightCm, weightKg } = body;
  if (!(heightCm > 0) || !(weightKg > 0)) return null;

  const avail = available.map((s) => s.trim()).filter(Boolean);
  if (avail.length === 0) return null;

  // Continuous position on the canonical ladder (fractional, e.g. 3.4 ≈ between
  // L and XL). Kept unrounded so we snap to the *nearest offered* size rather
  // than pre-rounding and losing the fine distinction near a boundary.
  const target = GUIDE_BASE_INDEX + sizeScore(heightCm, weightKg);

  // Snap to the nearest size the product carries. We scan from smallest to
  // largest and only switch on a strictly-closer size, so a customer sitting
  // exactly between two offered sizes keeps the smaller one — we never suggest
  // an oversized shirt unless the measurements land closer to the larger size.
  const ordered = [...avail].sort((a, b) => scaleIndex(a) - scaleIndex(b));
  let best = ordered[0];
  let bestDist = Infinity;
  for (const s of ordered) {
    const si = scaleIndex(s);
    if (si < 0) continue;
    const d = Math.abs(si - target);
    if (d < bestDist - 1e-9) {
      bestDist = d;
      best = s;
    }
  }
  return { size: best, reason: "body-measurements" };
}
