"use client";

import { useEffect, useRef, useState } from "react";
import { BadgeCheck, X } from "lucide-react";
import { t } from "@/lib/i18n";
import { track } from "@/lib/analytics/tracker";
import {
  loadReviewPage,
  type ReviewCard,
  type ReviewPage,
  type ReviewSummary,
} from "@/services/review.service";
import Stars from "./Stars";
import CustomerPhotos from "./CustomerPhotos";

/**
 * The "What our customers say" section shown below the product info — only when
 * reviews are enabled. Renders the distribution bars, an optional customer-photos
 * strip, and the review cards with "load more" pagination. First page is provided by
 * the server (SSR, good for SEO); subsequent pages load client-side. Fires the review
 * funnel analytics events (native tracker only — the Meta Pixel is never touched).
 *
 * Empty state: when enabled but zero approved reviews, shows a quiet, non-negative
 * "be the first" prompt — never a lonely "0 reviews" or fake stars.
 */
export default function ProductReviews({
  productId,
  lang,
  summary,
  initial,
  photos,
}: {
  productId: number;
  lang: string;
  summary: ReviewSummary;
  initial: ReviewPage;
  photos: ReviewCard[];
}) {
  const [reviews, setReviews] = useState<ReviewCard[]>(initial.reviews);
  const [page, setPage] = useState(initial.page);
  const [hasMore, setHasMore] = useState(initial.hasMore);
  const [loading, setLoading] = useState(false);
  const [lightbox, setLightbox] = useState<ReviewCard | null>(null);
  const sectionRef = useRef<HTMLElement>(null);

  // Fire review_section_view once, when the section actually scrolls into view.
  const viewed = useRef(false);
  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !viewed.current) {
          viewed.current = true;
          track("review_section_view", { productId, meta: { total: summary.total } });
          io.disconnect();
        }
      },
      { threshold: 0.2 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [productId, summary.total]);

  const loadMore = async () => {
    if (loading || !hasMore) return;
    setLoading(true);
    try {
      const next = await loadReviewPage(productId, page + 1);
      setReviews((cur) => [...cur, ...next.reviews]);
      setPage(next.page);
      setHasMore(next.hasMore);
    } catch {
      /* best-effort — leave the current list intact */
    } finally {
      setLoading(false);
    }
  };

  const openPhoto = (photo: ReviewCard) => {
    setLightbox(photo);
    track("review_photo_view", { productId, meta: { reviewId: photo.id } });
  };

  const hasReviews = reviews.length > 0;

  return (
    <section
      id="reviews"
      ref={sectionRef}
      aria-label={t(lang, "reviews.sectionTitle")}
      className="mx-auto max-w-7xl px-6 py-12 md:px-12"
    >
      <div className="mb-8 flex flex-col gap-1">
        <h2 className="text-2xl font-semibold text-gray-900">
          {t(lang, "reviews.sectionTitle")}
        </h2>
        {hasReviews && (
          <p className="text-sm text-gray-500">{t(lang, "reviews.sectionSubtitle")}</p>
        )}
      </div>

      {hasReviews ? (
        <div className="grid gap-10 md:grid-cols-[minmax(0,300px)_minmax(0,1fr)] md:gap-14">
          {/* Left rail: average + distribution */}
          <div className="space-y-5">
            <div className="flex items-end gap-3">
              <span className="text-5xl font-semibold leading-none text-gray-900">
                {summary.average.toFixed(1)}
              </span>
              <div className="mb-1 space-y-1">
                <Stars value={summary.average} size={18} />
                <p className="text-xs text-gray-500">
                  {t(lang, "reviews.count", { count: summary.total })}
                </p>
              </div>
            </div>
            <Distribution summary={summary} lang={lang} />
            <CustomerPhotos photos={photos} lang={lang} onOpen={openPhoto} />
          </div>

          {/* Right: review cards */}
          <div className="space-y-5">
            {reviews.map((r) => (
              <ReviewItem key={r.id} review={r} lang={lang} productId={productId} onOpenPhoto={openPhoto} />
            ))}

            {hasMore && (
              <div className="pt-2">
                <button
                  type="button"
                  onClick={loadMore}
                  disabled={loading}
                  className="inline-flex h-11 items-center justify-center rounded-full border border-gray-300 px-6 text-sm font-semibold text-gray-800 transition hover:border-gray-900 disabled:opacity-60"
                >
                  {loading ? t(lang, "reviews.loading") : t(lang, "reviews.loadMore")}
                </button>
              </div>
            )}
          </div>
        </div>
      ) : (
        // Enabled but no approved reviews yet — quiet, never makes the product look unpopular.
        <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50/60 px-6 py-10 text-center">
          <p className="text-base font-medium text-gray-800">{t(lang, "reviews.emptyTitle")}</p>
          <p className="mt-1 text-sm text-gray-500">{t(lang, "reviews.emptyBody")}</p>
        </div>
      )}

      {lightbox?.photoUrl && (
        <PhotoLightbox review={lightbox} lang={lang} onClose={() => setLightbox(null)} />
      )}
    </section>
  );
}

