"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft, Mail, Phone, MapPin, ShoppingBag, Wallet, Calendar, User as UserIcon,
} from "lucide-react";
import StatusBadge from "@/components/admin/ui/StatusBadge";
import StatCard from "@/components/admin/ui/StatCard";
import { TableSkeleton } from "@/components/admin/ui/Skeleton";
import {
  CustomerService, customerName, type CustomerDetail,
} from "@/services/customer.service";
import { formatPrice } from "@/lib/money";

function fmtDate(iso?: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
}

export default function CustomerProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [detail, setDetail] = useState<CustomerDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        setDetail(await CustomerService.getById(Number(id)));
      } catch {
        setError("Client introuvable.");
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  if (loading) {
    return (
      <div>
        <Link href="/admin-v2/users" className="mb-4 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
          <ArrowLeft size={16} /> Clients
        </Link>
        <TableSkeleton />
      </div>
    );
  }

  if (error || !detail) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-12 text-center">
        <p className="text-sm text-gray-500">{error || "Client introuvable."}</p>
        <Link href="/admin-v2/users" className="mt-4 inline-block text-sm font-medium text-blue-600">
          Retour aux clients
        </Link>
      </div>
    );
  }

  const c = detail.customer;
  const name = customerName(c);

  return (
    <div>
      <Link href="/admin-v2/users" className="mb-4 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
        <ArrowLeft size={16} /> Clients
      </Link>

      <div className="mb-6 flex flex-wrap items-center gap-4">
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-blue-100 text-xl font-bold uppercase text-blue-700">
          {(name || c.email || "?").charAt(0)}
        </span>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-gray-900">{name}</h1>
            <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
              c.guest ? "bg-amber-100 text-amber-700" : "bg-blue-100 text-blue-700"
            }`}>
              {c.guest ? "Invité" : "Inscrit"}
            </span>
          </div>
          <p className="text-sm text-gray-500">Client depuis {fmtDate(c.createdAt)}</p>
        </div>
      </div>

      {/* KPIs */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Commandes" value={c.totalOrders} icon={ShoppingBag} />
        <StatCard label="Total dépensé" value={formatPrice(c.totalSpent)} icon={Wallet} accent="green" />
        <StatCard label="Première commande" value={fmtDate(c.firstOrderDate)} icon={Calendar} accent="violet" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[300px_1fr]">
        {/* Contact / info card */}
        <div className="h-fit rounded-xl border border-gray-200 bg-white p-5">
          <h2 className="mb-4 flex items-center gap-2 text-sm font-bold text-gray-900">
            <UserIcon size={16} /> Coordonnées
          </h2>
          <ul className="space-y-3 text-sm">
            <li className="flex items-start gap-2.5">
              <Mail size={16} className="mt-0.5 text-gray-400" />
              <span className="break-all text-gray-700">{c.email}</span>
            </li>
            {c.phone && (
              <li className="flex items-start gap-2.5">
                <Phone size={16} className="mt-0.5 text-gray-400" />
                <span className="text-gray-700">{c.phone}</span>
              </li>
            )}
            {(detail.address || c.city) && (
              <li className="flex items-start gap-2.5">
                <MapPin size={16} className="mt-0.5 text-gray-400" />
                <span className="text-gray-700">
                  {[detail.address, c.city, detail.postalCode].filter(Boolean).join(", ")}
                </span>
              </li>
            )}
          </ul>
        </div>

        {/* Order history */}
        <div>
          <h2 className="mb-3 text-sm font-bold text-gray-900">Historique des commandes</h2>
          {detail.orders.length === 0 ? (
            <div className="rounded-xl border border-gray-200 bg-white p-10 text-center text-sm text-gray-500">
              Aucune commande.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-xs uppercase tracking-wider text-gray-500">
                  <tr>
                    <th className="px-4 py-3 text-left">Commande</th>
                    <th className="px-4 py-3 text-left">Date</th>
                    <th className="px-4 py-3 text-center">Articles</th>
                    <th className="px-4 py-3 text-center">Statut</th>
                    <th className="px-4 py-3 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {detail.orders.map((o) => (
                    <tr key={o.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <Link href={`/admin-v2/orders/${o.id}`} className="font-mono text-xs font-medium text-blue-600 hover:underline">
                          {o.orderNumber || `#${o.id}`}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{fmtDate(o.orderDate)}</td>
                      <td className="px-4 py-3 text-center text-gray-700">
                        {o.items.reduce((s, it) => s + it.quantity, 0)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <StatusBadge status={o.status} kind="order" />
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-gray-800">
                        {formatPrice(o.total)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
