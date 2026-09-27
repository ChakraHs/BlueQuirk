"use client";

// Admin editor for a "Care & Wear" guide template: a name, an optional garment
// type, and the five care sections in each language (fr / en / ar). Language is
// switched with tabs; the Arabic fields render right-to-left. Empty languages are
// simply left blank — the backend drops any language with no content and requires
// at least one filled language.
import { useMemo, useState } from "react";
import { Loader2, Save } from "lucide-react";
import type {
  CareGuideTemplate,
  CareGuideTemplateRequest,
  CareGuideTranslation,
} from "@/services/careGuide.service";

type Lang = "fr" | "en" | "ar";
const LANGS: { code: Lang; label: string; rtl?: boolean }[] = [
  { code: "fr", label: "Français" },
  { code: "en", label: "English" },
  { code: "ar", label: "العربية", rtl: true },
];

// The five sections, in display order. `key` matches the backend translation field.
const SECTIONS: { key: keyof Omit<CareGuideTranslation, "lang">; label: string; hint: string }[] = [
  { key: "fabricAndFeel", label: "Fabric & feel", hint: "What it's made of and how it feels/behaves." },
  { key: "washingAndDrying", label: "Washing & drying", hint: "How to wash and dry the item." },
  { key: "ironing", label: "Ironing", hint: "Ironing guidance." },
  { key: "printCare", label: "Care of the printed design", hint: "How to protect the print." },
  { key: "tips", label: "Practical tips", hint: "Everyday tips." },
];

const EMPTY_TR = (lang: Lang): CareGuideTranslation => ({
  lang,
  fabricAndFeel: "",
  washingAndDrying: "",
  ironing: "",
  printCare: "",
  tips: "",
});

function draftsFrom(initial?: CareGuideTemplate | null): Record<Lang, CareGuideTranslation> {
  const base: Record<Lang, CareGuideTranslation> = {
    fr: EMPTY_TR("fr"),
    en: EMPTY_TR("en"),
    ar: EMPTY_TR("ar"),
  };
  for (const tr of initial?.translations ?? []) {
    if (tr.lang === "fr" || tr.lang === "en" || tr.lang === "ar") {
      base[tr.lang] = {
        lang: tr.lang,
        fabricAndFeel: tr.fabricAndFeel ?? "",
        washingAndDrying: tr.washingAndDrying ?? "",
        ironing: tr.ironing ?? "",
        printCare: tr.printCare ?? "",
        tips: tr.tips ?? "",
      };
    }
  }
  return base;
}

export default function CareGuideForm({
  initial,
  submitting,
  error,
  onSubmit,
}: {
  initial?: CareGuideTemplate | null;
  submitting: boolean;
  error: string | null;
  onSubmit: (payload: CareGuideTemplateRequest) => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [productType, setProductType] = useState<"" | "T_SHIRT" | "HOODIE">(
    initial?.productType ?? ""
  );
  const [drafts, setDrafts] = useState<Record<Lang, CareGuideTranslation>>(() => draftsFrom(initial));
  const [activeLang, setActiveLang] = useState<Lang>("fr");

  // Per-language "has any content" flag drives the tab dot + the submit guard.
  const filled = useMemo(() => {
    const has = (tr: CareGuideTranslation) =>
      SECTIONS.some((s) => (tr[s.key] ?? "").trim().length > 0);
    return { fr: has(drafts.fr), en: has(drafts.en), ar: has(drafts.ar) };
  }, [drafts]);
  const anyFilled = filled.fr || filled.en || filled.ar;

  const setField = (lang: Lang, key: keyof Omit<CareGuideTranslation, "lang">, value: string) =>
    setDrafts((d) => ({ ...d, [lang]: { ...d[lang], [key]: value } }));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      name: name.trim(),
      productType: productType || null,
      translations: [drafts.fr, drafts.en, drafts.ar],
    });
  };

  const canSubmit = name.trim().length > 0 && anyFilled && !submitting;

  return (
    <form onSubmit={submit} className="max-w-3xl space-y-6 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-600">{error}</div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Template name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            placeholder="e.g. T-shirt — Care & Wear"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 focus:border-black focus:outline-none focus:ring-2 focus:ring-black"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">For product type (optional)</label>
          <select
            value={productType}
            onChange={(e) => setProductType(e.target.value as "" | "T_SHIRT" | "HOODIE")}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 focus:border-black focus:outline-none focus:ring-2 focus:ring-black"
          >
            <option value="">Any / unspecified</option>
            <option value="T_SHIRT">T-shirt</option>
            <option value="HOODIE">Hoodie</option>
          </select>
        </div>
      </div>

      {/* Language tabs */}
      <div>
        <div className="mb-3 flex gap-2 border-b border-gray-200">
          {LANGS.map((l) => (
            <button
              type="button"
              key={l.code}
              onClick={() => setActiveLang(l.code)}
              className={`-mb-px flex items-center gap-1.5 border-b-2 px-3 py-2 text-sm font-medium transition ${
                activeLang === l.code
                  ? "border-gray-900 text-gray-900"
                  : "border-transparent text-gray-500 hover:text-gray-800"
              }`}
            >
              {l.label}
              <span
                className={`inline-block size-1.5 rounded-full ${
                  filled[l.code] ? "bg-emerald-500" : "bg-gray-300"
                }`}
                title={filled[l.code] ? "Has content" : "Empty"}
              />
            </button>
          ))}
        </div>

        {LANGS.map((l) => {
          if (l.code !== activeLang) return null;
          const tr = drafts[l.code];
          return (
            <div key={l.code} className="space-y-4" dir={l.rtl ? "rtl" : "ltr"}>
              {SECTIONS.map((s) => (
                <div key={s.key}>
                  <label className="mb-1 block text-sm font-medium text-gray-700">{s.label}</label>
                  <textarea
                    value={tr[s.key] ?? ""}
                    onChange={(e) => setField(l.code, s.key, e.target.value)}
                    rows={3}
                    placeholder={s.hint}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-black focus:outline-none focus:ring-2 focus:ring-black"
                  />
                </div>
              ))}
            </div>
          );
        })}
      </div>

      {!anyFilled && (
        <p className="text-xs text-amber-600">Fill in at least one language before saving.</p>
      )}

      <div className="flex items-center gap-3 pt-1">
        <button
          type="submit"
          disabled={!canSubmit}
          className="inline-flex items-center gap-2 rounded-md bg-gray-900 px-5 py-2 text-sm font-semibold text-white transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
          {submitting ? "Saving…" : "Save template"}
        </button>
      </div>
    </form>
  );
}
