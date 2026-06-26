"use client";

import { useEffect, useRef, useState } from "react";
import { Store, UploadCloud, Loader2, Image as ImageIcon, Trash2, Check } from "lucide-react";
import PageHeader from "@/components/admin/ui/PageHeader";
import { SettingsService } from "@/services/settings.service";
import { StoreSettings } from "@/types/settings";

const LANGS = [
  { value: "fr", label: "Français" },
  { value: "ar", label: "العربية (Arabe)" },
];

type FormState = {
  storeName: string;
  logoUrl: string | null;
  shippingFee: string;
  freeShippingThreshold: string;
  currency: string;
  defaultLang: string;
};

function toForm(s: StoreSettings): FormState {
  return {
    storeName: s.storeName ?? "",
    logoUrl: s.logoUrl ?? null,
    shippingFee: String(s.shippingFee ?? 0),
    freeShippingThreshold: String(s.freeShippingThreshold ?? 0),
    currency: s.currency ?? "DH",
    defaultLang: s.defaultLang ?? "fr",
  };
}

export default function SettingsPage() {
  const [form, setForm] = useState<FormState | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const logoInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    SettingsService.get()
      .then((s) => setForm(toForm(s)))
      .catch(() => setError("Échec du chargement des paramètres."))
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
      setError("Échec du téléversement du logo.");
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!form) return;
    if (!form.storeName.trim()) {
      setError("Le nom de la boutique est requis.");
      return;
    }
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const updated = await SettingsService.update({
        storeName: form.storeName.trim(),
        logoUrl: form.logoUrl,
        shippingFee: Math.max(0, Number(form.shippingFee) || 0),
        freeShippingThreshold: Math.max(0, Number(form.freeShippingThreshold) || 0),
        currency: form.currency.trim() || "DH",
        defaultLang: form.defaultLang,
      });
      setForm(toForm(updated));
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch {
      setError("Échec de l'enregistrement des paramètres.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Paramètres"
        subtitle="Personnalisez votre boutique : marque, livraison, devise et langue par défaut."
      />

      {loading || !form ? (
        <div className="rounded-xl border border-gray-200 bg-white p-10 text-center text-sm text-gray-400">
          Chargement…
        </div>
      ) : (
        <div className="max-w-3xl space-y-6">
          {/* Branding */}
          <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <Store size={18} className="text-gray-500" />
              <h2 className="text-sm font-semibold text-gray-800">Marque</h2>
            </div>

            <label className="mb-1 block text-sm font-medium text-gray-700">
              Nom de la boutique *
            </label>
            <input
              value={form.storeName}
              onChange={(e) => update({ storeName: e.target.value })}
              placeholder="ex. BlueQuirk"
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
                  {form.logoUrl ? "Changer le logo" : "Téléverser un logo"}
                </button>
                {form.logoUrl && (
                  <button
                    type="button"
                    onClick={() => update({ logoUrl: null })}
                    className="inline-flex items-center gap-1.5 rounded-md p-2 text-rose-600 transition hover:bg-rose-50"
                    aria-label="Retirer le logo"
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
              PNG transparent recommandé. Retirer le logo affiche le nom en texte.
            </p>
          </section>

          {/* Shipping */}
          <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-sm font-semibold text-gray-800">
              Livraison & devise
            </h2>
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Frais de livraison
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
                  Seuil livraison gratuite
                </label>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={form.freeShippingThreshold}
                  onChange={(e) => update({ freeShippingThreshold: e.target.value })}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
                <p className="mt-1 text-xs text-gray-400">0 = désactivé</p>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Devise
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
            <h2 className="mb-4 text-sm font-semibold text-gray-800">Langue</h2>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Langue par défaut
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
              Langue affichée aux nouveaux visiteurs (sans préférence enregistrée).
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
              Enregistrer les modifications
            </button>
            {saved && (
              <span className="inline-flex items-center gap-1 text-sm font-medium text-emerald-600">
                <Check size={15} /> Enregistré
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
