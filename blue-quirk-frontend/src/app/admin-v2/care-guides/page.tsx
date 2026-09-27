"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Pencil, Trash2, ShieldCheck, Sparkles, Loader2 } from "lucide-react";
import PageHeader from "@/components/admin/ui/PageHeader";
import ConfirmDialog from "@/components/admin/ui/ConfirmDialog";
import { TableSkeleton } from "@/components/admin/ui/Skeleton";
import { CareGuideService, type CareGuideTemplate } from "@/services/careGuide.service";

const TYPE_LABEL: Record<string, string> = { T_SHIRT: "T-shirt", HOODIE: "Hoodie" };

export default function CareGuidesPage() {
  const [rows, setRows] = useState<CareGuideTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [toDelete, setToDelete] = useState<CareGuideTemplate | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      setRows(await CareGuideService.list());
    } catch {
      setError("Failed to load care guides.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const doDelete = async () => {
    if (!toDelete) return;
    setBusy(true);
    setError(null);
    try {
      await CareGuideService.remove(toDelete.id);
      setToDelete(null);
      await load();
    } catch (err: unknown) {
      // 409 when the guide is still attached to products — surface the server message.
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg || "Failed to delete the care guide.");
      setToDelete(null);
    } finally {
      setBusy(false);
    }
  };

  const languages = (t: CareGuideTemplate) =>
    t.translations
      .filter((tr) =>
        [tr.fabricAndFeel, tr.washingAndDrying, tr.ironing, tr.printCare, tr.tips].some(
          (s) => s && s.trim()
        )
      )
      .map((tr) => tr.lang.toUpperCase());

  return (
    <div>
      <PageHeader
        title="Care & Wear guides"
        subtitle="Reusable care guides you can attach to products. Editing a guide updates every product that uses it."
      >
        <Link
          href="/admin-v2/care-guides/new"
          className="inline-flex items-center gap-1.5 rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-black"
        >
          <Plus size={16} /> New care guide
        </Link>
      </PageHeader>

      {error && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-600">{error}</div>
      )}

      {loading ? (
        <TableSkeleton />
      ) : rows.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-12 text-center">
          <Sparkles className="mx-auto mb-3 text-gray-300" size={40} />
          <p className="text-sm text-gray-500">No care guides yet.</p>
          <Link
            href="/admin-v2/care-guides/new"
            className="mt-3 inline-block text-sm font-medium text-blue-600 hover:text-blue-700"
          >
            Create your first care guide
          </Link>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="bg-gray-50 text-xs uppercase tracking-wider text-gray-500">
              <tr>
                <th className="px-4 py-3 text-left">Name</th>
                <th className="px-4 py-3 text-left">Type</th>
                <th className="px-4 py-3 text-left">Languages</th>
                <th className="px-4 py-3 text-left">Used by</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.map((t) => (
                <tr key={t.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin-v2/care-guides/${t.id}`}
                      className="inline-flex items-center gap-1.5 font-medium text-gray-800 hover:text-blue-600"
                    >
                      {t.name}
                      {t.seeded && (
                        <span
                          title="Starter template (editable)"
                          className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-1.5 py-0.5 text-[10px] font-medium text-indigo-600"
                        >
                          <ShieldCheck size={11} /> starter
                        </span>
                      )}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {t.productType ? TYPE_LABEL[t.productType] ?? t.productType : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      {languages(t).map((l) => (
                        <span key={l} className="rounded bg-gray-100 px-1.5 py-0.5 text-[11px] font-medium text-gray-600">
                          {l}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {t.inUseCount > 0 ? (
                      <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
                        {t.inUseCount} product{t.inUseCount === 1 ? "" : "s"}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400">Not used</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <Link
                        href={`/admin-v2/care-guides/${t.id}`}
                        title="Edit"
                        className="rounded-md p-1.5 text-gray-600 hover:bg-gray-100"
                      >
                        <Pencil size={15} />
                      </Link>
                      <button
                        onClick={() => setToDelete(t)}
                        disabled={busy || t.inUseCount > 0}
                        title={
                          t.inUseCount > 0
                            ? "In use — reassign the products before deleting"
                            : "Delete"
                        }
                        className="rounded-md p-1.5 text-rose-600 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-30"
                      >
                        {busy && toDelete?.id === t.id ? (
                          <Loader2 size={15} className="animate-spin" />
                        ) : (
                          <Trash2 size={15} />
                        )}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ConfirmDialog
        open={toDelete !== null}
        title="Delete care guide"
        message={`Delete "${toDelete?.name}"? This cannot be undone.`}
        confirmLabel="Delete"
        busy={busy}
        onConfirm={doDelete}
        onCancel={() => setToDelete(null)}
      />
    </div>
  );
}
