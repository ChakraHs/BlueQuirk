"use client";

// "Care & Wear" guide shown on the product detail page (after the reviews,
// before the related products). By default it stays compact — only the first
// section shows, its body clamped to ~4 lines (trailing "…"), with everything
// else folded behind a "See more" toggle so the page reads clean and pro. Every
// section is still rendered into the SSR HTML (the extra ones are just visually
// hidden, the first one just clamped, until expanded), so the content stays
// crawlable for SEO. The section title and each subsection label are fixed
// localized strings; the bodies come from the product's attached care guide,
// already resolved to the page language by the backend. Rendered only when a
// guide exists (the page hides it otherwise), so there is no empty state here.
import { useState } from "react";
import { ChevronDown, Droplets, Lightbulb, Shirt, Sparkles, Wind } from "lucide-react";
import type { CareGuide as CareGuideData, CareGuideSectionKey } from "@/types/product";
import { t } from "@/lib/i18n";

// Fixed subsection label key + a decorative icon per section key.
const SECTION_META: Record<CareGuideSectionKey, { labelKey: string; icon: typeof Shirt }> = {
  fabric: { labelKey: "care.fabric", icon: Shirt },
  washDry: { labelKey: "care.washDry", icon: Droplets },
  ironing: { labelKey: "care.ironing", icon: Wind },
  print: { labelKey: "care.print", icon: Sparkles },
  tips: { labelKey: "care.tips", icon: Lightbulb },
};

// How many sections to show before collapsing the rest behind "See more". The
// single visible section is additionally line-clamped to keep the teaser to ~4
// lines.
const COLLAPSED_COUNT = 1;

export default function CareGuide({
  guide,
  lang,
}: {
  guide: CareGuideData;
  lang: string;
}) {
  const isRtl = lang === "ar";
  const [expanded, setExpanded] = useState(false);
  // Show the toggle whenever the collapsed teaser hides something — either extra
  // sections, or a first section long enough that the 4-line clamp trims it.
  const hasMore =
    guide.sections.length > COLLAPSED_COUNT ||
    (guide.sections[0]?.body.length ?? 0) > 160;

  return (
    <section
      aria-label={t(lang, "care.title")}
      dir={isRtl ? "rtl" : "ltr"}
      className="mx-auto max-w-7xl px-6 pb-8 pt-4 md:px-12 md:py-12"
    >
      <div className="mb-6 md:mb-8">
        <h2 className="text-2xl font-semibold text-gray-900">{t(lang, "care.title")}</h2>
      </div>

      {/* One readable column on mobile, two on larger screens. When collapsed only
          the first section shows (its body clamped to ~4 lines); the rest stay in
          the DOM (SEO) but hidden until expanded. */}
      <dl className="grid gap-x-12 gap-y-8 sm:grid-cols-2">
        {guide.sections.map(({ key, body }, index) => {
          const meta = SECTION_META[key];
          const Icon = meta?.icon ?? Shirt;
          const hidden = !expanded && index >= COLLAPSED_COUNT;
          const clamp = !expanded && index === 0;
          return (
            <div key={key} className={`flex gap-3.5${hidden ? " hidden" : ""}`}>
              <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                <Icon className="size-5" strokeWidth={1.8} />
              </span>
              <div className="min-w-0">
                <dt className="text-sm font-semibold text-gray-900">
                  {meta ? t(lang, meta.labelKey) : key}
                </dt>
                <dd
                  className={`mt-1 whitespace-pre-line text-sm leading-relaxed text-gray-600${
                    clamp ? " line-clamp-4" : ""
                  }`}
                >
                  {body}
                </dd>
              </div>
            </div>
          );
        })}
      </dl>

      {hasMore && (
        <div className="mt-6 md:mt-8">
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-gray-300 px-6 text-sm font-semibold text-gray-800 transition hover:border-gray-900"
          >
            {t(lang, expanded ? "care.seeLess" : "care.seeMore")}
            <ChevronDown className={`size-4 transition-transform${expanded ? " rotate-180" : ""}`} />
          </button>
        </div>
      )}
    </section>
  );
}