/** The 5→1 distribution bars. Compact and elegant. */
function Distribution({ summary, lang }: { summary: ReviewSummary; lang: string }) {
  const rows: { star: number; count: number }[] = [
    { star: 5, count: summary.five },
    { star: 4, count: summary.four },
    { star: 3, count: summary.three },
    { star: 2, count: summary.two },
    { star: 1, count: summary.one },
  ];
  const max = Math.max(1, summary.total);
  return (
    <div className="space-y-1.5" aria-label={t(lang, "reviews.distribution")}>
      {rows.map((row) => (
        <div key={row.star} className="flex items-center gap-2 text-xs text-gray-500">
          <span className="w-3 tabular-nums text-gray-700">{row.star}</span>
          <span className="text-amber-400">★</span>
          <span className="h-2 flex-1 overflow-hidden rounded-full bg-gray-100">
            <span
              className="block h-full rounded-full bg-amber-400"
              style={{ width: `${(row.count / max) * 100}%` }}
            />
          </span>
          <span className="w-6 text-right tabular-nums">{row.count}</span>
        </div>
      ))}
    </div>
  );
}

/** A single review card. Long bodies collapse behind a "read more" toggle. */
function ReviewItem({
  review,
  lang,
  productId,
  onOpenPhoto,
}: {
  review: ReviewCard;
  lang: string;
  productId: number;
  onOpenPhoto: (photo: ReviewCard) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const isLong = review.body.length > 260;
  const shownBody = expanded || !isLong ? review.body : review.body.slice(0, 260) + "…";

  const expand = () => {
    setExpanded(true);
    track("review_expand", { productId, meta: { reviewId: review.id } });
  };

  const dateLabel = formatDate(review.createdAt, lang);
  const meta = [review.sizePurchased, review.variantColor].filter(Boolean).join(" · ");

  return (
    <article className="rounded-2xl border border-gray-200 bg-surface p-5 transition hover:shadow-sm">
      <div className="mb-2 flex items-center justify-between gap-3">
        <Stars value={review.rating} size={15} />
        {dateLabel && <span className="text-xs text-gray-400">{dateLabel}</span>}
      </div>

      {review.title && (
        <h3 className="mb-1 text-sm font-semibold text-gray-900">{review.title}</h3>
      )}

      <p className="whitespace-pre-line text-sm leading-relaxed text-gray-700">{shownBody}</p>
      {isLong && !expanded && (
        <button
          type="button"
          onClick={expand}
          className="mt-1 text-xs font-semibold text-gray-500 underline underline-offset-2 hover:text-gray-800"
        >
          {t(lang, "reviews.readMore")}
        </button>
      )}

      {review.photoThumbnailUrl && (
        <button
          type="button"
          onClick={() => onOpenPhoto(review)}
          className="mt-3 block size-20 overflow-hidden rounded-xl border border-gray-200"
          aria-label={t(lang, "reviews.viewPhoto")}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={review.photoThumbnailUrl}
            alt=""
            loading="lazy"
            decoding="async"
            className="size-full object-cover"
          />
        </button>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-gray-500">
        <span className="font-medium text-gray-800">{review.authorName}</span>
        {review.verifiedPurchase && (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 font-medium text-emerald-700">
            <BadgeCheck className="size-3.5" />
            {t(lang, "reviews.verified")}
          </span>
        )}
        {meta && <span className="text-gray-400">· {meta}</span>}
      </div>
    </article>
  );
}

function PhotoLightbox({
  review,
  lang,
  onClose,
}: {
  review: ReviewCard;
  lang: string;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <button
        type="button"
        onClick={onClose}
        aria-label={t(lang, "reviews.close")}
        className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
      >
        <X className="size-5" />
      </button>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={review.photoUrl as string}
        alt=""
        className="max-h-[85vh] max-w-full rounded-lg object-contain"
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  );
}

function formatDate(iso: string | null, lang: string): string {
  if (!iso) return "";
  try {
    const locale = lang === "ar" ? "ar-MA" : lang === "en" ? "en-GB" : "fr-FR";
    return new Intl.DateTimeFormat(locale, { year: "numeric", month: "short", day: "numeric" }).format(
      new Date(iso)
    );
  } catch {
    return "";
  }
}
