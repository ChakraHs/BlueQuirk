"use client";

import { t } from "@/lib/i18n";
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
}: {
  summary: ReviewSummary;
  lang: string;
}) {
  if (!summary.enabled || summary.total <= 0) return null;

  return (
    <a
      href="#reviews"
      className="inline-flex items-center gap-2 text-sm text-gray-700 transition hover:text-gray-900"
      aria-label={t(lang, "reviews.summaryAria", {
        rating: summary.average.toFixed(1),
        count: summary.total,
      })}
    >
      <Stars value={summary.average} size={16} />
      <span className="font-semibold text-gray-900">{summary.average.toFixed(1)}</span>
      <span className="text-gray-400">·</span>
      <span className="underline decoration-gray-300 underline-offset-2">
        {t(lang, "reviews.count", { count: summary.total })}
      </span>
    </a>
  );
}
