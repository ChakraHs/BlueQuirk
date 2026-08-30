"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import Link from "next/link";
import { Search, Plus, Pencil, Trash2, Package, ArrowUpDown } from "lucide-react";
import PageHeader from "@/components/admin/ui/PageHeader";
import ConfirmDialog from "@/components/admin/ui/ConfirmDialog";
import { TableSkeleton } from "@/components/admin/ui/Skeleton";
import { ProductService } from "@/services/product.service";
import { AdminProduct } from "@/types/product";
import { formatPrice, formatPercent } from "@/lib/money";
import { thumbSrc } from "@/lib/productImage";

type SortKey = "name" | "cost" | "price" | "margin" | "marginPct" | "stock";

const LOW_STOCK = 5;
const STATUSES = ["PUBLISHED", "DRAFT", "ARCHIVED"] as const;

// Pill colours mirrored from StatusBadge so the inline <select> reads as the
// same coloured pill it replaces.
const STATUS_STYLES: Record<string, string> = {
  PUBLISHED: "bg-emerald-100 text-emerald-700",
  DRAFT: "bg-amber-100 text-amber-700",
  ARCHIVED: "bg-slate-200 text-slate-600",
};

// Inline status switcher: flip a product between DRAFT / PUBLISHED / ARCHIVED
// straight from the catalog list, no need to open the editor. Calls the
// lightweight PATCH endpoint that only touches status.
function StatusSelect({
  value,
  busy,
  onChange,
}: {
  value: string;
  busy: boolean;
  onChange: (next: string) => void;
}) {
  const cls = STATUS_STYLES[value] ?? "bg-slate-100 text-slate-600";
  return (
    <select
      value={value}
      disabled={busy}
      onChange={(e) => onChange(e.target.value)}
      title="Change status"
      className={`cursor-pointer rounded-full border-0 py-1 pl-3 pr-7 text-xs font-medium outline-none focus:ring-2 focus:ring-blue-400 disabled:cursor-wait disabled:opacity-60 ${cls}`}
    >
      {STATUSES.map((s) => (
        <option key={s} value={s} className="bg-white text-gray-800">
          {s}
        </option>
      ))}
    </select>
  );
}

function StockBadge({ qty }: { qty?: number }) {
  if (typeof qty !== "number")
    return <span className="text-xs text-gray-400">—</span>;
  if (qty <= 0)
    return (
      <span className="rounded-full bg-rose-100 px-2 py-0.5 text-xs font-medium text-rose-700">
        Out of stock
      </span>
    );
  if (qty <= LOW_STOCK)
    return (
      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
        {qty} in stock
      </span>
    );
  return (
    <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
      {qty} in stock
    </span>
  );
}

function SortableTh({
  label,
  col,
  sortKey,
  sortDir,
  onSort,
  align,
}: {
  label: string;
  col: SortKey;
  sortKey: SortKey | null;
  sortDir: "asc" | "desc";
  onSort: (k: SortKey) => void;
  align: "left" | "right";
}) {
  const active = sortKey === col;
  return (
    <th className={`px-5 py-3 ${align === "right" ? "text-right" : "text-left"}`}>
      <button
        onClick={() => onSort(col)}
        className={`inline-flex items-center gap-1 uppercase tracking-wider transition hover:text-gray-700 ${
          active ? "text-gray-800" : ""
        }`}
      >
        {label}
        <ArrowUpDown size={12} className={active ? "opacity-100" : "opacity-30"} />
        {active && <span className="text-[10px]">{sortDir === "asc" ? "▲" : "▼"}</span>}
      </button>
    </th>
  );
}

