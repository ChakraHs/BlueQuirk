"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import Link from "next/link";
import { Search, Plus, Pencil, Trash2, Package } from "lucide-react";
import PageHeader from "@/components/admin/ui/PageHeader";
import StatusBadge from "@/components/admin/ui/StatusBadge";
import ConfirmDialog from "@/components/admin/ui/ConfirmDialog";
import { TableSkeleton } from "@/components/admin/ui/Skeleton";
import { ProductService } from "@/services/product.service";
import { Product } from "@/types/product";
import { PageResponse } from "@/types/page";
import { formatPrice } from "@/lib/money";
import { thumbSrc } from "@/lib/productImage";

const LOW_STOCK = 5;
const STATUSES = ["PUBLISHED", "DRAFT", "ARCHIVED"] as const;

function StockBadge({ qty }: { qty?: number }) {
  if (typeof qty !== "number")
    return <span className="text-xs text-gray-400">—</span>;
  if (qty <= 0)
    return (
      <span className="rounded-full bg-rose-100 px-2 py-0.5 text-xs font-medium text-rose-700">
        Rupture
      </span>
    );
  if (qty <= LOW_STOCK)
    return (
      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
        {qty} en stock
      </span>
    );
  return (
    <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
      {qty} en stock
    </span>
  );
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [toDelete, setToDelete] = useState<Product | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res: PageResponse<Product> = await ProductService.getAll(0, 500);
      setProducts(res.content);
    } catch {
      setError("Échec du chargement des produits.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProducts();
    const msg = sessionStorage.getItem("success");
    if (msg) {
      setSuccess(msg);
      sessionStorage.removeItem("success");
    }
  }, [fetchProducts]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return products
      .filter((p) => (statusFilter === "ALL" ? true : p.status === statusFilter))
      .filter((p) => (q ? p.name.toLowerCase().includes(q) : true));
  }, [products, query, statusFilter]);

  const handleDelete = async () => {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await ProductService.delete(toDelete.id);
      setProducts((prev) => prev.filter((p) => p.id !== toDelete.id));
      setToDelete(null);
    } catch {
      setError("Échec de la suppression du produit.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div>
      <PageHeader title="Produits" subtitle="Gérez votre catalogue.">
        <Link
          href="/admin-v2/products/new"
          className="inline-flex items-center gap-1.5 rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-black"
        >
          <Plus size={16} /> Ajouter un produit
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
            placeholder="Rechercher un produit…"
            className="w-full rounded-md border border-gray-300 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 outline-none focus:border-blue-500"
        >
          <option value="ALL">Tous les statuts</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <TableSkeleton />
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-12 text-center">
          <Package className="mx-auto mb-3 text-gray-300" size={40} />
          <p className="text-sm text-gray-500">Aucun produit trouvé.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs uppercase tracking-wider text-gray-500">
              <tr>
                <th className="px-5 py-3 text-left">Produit</th>
                <th className="px-5 py-3 text-left">Prix</th>
                <th className="px-5 py-3 text-left">Stock</th>
                <th className="px-5 py-3 text-left">Statut</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      {p.images?.[0] ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={thumbSrc(p.images[0])}
                          alt={p.name}
                          className="h-11 w-11 shrink-0 rounded-lg border border-gray-100 object-cover"
                        />
                      ) : (
                        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-400">
                          <Package size={18} />
                        </span>
                      )}
                      <span className="font-medium text-gray-800">{p.name}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-gray-700">
                    {formatPrice(p.price)}
                  </td>
                  <td className="px-5 py-3">
                    <StockBadge qty={p.stockQuantity} />
                  </td>
                  <td className="px-5 py-3">
                    <StatusBadge status={p.status} kind="product" />
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <Link
                        href={`/admin-v2/products/${p.id}`}
                        className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-sm font-medium text-blue-600 hover:bg-blue-50"
                      >
                        <Pencil size={14} /> Modifier
                      </Link>
                      <button
                        onClick={() => setToDelete(p)}
                        className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-sm font-medium text-rose-600 hover:bg-rose-50"
                      >
                        <Trash2 size={14} /> Supprimer
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
        title="Supprimer le produit"
        message={`Supprimer « ${toDelete?.name} » ? Cette action est irréversible.`}
        confirmLabel="Supprimer"
        busy={deleting}
        onConfirm={handleDelete}
        onCancel={() => setToDelete(null)}
      />
    </div>
  );
}
