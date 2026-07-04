"use client";

import { useEffect, useRef, useState } from "react";
import { Store, UploadCloud, Loader2, Image as ImageIcon, Trash2, Check, LayoutTemplate } from "lucide-react";
import PageHeader from "@/components/admin/ui/PageHeader";
import { SettingsService } from "@/services/settings.service";
import { StoreSettings } from "@/types/settings";

const LANGS = [
  { value: "fr", label: "Français" },
  { value: "en", label: "English" },
  { value: "ar", label: "العربية (Arabic)" },
];

type FormState = {
  storeName: string;
  logoUrl: string | null;
  shippingFee: string;
  freeShippingThreshold: string;
  currency: string;
  defaultLang: string;
  heroTitleFr: string;
  heroTitleEn: string;
  heroTitleAr: string;
  heroSubtitleFr: string;
  heroSubtitleEn: string;
  heroSubtitleAr: string;
  heroBtnTextColor: string;
  heroBtnBgColor: string;
  heroBgColor: string;
  heroImageUrl: string | null;
  heroImageMobileUrl: string | null;
};

function toForm(s: StoreSettings): FormState {
  return {
    storeName: s.storeName ?? "",
    logoUrl: s.logoUrl ?? null,
    shippingFee: String(s.shippingFee ?? 0),
    freeShippingThreshold: String(s.freeShippingThreshold ?? 0),
    currency: s.currency ?? "DH",
    defaultLang: s.defaultLang ?? "fr",
    heroTitleFr: s.heroTitleFr ?? "",
    heroTitleEn: s.heroTitleEn ?? "",
    heroTitleAr: s.heroTitleAr ?? "",
    heroSubtitleFr: s.heroSubtitleFr ?? "",
    heroSubtitleEn: s.heroSubtitleEn ?? "",
    heroSubtitleAr: s.heroSubtitleAr ?? "",
    heroBtnTextColor: s.heroBtnTextColor ?? "",
    heroBtnBgColor: s.heroBtnBgColor ?? "",
    heroBgColor: s.heroBgColor ?? "",
    heroImageUrl: s.heroImageUrl ?? null,
    heroImageMobileUrl: s.heroImageMobileUrl ?? null,
  };
}

// Hero text languages, in admin display order.
const HERO_LANGS = [
  { code: "fr", label: "Français", dir: "ltr" as const },
  { code: "en", label: "English", dir: "ltr" as const },
  { code: "ar", label: "العربية", dir: "rtl" as const },
];

