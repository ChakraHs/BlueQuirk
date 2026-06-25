"use client";

// Accessible, mobile-friendly size-guide dialog. Opens from a "Size Guide" link
// next to the Size selector (kept out of the main flow per the spec). Closes on
// Esc, overlay click, or the close button; locks body scroll and moves focus in
// on open, restoring it on close.
import { useEffect, useRef } from "react";
import { X, Ruler, Lightbulb } from "lucide-react";

const SIZES = ["S", "M", "L", "XL", "XXL"] as const;
const CHEST = [48, 50, 52, 54, 56];
const LENGTH = [64, 66, 68, 70, 72];

const COPY = {
  fr: {
    title: "Guide des tailles (centimètres)",
    proTip: "Astuce de pro",
    tipBody:
      "Mesurez l'un de vos t-shirts à la maison et comparez-le à ce guide pour un ajustement parfait.",
    size: "Taille",
    chest: "Poitrine (A)",
    length: "Longueur (B)",
    disclaimer:
      "Ce guide indique les mesures du vêtement posé à plat. Les mesures réelles peuvent varier jusqu'à 2 cm.",
    close: "Fermer",
    diagramAlt: "T-shirt indiquant la mesure A (poitrine) et la mesure B (longueur)",
  },
  ar: {
    title: "دليل المقاسات (سنتيمتر)",
    proTip: "نصيحة احترافية",
    tipBody:
      "قِس أحد قمصانك في المنزل وقارنه بهذا الدليل للحصول على أفضل مقاس.",
    size: "المقاس",
    chest: "الصدر (A)",
    length: "الطول (B)",
    disclaimer:
      "يوضّح هذا الدليل قياسات الملابس وهي مفرودة. قد تختلف القياسات الفعلية حتى 2 سم.",
    close: "إغلاق",
    diagramAlt: "قميص يوضّح قياس A (الصدر) وقياس B (الطول)",
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
  const t = lang === "ar" ? COPY.ar : COPY.fr;

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
        className="absolute inset-0 bg-black/50 backdrop-blur-[1px]"
      />

      {/* panel */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="size-guide-title"
        className="relative flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl animate-[fadeIn_0.2s_ease]"
      >
        {/* header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          <h2
            id="size-guide-title"
            className="flex items-center gap-2 text-lg font-bold text-gray-900"
          >
            <Ruler className="size-5 text-blue-600" />
            {t.title}
          </h2>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label={t.close}
            className="flex size-9 items-center justify-center rounded-full text-gray-500 transition hover:bg-gray-100 hover:text-gray-900"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* body (scrollable) */}
        <div className="overflow-y-auto px-5 py-5">
          {/* pro tip */}
          <div className="flex items-start gap-2.5 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900">
            <Lightbulb className="mt-0.5 size-4 shrink-0 text-amber-500" />
            <p>
              <strong>{t.proTip}.</strong> {t.tipBody}
            </p>
          </div>

          {/* diagram */}
          <div className="mt-5 flex justify-center">
            <ShirtDiagram title={t.diagramAlt} />
          </div>

          {/* table */}
          <div className="mt-5 overflow-x-auto">
            <table className="w-full border-collapse text-center text-sm">
              <thead>
                <tr>
                  <th className="border border-gray-200 bg-gray-50 px-3 py-2 text-start font-semibold text-gray-700">
                    {t.size}
                  </th>
                  {SIZES.map((s) => (
                    <th
                      key={s}
                      className="border border-gray-200 bg-gray-50 px-3 py-2 font-semibold text-gray-900"
                    >
                      {s}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr>
                  <th className="border border-gray-200 px-3 py-2 text-start font-medium text-gray-600">
                    {t.chest}
                  </th>
                  {CHEST.map((v, i) => (
                    <td key={i} className="border border-gray-200 px-3 py-2 text-gray-800">
                      {v}
                    </td>
                  ))}
                </tr>
                <tr>
                  <th className="border border-gray-200 px-3 py-2 text-start font-medium text-gray-600">
                    {t.length}
                  </th>
                  {LENGTH.map((v, i) => (
                    <td key={i} className="border border-gray-200 px-3 py-2 text-gray-800">
                      {v}
                    </td>
                  ))}
                </tr>
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

/** Simple t-shirt schematic with the A (chest, horizontal) and B (length, vertical) measurements. */
function ShirtDiagram({ title }: { title: string }) {
  return (
    <svg
      width="220"
      height="200"
      viewBox="0 0 220 200"
      role="img"
      aria-label={title}
      className="text-gray-900"
    >
      {/* shirt outline */}
      <path
        d="M70 20 L95 20 Q110 32 125 20 L150 20 L185 50 L168 70 L150 56 L150 178 L70 178 L70 56 L52 70 L35 50 Z"
        fill="#f3f4f6"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />

      {/* A — chest width (horizontal) */}
      <line x1="70" y1="92" x2="150" y2="92" stroke="#2563eb" strokeWidth="2" />
      <polygon points="70,92 78,88 78,96" fill="#2563eb" />
      <polygon points="150,92 142,88 142,96" fill="#2563eb" />
      <circle cx="110" cy="92" r="11" fill="#2563eb" />
      <text x="110" y="96" textAnchor="middle" fontSize="13" fontWeight="700" fill="#fff">
        A
      </text>

      {/* B — body length (vertical) */}
      <line x1="196" y1="56" x2="196" y2="178" stroke="#059669" strokeWidth="2" />
      <polygon points="196,56 192,64 200,64" fill="#059669" />
      <polygon points="196,178 192,170 200,170" fill="#059669" />
      <circle cx="196" cy="117" r="11" fill="#059669" />
      <text x="196" y="121" textAnchor="middle" fontSize="13" fontWeight="700" fill="#fff">
        B
      </text>
    </svg>
  );
}
