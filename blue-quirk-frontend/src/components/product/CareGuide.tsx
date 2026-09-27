// "Care & Wear" guide shown on the product detail page (after the reviews,
// before the related products). Server component — the content is static, admin-
// authored plain text, so it renders straight into the SSR HTML (good for SEO,
// no client JS). The section title and each subsection label are fixed localized
// strings; the bodies come from the product's attached care guide, already
// resolved to the page language by the backend. Rendered only when a guide
// exists (the page hides it otherwise), so there is no empty state here.
import { Droplets, Lightbulb, Shirt, Sparkles, Wind } from "lucide-react";
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

export default function CareGuide({
  guide,
  lang,
}: {
  guide: CareGuideData;
  lang: string;
}) {
  const isRtl = lang === "ar";

  return (
    <section
      aria-label={t(lang, "care.title")}
      dir={isRtl ? "rtl" : "ltr"}
      className="mx-auto max-w-7xl px-6 py-12 md:px-12"
    >
      <div className="mb-8">
        <h2 className="text-2xl font-semibold text-gray-900">{t(lang, "care.title")}</h2>
      </div>

      {/* One readable column on mobile, two on larger screens. */}
      <dl className="grid gap-x-12 gap-y-8 sm:grid-cols-2">
        {guide.sections.map(({ key, body }) => {
          const meta = SECTION_META[key];
          const Icon = meta?.icon ?? Shirt;
          return (
            <div key={key} className="flex gap-3.5">
              <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                <Icon className="size-5" strokeWidth={1.8} />
              </span>
              <div className="min-w-0">
                <dt className="text-sm font-semibold text-gray-900">
                  {meta ? t(lang, meta.labelKey) : key}
                </dt>
                <dd className="mt-1 whitespace-pre-line text-sm leading-relaxed text-gray-600">
                  {body}
                </dd>
              </div>
            </div>
          );
        })}
      </dl>
    </section>
  );
}