export default function SettingsPage() {
  const [form, setForm] = useState<FormState | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [heroUploading, setHeroUploading] = useState<"desktop" | "mobile" | null>(null);
  const [heroLang, setHeroLang] = useState("fr");
  const logoInput = useRef<HTMLInputElement>(null);
  const heroDesktopInput = useRef<HTMLInputElement>(null);
  const heroMobileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    SettingsService.get()
      .then((s) => setForm(toForm(s)))
      .catch(() => setError("Failed to load settings."))
      .finally(() => setLoading(false));
  }, []);

  const update = (patch: Partial<FormState>) =>
    setForm((f) => (f ? { ...f, ...patch } : f));

  const handleLogo = async (file: File) => {
    setUploading(true);
    setError(null);
    try {
      const updated = await SettingsService.uploadLogo(file);
      update({ logoUrl: updated.logoUrl });
    } catch {
      setError("Failed to upload the logo.");
    } finally {
      setUploading(false);
    }
  };

  const handleHeroImage = async (file: File, slot: "desktop" | "mobile") => {
    setHeroUploading(slot);
    setError(null);
    try {
      const url = await SettingsService.uploadImage(file);
      update(slot === "desktop" ? { heroImageUrl: url } : { heroImageMobileUrl: url });
    } catch {
      setError("Failed to upload the image.");
    } finally {
      setHeroUploading(null);
    }
  };

  const handleSave = async () => {
    if (!form) return;
    if (!form.storeName.trim()) {
      setError("The store name is required.");
      return;
    }
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      // Send "" (not null) for cleared fields: the backend treats an empty
      // string as "clear this" and null as "leave unchanged", so removing an
      // image/value must send an empty string for it to actually be deleted.
      const updated = await SettingsService.update({
        storeName: form.storeName.trim(),
        logoUrl: form.logoUrl ?? "",
        shippingFee: Math.max(0, Number(form.shippingFee) || 0),
        freeShippingThreshold: Math.max(0, Number(form.freeShippingThreshold) || 0),
        currency: form.currency.trim() || "DH",
        defaultLang: form.defaultLang,
        heroTitleFr: form.heroTitleFr.trim(),
        heroTitleEn: form.heroTitleEn.trim(),
        heroTitleAr: form.heroTitleAr.trim(),
        heroSubtitleFr: form.heroSubtitleFr.trim(),
        heroSubtitleEn: form.heroSubtitleEn.trim(),
        heroSubtitleAr: form.heroSubtitleAr.trim(),
        heroBtnTextColor: form.heroBtnTextColor.trim(),
        heroBtnBgColor: form.heroBtnBgColor.trim(),
        heroBgColor: form.heroBgColor.trim(),
        heroImageUrl: form.heroImageUrl ?? "",
        heroImageMobileUrl: form.heroImageMobileUrl ?? "",
      });
      setForm(toForm(updated));
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch {
      setError("Failed to save settings.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Settings"
        subtitle="Customize your store: branding, shipping, currency and default language."
      />

      {loading || !form ? (
        <div className="rounded-xl border border-gray-200 bg-white p-10 text-center text-sm text-gray-400">
          Loading…
        </div>
      ) : (
        <div className="max-w-3xl space-y-6">
          {/* Branding */}
          <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <Store size={18} className="text-gray-500" />
              <h2 className="text-sm font-semibold text-gray-800">Branding</h2>
            </div>

            <label className="mb-1 block text-sm font-medium text-gray-700">
              Store name *
            </label>
            <input
              value={form.storeName}
              onChange={(e) => update({ storeName: e.target.value })}
              placeholder="e.g. BlueQuirk"
              className="mb-4 w-full max-w-sm rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />

            <label className="mb-1 block text-sm font-medium text-gray-700">
              Logo
            </label>
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-gray-200 bg-gray-50">
                {form.logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={form.logoUrl} alt="Logo" className="h-full w-full object-contain" />
                ) : (
                  <ImageIcon size={22} className="text-gray-300" />
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => logoInput.current?.click()}
                  disabled={uploading}
                  className="inline-flex items-center gap-1.5 rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-60"
                >
                  {uploading ? (
                    <Loader2 size={15} className="animate-spin" />
                  ) : (
                    <UploadCloud size={15} />
                  )}
                  {form.logoUrl ? "Change logo" : "Upload a logo"}
                </button>
                {form.logoUrl && (
                  <button
                    type="button"
                    onClick={() => update({ logoUrl: null })}
                    className="inline-flex items-center gap-1.5 rounded-md p-2 text-rose-600 transition hover:bg-rose-50"
                    aria-label="Remove logo"
                  >
                    <Trash2 size={15} />
                  </button>
                )}
                <input
                  ref={logoInput}
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={(e) => {
                    if (e.target.files?.[0]) handleLogo(e.target.files[0]);
                    e.target.value = "";
                  }}
                />
              </div>
            </div>
            <p className="mt-2 text-xs text-gray-400">
              Transparent PNG recommended. Removing the logo shows the name as text.
            </p>
          </section>

          {/* Hero (home page) */}
          <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <LayoutTemplate size={18} className="text-gray-500" />
              <h2 className="text-sm font-semibold text-gray-800">
                Home hero section
              </h2>
            </div>

            {/* Localized title + description: a tab per language so the admin
                can enter the hero copy in FR, EN and AR. */}
            <div className="mb-3 flex gap-1 rounded-lg bg-gray-100 p-1">
              {HERO_LANGS.map((l) => (
                <button
                  key={l.code}
                  type="button"
                  onClick={() => setHeroLang(l.code)}
                  className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition ${
                    heroLang === l.code
                      ? "bg-white text-gray-900 shadow-sm"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  {l.label}
                </button>
              ))}
            </div>

            {HERO_LANGS.map((l) => {
              const cap = l.code.charAt(0).toUpperCase() + l.code.slice(1);
              const titleKey = `heroTitle${cap}` as keyof FormState;
              const subtitleKey = `heroSubtitle${cap}` as keyof FormState;
              return (
                <div key={l.code} className={heroLang === l.code ? "" : "hidden"}>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Title ({l.label})
                  </label>
                  <input
                    dir={l.dir}
                    value={(form[titleKey] as string) ?? ""}
                    onChange={(e) => update({ [titleKey]: e.target.value } as Partial<FormState>)}
                    placeholder="Leave empty for the default text"
                    className="mb-4 w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />

                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Description ({l.label})
                  </label>
                  <textarea
                    dir={l.dir}
                    value={(form[subtitleKey] as string) ?? ""}
                    onChange={(e) => update({ [subtitleKey]: e.target.value } as Partial<FormState>)}
                    rows={2}
                    placeholder="Leave empty for the default text"
                    className="mb-4 w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              );
            })}

            {/* Primary button colours */}
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Primary button (colors)
            </label>
            <div className="mb-4 grid gap-4 sm:grid-cols-2">
              <div>
                <span className="mb-1 block text-xs text-gray-500">Button background</span>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={form.heroBtnBgColor || "#ffffff"}
                    onChange={(e) => update({ heroBtnBgColor: e.target.value })}
                    className="h-9 w-12 cursor-pointer rounded border border-gray-300"
                  />
                  <input
                    value={form.heroBtnBgColor}
                    onChange={(e) => update({ heroBtnBgColor: e.target.value })}
                    placeholder="#ffffff"
                    className="w-28 rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
                  />
                  {form.heroBtnBgColor && (
                    <button
                      type="button"
                      onClick={() => update({ heroBtnBgColor: "" })}
                      className="rounded-md p-2 text-rose-600 transition hover:bg-rose-50"
                      aria-label="Reset background"
                    >
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>
              </div>
              <div>
                <span className="mb-1 block text-xs text-gray-500">Text color</span>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={form.heroBtnTextColor || "#1d4ed8"}
                    onChange={(e) => update({ heroBtnTextColor: e.target.value })}
                    className="h-9 w-12 cursor-pointer rounded border border-gray-300"
                  />
                  <input
                    value={form.heroBtnTextColor}
                    onChange={(e) => update({ heroBtnTextColor: e.target.value })}
                    placeholder="#1d4ed8"
                    className="w-28 rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
                  />
                  {form.heroBtnTextColor && (
                    <button
                      type="button"
                      onClick={() => update({ heroBtnTextColor: "" })}
                      className="rounded-md p-2 text-rose-600 transition hover:bg-rose-50"
                      aria-label="Reset text"
                    >
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>
              </div>
            </div>
            <p className="mb-4 text-xs text-gray-400">
              Applies to the hero&apos;s first button. Leave empty for the default style.
            </p>

            <label className="mb-1 block text-sm font-medium text-gray-700">
              Background color
            </label>
            <div className="mb-1 flex items-center gap-2">
              <input
                type="color"
                value={form.heroBgColor || "#1e3a8a"}
                onChange={(e) => update({ heroBgColor: e.target.value })}
                className="h-9 w-12 cursor-pointer rounded border border-gray-300"
              />
              <input
                value={form.heroBgColor}
                onChange={(e) => update({ heroBgColor: e.target.value })}
                placeholder="#1e3a8a"
                className="w-32 rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
              />
              {form.heroBgColor && (
                <button
                  type="button"
                  onClick={() => update({ heroBgColor: "" })}
                  className="rounded-md p-2 text-rose-600 transition hover:bg-rose-50"
                  aria-label="Remove color"
                >
                  <Trash2 size={15} />
                </button>
              )}
            </div>
            <p className="mb-4 text-xs text-gray-400">
              Used when there is no background image.
            </p>

            {/* Background images: desktop + mobile */}
            <div className="grid gap-4 sm:grid-cols-2">
              {([
                ["desktop", "Background image (desktop)", form.heroImageUrl, heroDesktopInput] as const,
                ["mobile", "Background image (mobile)", form.heroImageMobileUrl, heroMobileInput] as const,
              ]).map(([slot, label, url, ref]) => (
                <div key={slot}>
                  <label className="mb-1 block text-sm font-medium text-gray-700">{label}</label>
                  <div className="relative flex h-28 items-center justify-center overflow-hidden rounded-lg border border-gray-200 bg-gray-50">
                    {url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={url} alt={label} className="h-full w-full object-cover" />
                    ) : (
                      <ImageIcon size={24} className="text-gray-300" />
                    )}
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => ref.current?.click()}
                      disabled={heroUploading === slot}
                      className="inline-flex items-center gap-1.5 rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-60"
                    >
                      {heroUploading === slot ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <UploadCloud size={14} />
                      )}
                      {url ? "Change" : "Upload"}
                    </button>
                    {url && (
                      <button
                        type="button"
                        onClick={() =>
                          update(slot === "desktop" ? { heroImageUrl: null } : { heroImageMobileUrl: null })
                        }
                        className="rounded-md p-1.5 text-rose-600 transition hover:bg-rose-50"
                        aria-label="Remove image"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                    <input
                      ref={ref}
                      type="file"
                      accept="image/*"
                      hidden
                      onChange={(e) => {
                        if (e.target.files?.[0]) handleHeroImage(e.target.files[0], slot);
                        e.target.value = "";
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
            <p className="mt-2 text-xs text-gray-400">
              If only one image is set, it is used for both formats. Without an image, the background color is used.
            </p>
          </section>

          {/* Shipping */}
          <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-sm font-semibold text-gray-800">
              Shipping & currency
            </h2>
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Shipping fee
                </label>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={form.shippingFee}
                  onChange={(e) => update({ shippingFee: e.target.value })}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Free shipping threshold
                </label>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={form.freeShippingThreshold}
                  onChange={(e) => update({ freeShippingThreshold: e.target.value })}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
                <p className="mt-1 text-xs text-gray-400">0 = disabled</p>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Currency
                </label>
                <input
                  value={form.currency}
                  onChange={(e) => update({ currency: e.target.value })}
                  placeholder="DH"
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>
          </section>

          {/* Locale */}
          <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-sm font-semibold text-gray-800">Language</h2>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Default language
            </label>
            <select
              value={form.defaultLang}
              onChange={(e) => update({ defaultLang: e.target.value })}
              className="w-full max-w-xs rounded-md border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500"
            >
              {LANGS.map((l) => (
                <option key={l.value} value={l.value}>
                  {l.label}
                </option>
              ))}
            </select>
            <p className="mt-2 text-xs text-gray-400">
              Language shown to new visitors (with no saved preference).
            </p>
          </section>

          {error && <p className="text-sm text-rose-600">{error}</p>}

          <div className="flex items-center gap-3">
            <button
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700 disabled:opacity-60"
            >
              {saving && <Loader2 size={15} className="animate-spin" />}
              Save changes
            </button>
            {saved && (
              <span className="inline-flex items-center gap-1 text-sm font-medium text-emerald-600">
                <Check size={15} /> Saved
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
