"use client";

import { t, reviewCount } from "@/lib/i18n";
import type { ReviewSummary } from "@/services/review.service";
import Stars from "./Stars";

/**
 * Compact rating line shown near the product title:
 *   ★★★★★  4.8 · 27 reviews
 * Renders NOTHING when reviews are disabled or a product has zero approved reviews
 * (empty-state contract — never a lonely "0 reviews" or fake stars). Clicking it
 * smooth-scrolls to the full reviews section.
 */
export default function RatingSummary({
  summary,
  lang,
  compact = false,
}: {
  summary: ReviewSummary;
  lang: string;
  // Smaller stars + text, so the line sits comfortably under a narrow price.
  compact?: boolean;
}) {
  if (!summary.enabled || summary.total <= 0) return null;

  return (
    <a
      href="#reviews"
      className={`inline-flex items-center text-gray-700 transition hover:text-gray-900 ${
        compact ? "gap-1 text-xs" : "gap-2 text-sm"
      }`}
      aria-label={t(lang, "reviews.summaryAria", {
        rating: summary.average.toFixed(1),
        countLabel: reviewCount(lang, summary.total),
      })}
    >
      <Stars value={summary.average} size={compact ? 13 : 16} />
      <span className="font-semibold text-gray-900">{summary.average.toFixed(1)}</span>
      <span className="text-gray-500">({summary.total})</span>
    </a>
  );
}