export default function ProductsPage() {
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");
  const [toDelete, setToDelete] = useState<AdminProduct | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [statusUpdatingId, setStatusUpdatingId] = useState<number | null>(null);
  // Multi-select: ids of products ticked for a bulk action.
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [bulkBusy, setBulkBusy] = useState(false);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  // `null` = no explicit column sort → preserve the server order, which is
  // newest-created first. A column is only sorted once the user clicks it.
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      // Admin endpoint: includes confidential cost + margins.
      const res = await ProductService.getAdminAll(0, 500);
      setProducts(res.content);
    } catch {
      setError("Failed to load products.");
    } finally {
      setLoading(false);
    }
  }, []);

  const toggleSort = (key: SortKey) => {
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(key === "name" ? "asc" : "desc");
    }
  };

  useEffect(() => {
    fetchProducts();
    const msg = sessionStorage.getItem("success");
    if (msg) {
      setSuccess(msg);
      sessionStorage.removeItem("success");
    }
  }, [fetchProducts]);

  // Distinct categories present across the loaded products, sorted by name.
  // Only categories that actually have products appear, which is exactly what
  // you want for filtering the catalog.
  const categoryOptions = useMemo(() => {
    const map = new Map<number, string>();
    for (const p of products) {
      for (const c of p.categories ?? []) {
        if (!map.has(c.id)) map.set(c.id, c.name);
      }
    }
    return [...map.entries()]
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [products]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const rows = products
      .filter((p) => (statusFilter === "ALL" ? true : p.status === statusFilter))
      .filter((p) =>
        categoryFilter === "ALL"
          ? true
          : (p.categories ?? []).some((c) => String(c.id) === categoryFilter)
      )
      .filter((p) => (q ? p.name.toLowerCase().includes(q) : true));

    // No explicit column sort → keep the server order (newest created first).
    if (sortKey === null) {
      return rows;
    }

    const value = (p: AdminProduct): number | string => {
      switch (sortKey) {
        case "cost": return p.cost;
        case "price": return p.price;
        case "margin": return p.grossMargin;
        case "marginPct": return p.grossMarginPercent;
        case "stock": return p.stockQuantity ?? -1;
        default: return p.name.toLowerCase();
      }
    };

    return [...rows].sort((a, b) => {
      const av = value(a);
      const bv = value(b);
      const cmp =
        typeof av === "number" && typeof bv === "number"
          ? av - bv
          : String(av).localeCompare(String(bv));
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [products, query, statusFilter, categoryFilter, sortKey, sortDir]);

  const handleStatusChange = async (product: AdminProduct, next: string) => {
    if (next === product.status) return;
    const prev = product.status;
    setStatusUpdatingId(product.id);
    // Optimistic: flip the row immediately, revert on failure.
    setProducts((rows) =>
      rows.map((r) => (r.id === product.id ? { ...r, status: next } : r))
    );
    try {
      await ProductService.updateStatus(product.id, next);
      setSuccess(`"${product.name}" set to ${next}.`);
      setError(null);
    } catch {
      setProducts((rows) =>
        rows.map((r) => (r.id === product.id ? { ...r, status: prev } : r))
      );
      setError("Failed to update status.");
    } finally {
      setStatusUpdatingId(null);
    }
  };

  const handleDelete = async () => {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await ProductService.delete(toDelete.id);
      setProducts((prev) => prev.filter((p) => p.id !== toDelete.id));
      setToDelete(null);
    } catch {
      setError("Failed to delete product.");
    } finally {
      setDeleting(false);
    }
  };

  // --- Multi-select bulk actions ---------------------------------------------
  // Selection is scoped to the rows currently visible under the active filters,
  // so "select all" and the count never include hidden products.
  const visibleIds = useMemo(() => filtered.map((p) => p.id), [filtered]);
  const selectedVisible = useMemo(
    () => visibleIds.filter((id) => selected.has(id)),
    [visibleIds, selected]
  );
  const allVisibleSelected =
    visibleIds.length > 0 && selectedVisible.length === visibleIds.length;

  const toggleRow = (id: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allVisibleSelected) visibleIds.forEach((id) => next.delete(id));
      else visibleIds.forEach((id) => next.add(id));
      return next;
    });
  };

  const clearSelection = () => setSelected(new Set());

  const handleBulkStatus = async (status: string) => {
    const ids = selectedVisible;
    if (ids.length === 0) return;
    const idSet = new Set(ids);
    setBulkBusy(true);
    const snapshot = products;
    // Optimistic: flip every selected row immediately, revert on failure.
    setProducts((rows) =>
      rows.map((r) => (idSet.has(r.id) ? { ...r, status } : r))
    );
    try {
      await ProductService.updateStatuses(ids, status);
      setSuccess(`${ids.length} product(s) set to ${status}.`);
      setError(null);
      clearSelection();
    } catch {
      setProducts(snapshot);
      setError("Failed to update selected products.");
    } finally {
      setBulkBusy(false);
    }
  };

  const handleBulkDelete = async () => {
    const ids = selectedVisible;
    if (ids.length === 0) return;
    const idSet = new Set(ids);
    setBulkBusy(true);
    try {
      await ProductService.deleteMany(ids);
      setProducts((rows) => rows.filter((r) => !idSet.has(r.id)));
      setSuccess(`${ids.length} product(s) deleted.`);
      setError(null);
      clearSelection();
      setBulkDeleteOpen(false);
    } catch {
      setError("Failed to delete selected products.");
    } finally {
      setBulkBusy(false);
    }
  };

  return (
    <div>
      <PageHeader title="Products" subtitle="Manage your catalog.">
        <Link
          href="/admin-v2/products/new"
          className="inline-flex items-center gap-1.5 rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-black"
        >
          <Plus size={16} /> Add product
        </Link>
      </PageHeader>

      {success && (
        <div className="mb-4 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
          {success}
        </div>
      )}
      {error && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-600">
          {error}
        </div>
      )}

      {/* Filters */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative max-w-sm flex-1">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search products…"
            className="w-full rounded-md border border-gray-300 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 outline-none focus:border-blue-500"
        >
          <option value="ALL">All categories</option>
          {categoryOptions.map((c) => (
            <option key={c.id} value={String(c.id)}>
              {c.name}
            </option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 outline-none focus:border-blue-500"
        >
          <option value="ALL">All statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      {/* Bulk action bar — shown once one or more visible rows are selected. */}
      {selectedVisible.length > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-3 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3">
          <span className="text-sm font-medium text-blue-800">
            {selectedVisible.length} selected
          </span>
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <button
              disabled={bulkBusy}
              onClick={() => handleBulkStatus("PUBLISHED")}
              className="rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-emerald-700 disabled:opacity-60"
            >
              Publish
            </button>
            <button
              disabled={bulkBusy}
              onClick={() => handleBulkStatus("DRAFT")}
              className="rounded-md bg-amber-500 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-amber-600 disabled:opacity-60"
            >
              Draft
            </button>
            <button
              disabled={bulkBusy}
              onClick={() => handleBulkStatus("ARCHIVED")}
              className="rounded-md bg-slate-500 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-slate-600 disabled:opacity-60"
            >
              Archive
            </button>
            <button
              disabled={bulkBusy}
              onClick={() => setBulkDeleteOpen(true)}
              className="inline-flex items-center gap-1 rounded-md bg-rose-600 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-rose-700 disabled:opacity-60"
            >
              <Trash2 size={14} /> Delete
            </button>
            <button
              disabled={bulkBusy}
              onClick={clearSelection}
              className="rounded-md px-3 py-1.5 text-sm font-medium text-gray-600 transition hover:bg-white disabled:opacity-60"
            >
              Clear
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <TableSkeleton />
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-12 text-center">
          <Package className="mx-auto mb-3 text-gray-300" size={40} />
          <p className="text-sm text-gray-500">No products found.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
          <table className="w-full min-w-[880px] text-sm">
            <thead className="bg-gray-50 text-xs uppercase tracking-wider text-gray-500">
              <tr>
                <th className="px-5 py-3 text-left">
                  <input
                    type="checkbox"
                    aria-label="Select all"
                    checked={allVisibleSelected}
                    ref={(el) => {
                      if (el)
                        el.indeterminate =
                          selectedVisible.length > 0 && !allVisibleSelected;
                    }}
                    onChange={toggleAll}
                    className="h-4 w-4 cursor-pointer rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                </th>
                <SortableTh label="Product" col="name" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} align="left" />
                <SortableTh label="Cost" col="cost" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} align="right" />
                <SortableTh label="Selling Price" col="price" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} align="right" />
                <SortableTh label="Margin" col="margin" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} align="right" />
                <SortableTh label="Margin %" col="marginPct" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} align="right" />
                <SortableTh label="Stock" col="stock" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} align="left" />
                <th className="px-5 py-3 text-left">Status</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((p) => {
                const negative = p.grossMargin < 0;
                return (
                <tr
                  key={p.id}
                  className={selected.has(p.id) ? "bg-blue-50/60" : "hover:bg-gray-50"}
                >
                  <td className="px-5 py-3">
                    <input
                      type="checkbox"
                      aria-label={`Select ${p.name}`}
                      checked={selected.has(p.id)}
                      onChange={() => toggleRow(p.id)}
                      className="h-4 w-4 cursor-pointer rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      {p.images?.[0] ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={thumbSrc(p.images[0])}
                          alt={p.name}
                          className="h-20 w-20 shrink-0 rounded-lg border border-gray-100 object-cover"
                        />
                      ) : (
                        <span className="flex h-20 w-20 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-400">
                          <Package size={28} />
                        </span>
                      )}
                      <span className="font-medium text-gray-800">{p.name}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-right text-gray-500">
                    {formatPrice(p.cost)}
                  </td>
                  <td className="px-5 py-3 text-right font-medium text-gray-800">
                    {formatPrice(p.price)}
                  </td>
                  <td className={`px-5 py-3 text-right font-medium ${negative ? "text-rose-600" : "text-emerald-600"}`}>
                    {formatPrice(p.grossMargin)}
                  </td>
                  <td className={`px-5 py-3 text-right ${negative ? "text-rose-600" : "text-emerald-600"}`}>
                    {formatPercent(p.grossMarginPercent)}
                  </td>
                  <td className="px-5 py-3">
                    <StockBadge qty={p.stockQuantity} />
                  </td>
                  <td className="px-5 py-3">
                    <StatusSelect
                      value={p.status}
                      busy={statusUpdatingId === p.id}
                      onChange={(next) => handleStatusChange(p, next)}
                    />
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <Link
                        href={`/admin-v2/products/${p.id}`}
                        className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-sm font-medium text-blue-600 hover:bg-blue-50"
                      >
                        <Pencil size={14} /> Edit
                      </Link>
                      <button
                        onClick={() => setToDelete(p)}
                        className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-sm font-medium text-rose-600 hover:bg-rose-50"
                      >
                        <Trash2 size={14} /> Delete
                      </button>
                    </div>
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <ConfirmDialog
        open={toDelete !== null}
        title="Delete product"
        message={`Delete "${toDelete?.name}"? This action cannot be undone.`}
        confirmLabel="Delete"
        busy={deleting}
        onConfirm={handleDelete}
        onCancel={() => setToDelete(null)}
      />

      <ConfirmDialog
        open={bulkDeleteOpen}
        title="Delete products"
        message={`Delete ${selectedVisible.length} selected product(s)? This action cannot be undone.`}
        confirmLabel="Delete"
        busy={bulkBusy}
        onConfirm={handleBulkDelete}
        onCancel={() => setBulkDeleteOpen(false)}
      />
    </div>
  );
}
