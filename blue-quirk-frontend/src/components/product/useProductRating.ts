"use client";

// Compact per-product ratings for the card badge in listings. All cards rendered
// in the same tick have their ids collected and fetched in ONE request
// (GET /shop/reviews/summaries?ids=...) — so a whole grid costs a single round-trip,
// not one per card. Results are cached module-wide; products with no approved
// reviews resolve to null and the card shows nothing (never a fake "0"). Gated by
// `enabled` (reviewsEnabled) so nothing is even requested while reviews are off.
import { useEffect, useState } from "react";
import { API_BASE_URL } from "@/lib/config";

export type CardRating = { average: number; total: number };

const cache = new Map<number, CardRating | null>();
let pending = new Set<number>();
let timer: ReturnType<typeof setTimeout> | null = null;
const listeners = new Set<() => void>();

function scheduleFlush() {
  if (timer) return;
  timer = setTimeout(flush, 60);
}

async function flush() {
  timer = null;
  const ids = [...pending];
  pending = new Set();
  if (!ids.length) return;
  try {
    const res = await fetch(`${API_BASE_URL}/shop/reviews/summaries?ids=${ids.join(",")}`, {
      cache: "no-store",
    });
    const data = res.ok
      ? ((await res.json()) as { ratings?: Record<string, CardRating> })
      : { ratings: {} };
    for (const id of ids) {
      const r = data.ratings?.[id];
      cache.set(id, r && r.total > 0 ? { average: r.average, total: r.total } : null);
    }
  } catch {
    for (const id of ids) if (!cache.has(id)) cache.set(id, null);
  } finally {
    listeners.forEach((fn) => fn());
  }
}

export function useProductRating(productId: number, enabled: boolean): CardRating | null {
  const [rating, setRating] = useState<CardRating | null>(() => cache.get(productId) ?? null);

  useEffect(() => {
    if (!enabled) return;
    if (cache.has(productId)) {
      setRating(cache.get(productId) ?? null);
      return;
    }
    const notify = () => setRating(cache.get(productId) ?? null);
    listeners.add(notify);
    pending.add(productId);
    scheduleFlush();
    return () => {
      listeners.delete(notify);
    };
  }, [productId, enabled]);

  return rating;
}
