"use client";

import { useEffect, useMemo, useState } from "react";
import { Tags, Trash2, Plus, CornerDownRight, X } from "lucide-react";
import PageHeader from "@/components/admin/ui/PageHeader";
import ConfirmDialog from "@/components/admin/ui/ConfirmDialog";
import { TableSkeleton } from "@/components/admin/ui/Skeleton";
import { CategoryService } from "@/services/category.service";
import { Category } from "@/types/category";

type FormState = {
  name: string;
  description: string;
  parentId: string; // "" = root
  imageUrl: string;
};

const EMPTY_FORM: FormState = {
  name: "",
  description: "",
  parentId: "",
  imageUrl: "",
};

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toDelete, setToDelete] = useState<Category | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

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

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      setFormError("Le nom est requis.");
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      await CategoryService.create({
        name: form.name.trim(),
        description: form.description.trim() || null,
        parentId: form.parentId ? Number(form.parentId) : null,
        imageUrl: form.imageUrl.trim() || null,
      });
      setForm(EMPTY_FORM);
      setShowForm(false);
      await load();
    } catch (err: unknown) {
      const status =
        typeof err === "object" && err && "response" in err
          ? (err as { response?: { status?: number } }).response?.status
          : undefined;
      setFormError(
        status === 409
          ? "Une catégorie portant ce nom existe déjà."
          : "Échec de la création de la catégorie."
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

  return (
    <div>
      <PageHeader
        title="Catégories"
        subtitle="Organisez votre catalogue en catégories et sous-catégories."
      >
        <button
          onClick={() => {
            setShowForm((v) => !v);
            setFormError(null);
          }}
          className="inline-flex items-center gap-1.5 rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-black"
        >
          {showForm ? <X size={16} /> : <Plus size={16} />}
          {showForm ? "Fermer" : "Nouvelle catégorie"}
        </button>
      </PageHeader>

      {/* Create form */}
      {showForm && (
        <form
          onSubmit={handleCreate}
          className="mb-6 rounded-xl border border-gray-200 bg-white p-5 shadow-sm"
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Nom *
              </label>
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="ex. T-shirts"
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
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
                {flatOptions.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Description
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
                URL de l&apos;image
              </label>
              <input
                value={form.imageUrl}
                onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
                placeholder="Optionnel — https://…"
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          {formError && (
            <p className="mt-3 text-sm text-rose-600">{formError}</p>
          )}

          <div className="mt-4 flex gap-2">
            <button
              type="submit"
              disabled={saving}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:opacity-60"
            >
              {saving ? "Création…" : "Créer la catégorie"}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowForm(false);
                setForm(EMPTY_FORM);
                setFormError(null);
              }}
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
                      <p className="text-xs text-gray-400">
                        {root.description}
                      </p>
                    )}
                  </div>
                  <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">
                    {root.children?.length ?? 0} sous-catégorie
                    {(root.children?.length ?? 0) > 1 ? "s" : ""}
                  </span>
                </div>
                <button
                  onClick={() => setToDelete(root)}
                  className="rounded-md p-1.5 text-rose-600 hover:bg-rose-50"
                  aria-label="Supprimer"
                >
                  <Trash2 size={16} />
                </button>
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
                  <button
                    onClick={() => setToDelete(child)}
                    className="rounded-md p-1.5 text-rose-600 hover:bg-rose-50"
                    aria-label="Supprimer"
                  >
                    <Trash2 size={15} />
                  </button>
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
