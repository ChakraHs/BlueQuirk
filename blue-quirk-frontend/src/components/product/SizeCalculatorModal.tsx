"use client";

// Height + weight → recommended size. Accessible, mobile-friendly modal that
// mirrors SizeGuideModal's interaction model (Esc / overlay / button close,
// scroll lock, focus on open). The actual sizing logic lives in
// lib/sizePreference (recommendSizeFromBody) so it stays testable and tunable.
import { forwardRef, useEffect, useRef, useState } from "react";
import { X, Sparkles, Ruler, Scale, ArrowRight } from "lucide-react";
import { recommendSizeFromBody } from "@/lib/sizePreference";

const COPY = {
  fr: {
    title: "Calculer ma taille",
    subtitle: "Renseignez votre taille et votre poids pour une recommandation personnalisée.",
    height: "Taille (cm)",
    weight: "Poids (kg)",
    heightPh: "ex. 175",
    weightPh: "ex. 70",
    calc: "Voir ma taille",
    recalc: "Recalculer",
    invalid: "Saisissez une taille (140–220 cm) et un poids (30–200 kg) valides.",
    resultLead: "Votre taille recommandée",
    apply: (s: string) => `Choisir la taille ${s}`,
    note: "Estimation indicative basée sur votre morphologie. Entre deux tailles, privilégiez la plus grande pour plus d'aisance.",
    close: "Fermer",
  },
  ar: {
    title: "احسب مقاسك",
    subtitle: "أدخل طولك ووزنك للحصول على توصية مخصّصة.",
    height: "الطول (سم)",
    weight: "الوزن (كغ)",
    heightPh: "مثال 175",
    weightPh: "مثال 70",
    calc: "اعرض مقاسي",
    recalc: "إعادة الحساب",
    invalid: "أدخل طولاً (140–220 سم) ووزناً (30–200 كغ) صحيحين.",
    resultLead: "المقاس الموصى به",
    apply: (s: string) => `اختر المقاس ${s}`,
    note: "تقدير إرشادي حسب بنية جسمك. بين مقاسين، اختر الأكبر لمزيد من الراحة.",
    close: "إغلاق",
  },
  en: {
    title: "Calculate my size",
    subtitle: "Enter your height and weight for a personalized recommendation.",
    height: "Height (cm)",
    weight: "Weight (kg)",
    heightPh: "e.g. 175",
    weightPh: "e.g. 70",
    calc: "Show my size",
    recalc: "Recalculate",
    invalid: "Enter a valid height (140–220 cm) and weight (30–200 kg).",
    resultLead: "Your recommended size",
    apply: (s: string) => `Choose size ${s}`,
    note: "Indicative estimate based on your body type. Between two sizes, pick the larger one for more comfort.",
    close: "Close",
  },
} as const;

export default function SizeCalculatorModal({
  open,
  onClose,
  onApply,
  availableSizes,
  lang = "fr",
}: {
  open: boolean;
  onClose: () => void;
  onApply: (size: string) => void;
  availableSizes: string[];
  lang?: string;
}) {
  const t = lang === "ar" ? COPY.ar : lang === "en" ? COPY.en : COPY.fr;
  const firstRef = useRef<HTMLInputElement>(null);

  const [height, setHeight] = useState("");
  const [weight, setWeight] = useState("");
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState(false);

  // Reset the form each time the modal opens.
  useEffect(() => {
    if (!open) return;
    setHeight("");
    setWeight("");
    setResult(null);
    setError(false);

    const previouslyFocused = document.activeElement as HTMLElement | null;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const id = window.setTimeout(() => firstRef.current?.focus(), 50);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
      window.clearTimeout(id);
      previouslyFocused?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;

  const calculate = () => {
    const h = Number(height);
    const w = Number(weight);
    if (!(h >= 140 && h <= 220) || !(w >= 30 && w <= 200)) {
      setError(true);
      setResult(null);
      return;
    }
    setError(false);
    const rec = recommendSizeFromBody({ heightCm: h, weightKg: w }, availableSizes);
    setResult(rec?.size ?? null);
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center"
      dir={lang === "ar" ? "rtl" : "ltr"}
    >
      <button
        type="button"
        aria-label={t.close}
        onClick={onClose}
        className="absolute inset-0 bg-black/50 backdrop-blur-[1px]"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="size-calc-title"
        className="relative w-full max-w-md overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl animate-[fadeIn_0.2s_ease]"
      >
        {/* header */}
        <div className="flex items-start justify-between border-b border-gray-100 px-5 py-4">
          <div>
            <h2
              id="size-calc-title"
              className="flex items-center gap-2 text-lg font-bold text-gray-900"
            >
              <Sparkles className="size-5 text-blue-600" />
              {t.title}
            </h2>
            <p className="mt-1 text-sm text-gray-500">{t.subtitle}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t.close}
            className="-mr-1 flex size-9 shrink-0 items-center justify-center rounded-full text-gray-500 transition hover:bg-gray-100 hover:text-gray-900"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* body */}
        <div className="px-5 py-5">
          <div className="grid grid-cols-2 gap-3">
            <Field
              ref={firstRef}
              icon={<Ruler className="size-4" />}
              label={t.height}
              placeholder={t.heightPh}
              value={height}
              onChange={setHeight}
            />
            <Field
              icon={<Scale className="size-4" />}
              label={t.weight}
              placeholder={t.weightPh}
              value={weight}
              onChange={setWeight}
            />
          </div>

          {error && (
            <p className="mt-3 text-sm text-red-600">{t.invalid}</p>
          )}

          {/* result */}
          {result && !error && (
            <div className="mt-4 rounded-xl border border-blue-200 bg-blue-50 p-4 text-center">
              <p className="text-xs font-medium uppercase tracking-wide text-blue-600">
                {t.resultLead}
              </p>
              <p className="mt-1 text-4xl font-extrabold text-blue-700">{result}</p>
              <p className="mx-auto mt-2 max-w-xs text-xs leading-relaxed text-gray-500">
                {t.note}
              </p>
              <button
                type="button"
                onClick={() => {
                  onApply(result);
                  onClose();
                }}
                className="mt-3 inline-flex items-center justify-center gap-2 rounded-full bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
              >
                {t.apply(result)}
                <ArrowRight className="size-4" />
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={calculate}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-full bg-gray-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-gray-800"
          >
            <Sparkles className="size-4" />
            {result ? t.recalc : t.calc}
          </button>
        </div>
      </div>
    </div>
  );
}

const Field = forwardRef<
  HTMLInputElement,
  {
    icon: React.ReactNode;
    label: string;
    placeholder: string;
    value: string;
    onChange: (v: string) => void;
  }
>(function Field({ icon, label, placeholder, value, onChange }, ref) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-gray-700">{label}</span>
      <span className="relative block">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
          {icon}
        </span>
        <input
          ref={ref}
          type="number"
          inputMode="numeric"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full rounded-lg border border-gray-300 bg-white py-2.5 pl-9 pr-3 text-sm text-gray-900 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20"
        />
      </span>
    </label>
  );
});
