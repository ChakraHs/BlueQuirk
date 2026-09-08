"use client";

import { useMemo } from "react";
import { Gift } from "lucide-react";
import { useCart } from "@/lib/cart";
import { useCartQuote } from "@/lib/bundle";
import {
  useProgressiveConfig,
  isProgressiveEligible,
  progressiveProductMessage,
} from "@/lib/progressive";
import type { Product } from "@/types/product";

/**
 * Subtle, premium progressive-discount incentive for the product page (spec §5, §8).
 * It reflects the customer's real cart progress: "add another and save X" when they
 * have none yet, or "add this → increase your savings to Y" once a discount is live.
 * Consumes the centralized helpers — no formula lives here. Renders nothing when the
 * campaign is off or the product is not eligible, so it never clutters the page.
 *
 * Performance: when the cart is empty (the common product-page case) useCartQuote
 * makes no request; a quote is only fetched once the cart has items.
 */
export default function ProgressiveProductHint({
  product,
  lang,
}: {
  product: Product;
  lang: string;
}) {
  const config = useProgressiveConfig();
  const items = useCart();
  const quoteItems = useMemo(
    () => items.map((i) => ({ id: i.id, quantity: i.quantity })),
    [items]
  );
  const { quote } = useCartQuote(quoteItems);

  const eligible = config ? isProgressiveEligible(config, product) : false;
  const message = progressiveProductMessage({ config, quote, eligible, lang });
  if (!message) return null;

  return (
    <div className="flex items-center gap-2 rounded-full border border-primary/25 bg-primary/[0.05] px-3.5 py-2 text-xs font-semibold text-gray-800">
      <Gift className="size-3.5 shrink-0 text-primary" />
      <span>{message}</span>
    </div>
  );
}
