"use client";

// Client helpers for the announcement bar: per-announcement dismissal + dynamic
// placeholder resolution. The eligible announcements themselves are fetched once,
// server-side, and hydrated into the bar (see lib/announcementBar.ts) so there is no
// extra client request and no layout shift (spec §18/§22). Dismissal is tracked
// per-announcement-id so dismissing one campaign never hides a future one (spec §9).
import type { CartQuote } from "@/services/bundle.service";

// --- Per-announcement dismissal (localStorage) ---

const DISMISS_KEY = "darnabox_announcements_dismissed";

export function readDismissed(): Set<number> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = JSON.parse(localStorage.getItem(DISMISS_KEY) ?? "[]");
    return new Set(Array.isArray(raw) ? (raw as number[]) : []);
  } catch {
    return new Set();
  }
}

export function addDismissed(id: number) {
  if (typeof window === "undefined") return;
  const set = readDismissed();
  set.add(id);
  localStorage.setItem(DISMISS_KEY, JSON.stringify([...set]));
}

// --- Dynamic placeholders (§13/§14) -----------------------------------------
// Resolved against live cart/discount state that already comes from the centralized
// quote — the bar never computes a discount itself.

const PLACEHOLDER_RE = /\{[a-z_]+\}/gi;

/** Whether a message contains any {placeholder} token. */
export function hasPlaceholders(message: string): boolean {
  return /\{[a-z_]+\}/i.test(message);
}

/**
 * Whether a message needs live cart/discount context to resolve (so the bar only
 * pays for a cart quote when a visible announcement actually uses it, spec §18).
 */
export function needsCartContext(message: string): boolean {
  return /\{(next_discount|discount|items_remaining|cart_total)\}/i.test(message);
}

type PlaceholderContext = {
  quote: CartQuote | null;
  cartItems: number;
};

/**
 * Substitutes known placeholders. Returns the resolved string, or {@code null} when
 * a present placeholder cannot be resolved yet (e.g. the discount campaign is off or
 * the cart is empty) — callers then simply skip that announcement so a raw
 * "{next_discount}" is NEVER shown to a customer (spec §14).
 */
export function resolvePlaceholders(message: string, ctx: PlaceholderContext): string | null {
  if (!hasPlaceholders(message)) return message;

  const q = ctx.quote;
  const progressiveReady = !!q && q.progressiveEnabled;

  const values: Record<string, string | null> = {
    discount: progressiveReady ? num(q!.progressiveDiscount) : null,
    next_discount: progressiveReady ? num(q!.progressiveNextDiscount) : null,
    items_remaining: progressiveReady ? String(q!.progressiveItemsUntilNext) : null,
    cart_items: String(ctx.cartItems),
    cart_total: q ? num(q.total) : null,
  };

  let unresolved = false;
  const out = message.replace(PLACEHOLDER_RE, (token) => {
    const key = token.slice(1, -1).toLowerCase();
    const val = values[key];
    if (val === undefined) return token; // unknown token: leave as-is (not our vocab)
    if (val === null) {
      unresolved = true;
      return token;
    }
    return val;
  });

  // A KNOWN placeholder we couldn't fill → hide this announcement for now.
  if (unresolved) return null;
  return out;
}

/** Formats a money-ish number without a currency suffix (admin writes the label). */
function num(v: number): string {
  return Number.isInteger(v) ? String(v) : v.toFixed(2);
}
