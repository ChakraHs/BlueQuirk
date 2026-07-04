"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Tags,
  Trash2,
  Plus,
  Pencil,
  CornerDownRight,
  X,
  UploadCloud,
  Loader2,
  AlertCircle,
} from "lucide-react";
import PageHeader from "@/components/admin/ui/PageHeader";
import ConfirmDialog from "@/components/admin/ui/ConfirmDialog";
import { TableSkeleton } from "@/components/admin/ui/Skeleton";
import { CategoryService } from "@/services/category.service";
import { ImageService } from "@/services/image.service";
import { Category } from "@/types/category";

type Translation = { name: string; description: string };
type FormState = {
  name: string; // English base (default)
  description: string;
  parentId: string; // "" = root
  imageUrl: string;
  fr: Translation;
  ar: Translation;
};

const EMPTY_FORM: FormState = {
  name: "",
  description: "",
  parentId: "",
  imageUrl: "",
  fr: { name: "", description: "" },
  ar: { name: "", description: "" },
};

function translationFor(c: Category, lang: string): Translation {
  const t = c.translations?.find((x) => x.lang === lang);
  return { name: t?.name ?? "", description: t?.description ?? "" };
}

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toDelete, setToDelete] = useState<Category | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  // Category image upload (single image, same backend flow as products:
  // uploads the original to the shop API which stores it on Cloudflare R2 and
  // returns the optimized URLs — see image.service.ts / ImageController).
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const handleImageFile = async (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setImageError("Le fichier doit être une image.");
      return;
    }
    setImageError(null);
    setUploadingImage(true);
    try {
      const uploaded = await ImageService.upload(file);
      // Store the optimized display variant (falls back to the original URL),
      // which is what the storefront renders for category covers/cards.
      setForm((f) => ({ ...f, imageUrl: uploaded.displayUrl || uploaded.url }));
    } catch {
      setImageError("Échec du téléversement de l'image. Réessayez.");
    } finally {
      setUploadingImage(false);
    }
  };

  const load = async () => {
    try {
      setLoading(true);
      setError(null);
      setCategories(await CategoryService.getAll());
    } catch {
      setError("Échec du chargement des catégories.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  // Flat list (roots + their children) for the parent <select>.
  const flatOptions = useMemo(() => {
    const out: { id: number; label: string }[] = [];
    for (const root of categories) {
      out.push({ id: root.id, label: root.name });
      for (const child of root.children ?? [])
        out.push({ id: child.id, label: `— ${child.name}` });
    }
    return out;
  }, [categories]);

  const openCreate = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormError(null);
    setImageError(null);
    setShowForm(true);
  };

  const startEdit = (c: Category) => {
    setEditingId(c.id);
    setForm({
      name: c.name ?? "",
      description: c.description ?? "",
      parentId: c.parentId ? String(c.parentId) : "",
      imageUrl: c.imageUrl ?? "",
      fr: translationFor(c, "fr"),
      ar: translationFor(c, "ar"),
    });
    setFormError(null);
    setImageError(null);
    setShowForm(true);
    setTimeout(
      () => formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }),
      0
    );
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormError(null);
    setImageError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      setFormError("Le nom (anglais) est requis.");
      return;
    }
    setSaving(true);
    setFormError(null);

    const payload = {
      name: form.name.trim(),
      description: form.description.trim() || null,
      parentId: form.parentId ? Number(form.parentId) : null,
      imageUrl: form.imageUrl.trim() || null,
      translations: [
        { lang: "fr", name: form.fr.name.trim(), description: form.fr.description.trim() },
        { lang: "ar", name: form.ar.name.trim(), description: form.ar.description.trim() },
      ],
    };

    try {
      if (editingId != null) {
        await CategoryService.update(editingId, payload);
      } else {
        await CategoryService.create(payload);
      }
      closeForm();
      await load();
    } catch (err: unknown) {
      const status =
        typeof err === "object" && err && "response" in err
          ? (err as { response?: { status?: number } }).response?.status
          : undefined;
      setFormError(
        status === 409
          ? "Une catégorie portant ce nom existe déjà."
          : "Échec de l'enregistrement de la catégorie."
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await CategoryService.delete(toDelete.id);
      setToDelete(null);
      await load();
    } catch {
      setError("Échec de la suppression.");
    } finally {
      setDeleting(false);
    }
  };

  const renderTranslationCard = (lang: "fr" | "ar", label: string) => (
    <div className="rounded-md border bg-gray-50 p-3">
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
        {label}
      </h3>
      <input
        value={form[lang].name}
        onChange={(e) =>
          setForm({ ...form, [lang]: { ...form[lang], name: e.target.value } })
        }
        placeholder={`Nom (${lang})`}
        dir={lang === "ar" ? "rtl" : "ltr"}
        className="mb-2 w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
      />
      <input
        value={form[lang].description}
        onChange={(e) =>
          setForm({
            ...form,
            [lang]: { ...form[lang], description: e.target.value },
          })
        }
        placeholder={`Description (${lang})`}
        dir={lang === "ar" ? "rtl" : "ltr"}
        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
      />
    </div>
  );

  return (
    <div>
      <PageHeader
        title="Catégories"
        subtitle="Organisez votre catalogue en catégories et sous-catégories (FR / AR)."
      >
        <button
          onClick={() => (showForm ? closeForm() : openCreate())}
          className="inline-flex items-center gap-1.5 rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-black"
        >
          {showForm ? <X size={16} /> : <Plus size={16} />}
          {showForm ? "Fermer" : "Nouvelle catégorie"}
        </button>
      </PageHeader>

      {/* Create / edit form */}
      {showForm && (
        <form
          ref={formRef}
          onSubmit={handleSubmit}
          className="mb-6 rounded-xl border border-gray-200 bg-white p-5 shadow-sm"
        >
          <h2 className="mb-4 text-sm font-semibold text-gray-800">
            {editingId != null
              ? "Modifier la catégorie"
              : "Nouvelle catégorie"}
          </h2>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Nom (anglais) *
              </label>
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="ex. T-shirts"
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
              <p className="mt-1 text-xs text-gray-400">
                Valeur par défaut affichée si une traduction manque.
              </p>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Catégorie parente
              </label>
              <select
                value={form.parentId}
                onChange={(e) => setForm({ ...form, parentId: e.target.value })}
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500"
              >
                <option value="">— Aucune (catégorie racine)</option>
                {flatOptions
                  .filter((o) => o.id !== editingId)
                  .map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.label}
                    </option>
                  ))}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Description (anglais)
              </label>
              <input
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
                placeholder="Optionnel"
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Image de la catégorie
              </label>

              {form.imageUrl ? (
                <div className="flex items-center gap-3">
                  <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-lg border border-gray-200 bg-gray-100">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={form.imageUrl}
                      alt="Aperçu de la catégorie"
                      className="h-full w-full object-cover"
                    />
                    {uploadingImage && (
                      <span className="absolute inset-0 flex items-center justify-center bg-black/30">
                        <Loader2 className="animate-spin text-white" size={20} />
                      </span>
                    )}
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <button
                      type="button"
                      onClick={() => imageInputRef.current?.click()}
                      disabled={uploadingImage}
                      className="inline-flex w-fit items-center gap-1.5 rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-60"
                    >
                      <UploadCloud size={15} /> Remplacer
                    </button>
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, imageUrl: "" })}
                      disabled={uploadingImage}
                      className="inline-flex w-fit items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium text-rose-600 transition hover:bg-rose-50 disabled:opacity-60"
                    >
                      <Trash2 size={15} /> Retirer
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  onClick={() => !uploadingImage && imageInputRef.current?.click()}
                  role="button"
                  tabIndex={0}
                  className={`flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed px-6 py-6 text-center transition ${
                    uploadingImage
                      ? "border-gray-300 bg-gray-50"
                      : "border-gray-300 bg-gray-50 hover:border-gray-400"
                  }`}
                >
                  {uploadingImage ? (
                    <>
                      <Loader2 className="mb-2 animate-spin text-gray-400" size={26} />
                      <p className="text-sm font-medium text-gray-600">Téléversement…</p>
                    </>
                  ) : (
                    <>
                      <UploadCloud className="mb-2 text-gray-400" size={26} />
                      <p className="text-sm font-medium text-gray-600">
                        Cliquez pour téléverser une image
                      </p>
                      <p className="mt-1 text-xs text-gray-400">
                        JPG, PNG, WebP — optimisée automatiquement par le serveur
                      </p>
                    </>
                  )}
                </div>
              )}

              <input
                ref={imageInputRef}
                type="file"
                accept="image/*"
                hidden
                onChange={(e) => {
                  handleImageFile(e.target.files?.[0]);
                  e.target.value = "";
                }}
              />

              {imageError && (
                <p className="mt-2 flex items-center gap-1 text-xs text-red-600">
                  <AlertCircle size={12} /> {imageError}
                </p>
              )}
            </div>
          </div>

          {/* Translations */}
          <div className="mt-5">
            <h3 className="mb-3 text-sm font-semibold text-gray-800">
              Traductions
            </h3>
            <div className="grid gap-4 sm:grid-cols-2">
              {renderTranslationCard("fr", "Français")}
              {renderTranslationCard("ar", "العربية (Arabe)")}
            </div>
          </div>

          {formError && <p className="mt-3 text-sm text-rose-600">{formError}</p>}

          <div className="mt-5 flex gap-2">
            <button
              type="submit"
              disabled={saving}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:opacity-60"
            >
              {saving
                ? "Enregistrement…"
                : editingId != null
                ? "Enregistrer les modifications"
                : "Créer la catégorie"}
            </button>
            <button
              type="button"
              onClick={closeForm}
              className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
            >
              Annuler
            </button>
          </div>
        </form>
      )}

      {error && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-600">
          {error}
        </div>
      )}

      {/* Tree */}
      {loading ? (
        <TableSkeleton rows={4} />
      ) : categories.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-12 text-center">
          <Tags className="mx-auto mb-3 text-gray-300" size={40} />
          <p className="text-sm text-gray-500">
            Aucune catégorie. Créez-en une pour commencer.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          {categories.map((root, idx) => (
            <div
              key={root.id}
              className={idx > 0 ? "border-t border-gray-100" : ""}
            >
              {/* Parent row */}
              <div className="flex items-center justify-between px-5 py-3">
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-violet-50 text-violet-600">
                    <Tags size={17} />
                  </span>
                  <div>
                    <p className="font-semibold text-gray-800">{root.name}</p>
                    {root.description && (
                      <p className="text-xs text-gray-400">{root.description}</p>
                    )}
                  </div>
                  <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">
                    {root.children?.length ?? 0} sous-catégorie
                    {(root.children?.length ?? 0) > 1 ? "s" : ""}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => startEdit(root)}
                    className="rounded-md p-1.5 text-blue-600 hover:bg-blue-50"
                    aria-label="Modifier"
                  >
                    <Pencil size={16} />
                  </button>
                  <button
                    onClick={() => setToDelete(root)}
                    className="rounded-md p-1.5 text-rose-600 hover:bg-rose-50"
                    aria-label="Supprimer"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              {/* Children */}
              {(root.children ?? []).map((child) => (
                <div
                  key={child.id}
                  className="flex items-center justify-between border-t border-gray-50 bg-gray-50/40 py-2.5 pl-14 pr-5"
                >
                  <div className="flex items-center gap-2 text-gray-700">
                    <CornerDownRight size={15} className="text-gray-400" />
                    <span className="text-sm">{child.name}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => startEdit(child)}
                      className="rounded-md p-1.5 text-blue-600 hover:bg-blue-50"
                      aria-label="Modifier"
                    >
                      <Pencil size={15} />
                    </button>
                    <button
                      onClick={() => setToDelete(child)}
                      className="rounded-md p-1.5 text-rose-600 hover:bg-rose-50"
                      aria-label="Supprimer"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={toDelete !== null}
        title="Supprimer la catégorie"
        message={`Supprimer « ${toDelete?.name} » ?${
          toDelete?.children?.length
            ? " Ses sous-catégories seront détachées."
            : ""
        }`}
        confirmLabel="Supprimer"
        busy={deleting}
        onConfirm={handleDelete}
        onCancel={() => setToDelete(null)}
      />
    </div>
  );
}
