"use client";

import { LANGS } from "@/lib/lang";
import { ProductTranslation } from "@/types/product";

/** One language's editable name/description, keyed by lang code (fr/en/ar). */
export type TranslationDraft = { name: string; description: string };
export type TranslationDrafts = Record<string, TranslationDraft>;

/** Blank drafts for every supported language. */
export function emptyTranslationDrafts(): TranslationDrafts {
  return Object.fromEntries(
    LANGS.map((l) => [l.code, { name: "", description: "" }])
  );
}

/** Prefill drafts from the raw translations returned by the API. */
export function draftsFromTranslations(
  translations?: ProductTranslation[]
): TranslationDrafts {
  const drafts = emptyTranslationDrafts();
  for (const t of translations ?? []) {
    if (drafts[t.lang]) {
      drafts[t.lang] = { name: t.name ?? "", description: t.description ?? "" };
    }
  }
  return drafts;
}

/** Convert drafts to the API payload, dropping languages left entirely blank. */
export function draftsToPayload(drafts: TranslationDrafts) {
  return Object.entries(drafts)
    .filter(([, v]) => v.name.trim() || v.description.trim())
    .map(([lang, v]) => ({ lang, name: v.name, description: v.description }));
}

/**
 * Per-language name + description editor for a product. Used by both the create
 * and edit admin forms so the storefront can serve localized content for every
 * supported language (fr/en/ar). Blank languages fall back to the base
 * name/description on the storefront.
 */
export default function ProductTranslationsEditor({
  value,
  onChange,
}: {
  value: TranslationDrafts;
  onChange: (next: TranslationDrafts) => void;
}) {
  const update = (
    lang: string,
    field: "name" | "description",
    fieldValue: string
  ) => {
    onChange({
      ...value,
      [lang]: { ...value[lang], [field]: fieldValue },
    });
  };

  return (
    <div className="pt-2">
      <h2 className="mb-1 text-sm font-semibold text-gray-800">Translations</h2>
      <p className="mb-3 text-xs text-gray-400">
        Localized name &amp; description per language. Leave a language blank to
        fall back to the default name/description above. HTML is allowed in the
        description.
      </p>

      <div className="grid gap-4 md:grid-cols-3">
        {LANGS.map(({ code, native, dir }) => (
          <div key={code} className="rounded-md border bg-gray-50 p-3">
            <h3 className="mb-3 text-sm font-medium uppercase text-gray-700">
              {native}
            </h3>

            <label className="mb-1 block text-sm font-medium text-gray-700">
              Name
            </label>
            <input
              dir={dir}
              value={value[code]?.name ?? ""}
              onChange={(e) => update(code, "name", e.target.value)}
              placeholder={`${code.toUpperCase()} product name`}
              className="mb-3 w-full rounded-md border border-gray-300 px-3 py-2
                         text-gray-900 placeholder-gray-400
                         focus:border-black focus:outline-none focus:ring-2 focus:ring-black"
            />

            <label className="mb-1 block text-sm font-medium text-gray-700">
              Description
            </label>
            <textarea
              dir={dir}
              rows={5}
              value={value[code]?.description ?? ""}
              onChange={(e) => update(code, "description", e.target.value)}
              placeholder={`${code.toUpperCase()} product description`}
              className="w-full rounded-md border border-gray-300 px-3 py-2
                         text-gray-900 placeholder-gray-400
                         focus:border-black focus:outline-none focus:ring-2 focus:ring-black"
            />
          </div>
        ))}
      </div>
    </div>
  );
}
