"use client";

import { useEffect, useState } from "react";
import { Tags, Trash2, Info } from "lucide-react";
import PageHeader from "@/components/admin/ui/PageHeader";
import ConfirmDialog from "@/components/admin/ui/ConfirmDialog";
import { TableSkeleton } from "@/components/admin/ui/Skeleton";
import { CategoryService } from "@/services/category.service";
import { Category } from "@/types/category";

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toDelete, setToDelete] = useState<Category | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        setCategories(await CategoryService.getAll());
      } catch {
        setError("Échec du chargement des catégories.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleDelete = async () => {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await CategoryService.delete(toDelete.id);
      setCategories((prev) => prev.filter((c) => c.id !== toDelete.id));
      setToDelete(null);
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
        subtitle="Organisez votre catalogue par catégorie."
      />

      <div className="mb-4 flex items-start gap-2 rounded-md border border-blue-100 bg-blue-50 p-3 text-sm text-blue-700">
        <Info size={16} className="mt-0.5 shrink-0" />
        <span>
          La création et l&apos;édition de catégories (avec traductions) seront
          activées prochainement. Vous pouvez consulter et supprimer les
          catégories existantes.
        </span>
      </div>

      {error && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-600">
          {error}
        </div>
      )}

      {loading ? (
        <TableSkeleton rows={4} />
      ) : categories.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-12 text-center">
          <Tags className="mx-auto mb-3 text-gray-300" size={40} />
          <p className="text-sm text-gray-500">Aucune catégorie.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((c) => (
            <div
              key={c.id}
              className="flex items-start justify-between rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
            >
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-violet-50 text-violet-600">
                  <Tags size={18} />
                </span>
                <div>
                  <p className="font-medium text-gray-800">{c.name}</p>
                  {c.description && (
                    <p className="line-clamp-1 text-xs text-gray-400">
                      {c.description}
                    </p>
                  )}
                </div>
              </div>
              <button
                onClick={() => setToDelete(c)}
                className="rounded-md p-1.5 text-rose-600 hover:bg-rose-50"
                aria-label="Supprimer"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={toDelete !== null}
        title="Supprimer la catégorie"
        message={`Supprimer « ${toDelete?.name} » ?`}
        confirmLabel="Supprimer"
        busy={deleting}
        onConfirm={handleDelete}
        onCancel={() => setToDelete(null)}
      />
    </div>
  );
}
