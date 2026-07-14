"use client";

// Accessible, mobile-friendly size-guide dialog. Opens from a "Size Guide" link
// next to the Size selector. Closes on Esc, overlay click, or the close button;
// locks body scroll and moves focus in on open, restoring it on close.
//
// The measurements come from SIZE_GUIDE (the single source of truth shared with
// the "Find My Size" recommender), and the illustration is the real garment
// guide image — measurement B (Length) runs from the highest shoulder point to
// the bottom hem.
import { useEffect, useRef } from "react";
import Image from "next/image";
import { X, Ruler, Lightbulb } from "lucide-react";
import { SIZE_GUIDE } from "@/lib/sizeGuide";

const COPY = {
  fr: {
    title: "Guide des tailles",
    subtitle: "Mesures du vêtement posé à plat, en centimètres.",
    proTip: "Astuce de pro",
    tipBody:
      "Mesurez l'un de vos t-shirts à la maison et comparez-le à ce guide pour un ajustement parfait.",
    size: "Taille",
    chest: "Poitrine (A)",
    length: "Longueur (B)",
    chestDesc: "Largeur mesurée d'une aisselle à l'autre (à plat).",
    lengthDesc: "Du point le plus haut de l'épaule jusqu'au bas du vêtement.",
    disclaimer:
      "Mesures du vêtement posé à plat. Les mesures réelles peuvent varier jusqu'à 2 cm.",
    close: "Fermer",
    diagramAlt: "T-shirt indiquant la mesure A (poitrine) et la mesure B (longueur)",
  },
  ar: {
    title: "دليل المقاسات",
    subtitle: "قياسات الملابس وهي مفرودة، بالسنتيمتر.",
    proTip: "نصيحة احترافية",
    tipBody:
      "قِس أحد قمصانك في المنزل وقارنه بهذا الدليل للحصول على أفضل مقاس.",
    size: "المقاس",
    chest: "الصدر (A)",
    length: "الطول (B)",
    chestDesc: "العرض من الإبط إلى الإبط (مفرود).",
    lengthDesc: "من أعلى نقطة في الكتف حتى أسفل القميص.",
    disclaimer:
      "قياسات الملابس وهي مفرودة. قد تختلف القياسات الفعلية حتى 2 سم.",
    close: "إغلاق",
    diagramAlt: "قميص يوضّح قياس A (الصدر) وقياس B (الطول)",
  },
  en: {
    title: "Size guide",
    subtitle: "Flat-lay garment measurements, in centimeters.",
    proTip: "Pro tip",
    tipBody:
      "Measure one of your t-shirts at home and compare it to this guide for a perfect fit.",
    size: "Size",
    chest: "Chest (A)",
    length: "Length (B)",
    chestDesc: "Width measured armpit to armpit (laid flat).",
    lengthDesc: "From the highest point of the shoulder to the bottom hem.",
    disclaimer:
      "Flat-lay garment measurements. Actual measurements may vary by up to 2 cm.",
    close: "Close",
    diagramAlt: "T-shirt showing measurement A (chest) and measurement B (length)",
  },
} as const;

export default function SizeGuideModal({
  open,
  onClose,
  lang = "fr",
}: {
  open: boolean;
  onClose: () => void;
  lang?: string;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const t = lang === "ar" ? COPY.ar : lang === "en" ? COPY.en : COPY.fr;

  useEffect(() => {
    if (!open) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
      previouslyFocused?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center"
      dir={lang === "ar" ? "rtl" : "ltr"}
    >
      {/* overlay */}
      <button
        type="button"
        aria-label={t.close}
        onClick={onClose}
        className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm"
      />

      {/* panel */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="size-guide-title"
        className="relative flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl ring-1 ring-black/5 sm:rounded-3xl animate-[fadeIn_0.2s_ease]"
      >
        {/* header */}
        <div className="flex items-start justify-between gap-4 border-b border-gray-100 bg-gradient-to-b from-gray-50 to-white px-6 py-5">
          <div className="min-w-0">
            <h2
              id="size-guide-title"
              className="flex items-center gap-2 text-xl font-bold tracking-tight text-gray-900"
            >
              <span className="flex size-9 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                <Ruler className="size-5" />
              </span>
              {t.title}
            </h2>
            <p className="mt-1 text-sm text-gray-500">{t.subtitle}</p>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label={t.close}
            className="-mr-1 flex size-9 shrink-0 items-center justify-center rounded-full text-gray-400 transition hover:bg-gray-100 hover:text-gray-900"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* body (scrollable) */}
        <div className="overflow-y-auto px-6 py-6">
          <div className="grid gap-6 sm:grid-cols-2">
            {/* illustration */}
            <figure className="flex items-center justify-center rounded-2xl border border-gray-200 bg-gradient-to-br from-gray-50 to-gray-100/60 p-4">
              <Image
                src="/size-guide.png"
                alt={t.diagramAlt}
                width={400}
                height={420}
                priority
                className="h-auto w-full max-w-[240px] object-contain"
              />
            </figure>

            {/* measurement legend */}
            <div className="flex flex-col justify-center gap-4">
              <Legend
                badge="A"
                badgeClass="bg-blue-600"
                title={t.chest}
                desc={t.chestDesc}
              />
              <Legend
                badge="B"
                badgeClass="bg-emerald-600"
                title={t.length}
                desc={t.lengthDesc}
              />

              {/* pro tip */}
              <div className="flex items-start gap-2.5 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900">
                <Lightbulb className="mt-0.5 size-4 shrink-0 text-amber-500" />
                <p>
                  <strong>{t.proTip}.</strong> {t.tipBody}
                </p>
              </div>
            </div>
          </div>

          {/* table */}
          <div className="mt-6 overflow-hidden rounded-2xl border border-gray-200 shadow-sm">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-gray-900 text-white">
                  <th className="px-4 py-3 text-start font-semibold">{t.size}</th>
                  <th className="px-4 py-3 text-center font-semibold">
                    <span className="inline-flex items-center gap-1.5">
                      <span className="size-2 rounded-full bg-blue-400" />
                      {t.chest}
                    </span>
                  </th>
                  <th className="px-4 py-3 text-center font-semibold">
                    <span className="inline-flex items-center gap-1.5">
                      <span className="size-2 rounded-full bg-emerald-400" />
                      {t.length}
                    </span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {SIZE_GUIDE.map((row, i) => (
                  <tr
                    key={row.size}
                    className={i % 2 === 0 ? "bg-white" : "bg-gray-50/70"}
                  >
                    <td className="px-4 py-3 text-start font-bold text-gray-900">
                      {row.size}
                    </td>
                    <td className="px-4 py-3 text-center tabular-nums text-gray-700">
                      {row.chest} cm
                    </td>
                    <td className="px-4 py-3 text-center tabular-nums text-gray-700">
                      {row.length} cm
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* disclaimer */}
          <p className="mt-4 text-xs leading-relaxed text-gray-500">{t.disclaimer}</p>
        </div>
      </div>
    </div>
  );
}

/** A single measurement callout (letter badge + label + description). */
function Legend({
  badge,
  badgeClass,
  title,
  desc,
}: {
  badge: string;
  badgeClass: string;
  title: string;
  desc: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <span
        className={`flex size-8 shrink-0 items-center justify-center rounded-lg text-sm font-bold text-white ${badgeClass}`}
      >
        {badge}
      </span>
      <div>
        <p className="text-sm font-semibold text-gray-900">{title}</p>
        <p className="mt-0.5 text-xs leading-relaxed text-gray-500">{desc}</p>
      </div>
    </div>
  );
}
