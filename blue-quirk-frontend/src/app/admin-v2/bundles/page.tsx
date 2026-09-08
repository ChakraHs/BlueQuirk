"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Plus, Pencil, Trash2, ToggleLeft, ToggleRight, Boxes, Package,
} from "lucide-react";
import PageHeader from "@/components/admin/ui/PageHeader";
import ConfirmDialog from "@/components/admin/ui/ConfirmDialog";
import { TableSkeleton } from "@/components/admin/ui/Skeleton";
import { BundleService, type BundleOffer } from "@/services/bundle.service";
import { formatPrice } from "@/lib/money";

const ELIGIBILITY_LABELS: Record<string, string> = {
  ALL_PRODUCTS: "All products",
  CATEGORY: "Collection",
  SELECTED_PRODUCTS: "Selected products",
};

export default function BundlesPage() {
  const [rows, setRows] = useState<BundleOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [toDelete, setToDelete] = useState<BundleOffer | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      setRows(await BundleService.list());
    } catch {
      setError("Failed to load bundle offers.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const doToggle = async (b: BundleOffer) => {
    setBusy(true);
    try {
      await BundleService.setActive(b.id, !b.active);
      await load();
    } catch {
      setError("Failed to update offer.");
    } finally {
      setBusy(false);
    }
  };

  const doDelete = async () => {
    if (!toDelete) return;
    setBusy(true);
    try {
      await BundleService.remove(toDelete.id);
      setToDelete(null);
      await load();
    } catch {
      setError("Failed to delete offer.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <PageHeader title="Quantity Bundles" subtitle="Build-your-set offers that lift average order value.">
        <Link
          href="/admin-v2/bundles/new"
          className="inline-flex items-center gap-1.5 rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-black"
        >
          <Plus size={16} /> New bundle
        </Link>
      </PageHeader>

      {error && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-600">{error}</div>
      )}

      {loading ? (
        <TableSkeleton />
      ) : rows.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-12 text-center">
          <Boxes className="mx-auto mb-3 text-gray-300" size={40} />
          <p className="text-sm text-gray-500">No bundle offers yet.</p>
          <Link href="/admin-v2/bundles/new" className="mt-3 inline-block text-sm font-medium text-blue-600 hover:text-blue-700">
            Create your first bundle
          </Link>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
          <table className="w-full min-w-[880px] text-sm">
            <thead className="bg-gray-50 text-xs uppercase tracking-wider text-gray-500">
              <tr>
                <th className="px-4 py-3 text-left">Offer</th>
                <th className="px-4 py-3 text-left">Pricing</th>
                <th className="px-4 py-3 text-left">Eligibility</th>
                <th className="px-4 py-3 text-left">Mix</th>
                <th className="px-4 py-3 text-left">Used</th>
                <th className="px-4 py-3 text-left">Given</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.map((b) => (
                <tr key={b.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <Link href={`/admin-v2/bundles/${b.id}`} className="font-medium text-gray-800 hover:text-blue-600">
                      {b.name}
                    </Link>
                    {b.displayOnProduct && (
                      <span className="ml-2 inline-flex items-center gap-1 rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-medium text-blue-600">
                        <Package size={10} /> On product
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 font-medium text-gray-800">{b.pricingLabel}</td>
                  <td className="px-4 py-3 text-gray-600">{ELIGIBILITY_LABELS[b.eligibility] ?? b.eligibility}</td>
                  <td className="px-4 py-3 text-gray-600">{b.allowMixing ? "Yes" : "No"}</td>
                  <td className="px-4 py-3 text-gray-700">{b.usageCount}</td>
                  <td className="px-4 py-3 text-gray-700">{formatPrice(b.totalDiscountGiven)}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${b.active ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-600"}`}>
                      {b.active ? "On" : "Off"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <Link href={`/admin-v2/bundles/${b.id}`} title="Edit" className="rounded-md p-1.5 text-gray-600 hover:bg-gray-100"><Pencil size={15} /></Link>
                      <button onClick={() => doToggle(b)} disabled={busy} title={b.active ? "Disable" : "Enable"} className="rounded-md p-1.5 text-gray-600 hover:bg-gray-100 disabled:opacity-40">
                        {b.active ? <ToggleRight size={15} className="text-emerald-600" /> : <ToggleLeft size={15} />}
                      </button>
                      <button onClick={() => setToDelete(b)} disabled={busy} title="Delete" className="rounded-md p-1.5 text-rose-600 hover:bg-rose-50 disabled:opacity-40"><Trash2 size={15} /></button>
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
        title="Delete bundle offer"
        message={`Delete "${toDelete?.name}"? Existing orders keep their recorded bundle discount, but the offer stops applying to new carts. This cannot be undone.`}
        confirmLabel="Delete"
        busy={busy}
        onConfirm={doDelete}
        onCancel={() => setToDelete(null)}
      />
    </div>
  );
}
