"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Search, ShoppingBag } from "lucide-react";
import PageHeader from "@/components/admin/ui/PageHeader";
import StatusBadge from "@/components/admin/ui/StatusBadge";
import { TableSkeleton } from "@/components/admin/ui/Skeleton";
import { OrderService, type OrderResponse } from "@/services/order.service";
import { ORDER_STATUSES, type OrderStatus } from "@/types/order";
import { formatPrice } from "@/lib/money";

const TAB_LABELS: Record<string, string> = {
  ALL: "Toutes",
  PENDING: "En attente",
  CONFIRMED: "Confirmées",
  SHIPPED: "Expédiées",
  DELIVERED: "Livrées",
  CANCELLED: "Annulées",
};

function formatDate(iso: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<OrderResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<"ALL" | OrderStatus>("ALL");
  const [query, setQuery] = useState("");

  useEffect(() => {
    (async () => {
      try {
        setOrders(await OrderService.getAll());
      } catch {
        setError("Impossible de charger les commandes.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const counts = useMemo(() => {
    const c: Record<string, number> = { ALL: orders.length };
    for (const s of ORDER_STATUSES)
      c[s] = orders.filter((o) => o.status === s).length;
    return c;
  }, [orders]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return orders
      .filter((o) => (tab === "ALL" ? true : o.status === tab))
      .filter((o) =>
        q
          ? o.customerName.toLowerCase().includes(q) ||
            o.phone.includes(q) ||
            String(o.id).includes(q)
          : true
      )
      .sort((a, b) => (b.orderDate || "").localeCompare(a.orderDate || ""));
  }, [orders, tab, query]);

  return (
    <div>
      <PageHeader
        title="Commandes"
        subtitle="Gérez le cycle de vie des commandes (paiement à la livraison)."
      />

      {/* Tabs */}
      <div className="mb-4 flex flex-wrap gap-2">
        {(["ALL", ...ORDER_STATUSES] as const).map((s) => (
          <button
            key={s}
            onClick={() => setTab(s)}
            className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${
              tab === s
                ? "bg-gray-900 text-white"
                : "bg-white text-gray-600 ring-1 ring-gray-200 hover:bg-gray-50"
            }`}
          >
            {TAB_LABELS[s]}
            <span
              className={`ml-2 rounded-full px-1.5 text-xs ${
                tab === s ? "bg-white/20" : "bg-gray-100 text-gray-500"
              }`}
            >
              {counts[s] ?? 0}
            </span>
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="mb-4 relative max-w-sm">
        <Search
          size={16}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
        />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Rechercher par nom, téléphone, n°…"
          className="w-full rounded-md border border-gray-300 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
        />
      </div>

      {error && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-600">
          {error}
        </div>
      )}

      {loading ? (
        <TableSkeleton />
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-12 text-center">
          <ShoppingBag className="mx-auto mb-3 text-gray-300" size={40} />
          <p className="text-sm text-gray-500">Aucune commande trouvée.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs uppercase tracking-wider text-gray-500">
              <tr>
                <th className="px-5 py-3 text-left">N°</th>
                <th className="px-5 py-3 text-left">Date</th>
                <th className="px-5 py-3 text-left">Client</th>
                <th className="px-5 py-3 text-left">Ville</th>
                <th className="px-5 py-3 text-center">Articles</th>
                <th className="px-5 py-3 text-left">Statut</th>
                <th className="px-5 py-3 text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((o) => (
                <tr key={o.id} className="hover:bg-gray-50">
                  <td className="px-5 py-3">
                    <Link
                      href={`/admin-v2/orders/${o.id}`}
                      className="font-semibold text-gray-800 hover:text-blue-600"
                    >
                      #{o.id}
                    </Link>
                  </td>
                  <td className="px-5 py-3 text-gray-500">
                    {formatDate(o.orderDate)}
                  </td>
                  <td className="px-5 py-3">
                    <div className="font-medium text-gray-800">
                      {o.customerName}
                    </div>
                    <div className="text-xs text-gray-400">{o.phone}</div>
                  </td>
                  <td className="px-5 py-3 text-gray-600">{o.city}</td>
                  <td className="px-5 py-3 text-center text-gray-600">
                    {o.items.reduce((n, it) => n + it.quantity, 0)}
                  </td>
                  <td className="px-5 py-3">
                    <StatusBadge status={o.status} />
                  </td>
                  <td className="px-5 py-3 text-right font-semibold text-gray-800">
                    {formatPrice(o.total)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
