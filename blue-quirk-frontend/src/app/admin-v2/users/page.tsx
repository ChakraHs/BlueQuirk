"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Search, Users as UsersIcon, Eye } from "lucide-react";
import PageHeader from "@/components/admin/ui/PageHeader";
import { TableSkeleton } from "@/components/admin/ui/Skeleton";
import {
  CustomerService, customerName, type Customer,
} from "@/services/customer.service";
import { OrderService, type OrderResponse } from "@/services/order.service";
import { formatPrice } from "@/lib/money";

function fmtDate(iso?: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [orders, setOrders] = useState<OrderResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  useEffect(() => {
    (async () => {
      const [c, o] = await Promise.allSettled([
        CustomerService.getAll(),
        OrderService.getAll(),
      ]);
      if (c.status === "fulfilled") setCustomers(c.value);
      else setError("Échec du chargement des clients.");
      if (o.status === "fulfilled") setOrders(o.value);
      setLoading(false);
    })();
  }, []);

  // Map order numbers to customer ids so the search can match by order number.
  const customerIdByOrderNumber = useMemo(() => {
    const map = new Map<string, number>();
    for (const o of orders) {
      if (o.orderNumber && o.customerId) map.set(o.orderNumber.toLowerCase(), o.customerId);
    }
    return map;
  }, [orders]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return customers;
    const matchedCustomerId = customerIdByOrderNumber.get(q);
    return customers.filter((c) =>
      customerName(c).toLowerCase().includes(q) ||
      (c.email || "").toLowerCase().includes(q) ||
      (c.phone || "").toLowerCase().includes(q) ||
      (matchedCustomerId !== undefined && c.id === matchedCustomerId)
    );
  }, [customers, query, customerIdByOrderNumber]);

  const registered = customers.filter((c) => !c.guest).length;
  const guests = customers.length - registered;

  return (
    <div>
      <PageHeader
        title="Clients"
        subtitle="Tous les clients (invités et inscrits) et leur activité d'achat."
      />

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="relative max-w-sm flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Nom, email, téléphone ou n° de commande…"
            className="w-full rounded-md border border-gray-300 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <div className="flex gap-2 text-xs">
          <span className="rounded-full bg-gray-100 px-3 py-1 font-medium text-gray-600">
            {customers.length} clients
          </span>
          <span className="rounded-full bg-blue-50 px-3 py-1 font-medium text-blue-700">
            {registered} inscrits
          </span>
          <span className="rounded-full bg-amber-50 px-3 py-1 font-medium text-amber-700">
            {guests} invités
          </span>
        </div>
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
          <UsersIcon className="mx-auto mb-3 text-gray-300" size={40} />
          <p className="text-sm text-gray-500">Aucun client.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs uppercase tracking-wider text-gray-500">
              <tr>
                <th className="px-5 py-3 text-left">Client</th>
                <th className="px-5 py-3 text-left">Contact</th>
                <th className="px-5 py-3 text-center">Type</th>
                <th className="px-5 py-3 text-center">Commandes</th>
                <th className="px-5 py-3 text-right">Total dépensé</th>
                <th className="px-5 py-3 text-left">Dernière commande</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((c) => {
                const name = customerName(c);
                return (
                  <tr key={c.id} className="hover:bg-gray-50">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-semibold uppercase text-blue-700">
                          {(name || c.email || "?").charAt(0)}
                        </span>
                        <Link href={`/admin-v2/users/${c.id}`} className="font-medium text-gray-800 hover:text-blue-600">
                          {name}
                        </Link>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-gray-600">
                      <div>{c.email}</div>
                      {c.phone && <div className="text-xs text-gray-400">{c.phone}</div>}
                    </td>
                    <td className="px-5 py-3 text-center">
                      <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        c.guest ? "bg-amber-100 text-amber-700" : "bg-blue-100 text-blue-700"
                      }`}>
                        {c.guest ? "Invité" : "Inscrit"}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-center text-gray-700">{c.totalOrders}</td>
                    <td className="px-5 py-3 text-right font-medium text-gray-800">
                      {formatPrice(c.totalSpent)}
                    </td>
                    <td className="px-5 py-3 text-gray-600">{fmtDate(c.lastOrderDate)}</td>
                    <td className="px-5 py-3 text-right">
                      <Link
                        href={`/admin-v2/users/${c.id}`}
                        className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-sm font-medium text-blue-600 hover:bg-blue-50"
                      >
                        <Eye size={14} /> Profil
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
