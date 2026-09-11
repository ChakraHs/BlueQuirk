"use client";

import { t } from "@/lib/i18n";
import type { ReviewCard } from "@/services/review.service";

/**
 * Instagram-like strip of approved customer photos. Thumbnails are lazy-loaded and
 * small (R2 thumbnail variant); tapping one asks the parent to open the lightbox.
 * Renders nothing when there are no photos — no empty frame.
 */
export default function CustomerPhotos({
  photos,
  lang,
  onOpen,
}: {
  photos: ReviewCard[];
  lang: string;
  onOpen: (photo: ReviewCard) => void;
}) {
  const withPhotos = photos.filter((p) => p.photoThumbnailUrl);
  if (!withPhotos.length) return null;

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
        {t(lang, "reviews.customerPhotos")}
      </h3>
      <div className="-mx-1 flex snap-x gap-2 overflow-x-auto px-1 pb-1">
        {withPhotos.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => onOpen(p)}
            className="group relative size-20 shrink-0 snap-start overflow-hidden rounded-xl border border-gray-200 sm:size-24"
            aria-label={t(lang, "reviews.viewPhoto")}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={p.photoThumbnailUrl as string}
              alt=""
              loading="lazy"
              decoding="async"
              className="size-full object-cover transition duration-300 group-hover:scale-105"
            />
          </button>
        ))}
      </div>
    </div>
  );
}
