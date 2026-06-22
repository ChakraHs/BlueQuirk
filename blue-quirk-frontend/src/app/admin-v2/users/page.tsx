"use client";

import { useEffect, useMemo, useState } from "react";
import { Search, Users as UsersIcon, Trash2 } from "lucide-react";
import PageHeader from "@/components/admin/ui/PageHeader";
import ConfirmDialog from "@/components/admin/ui/ConfirmDialog";
import { TableSkeleton } from "@/components/admin/ui/Skeleton";
import { IdentityService, type Profile } from "@/services/identity.service";
import { OrderService, type OrderResponse } from "@/services/order.service";
import { formatPrice } from "@/lib/money";

function fullName(u: Profile): string {
  return `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim() || u.username || "—";
}

export default function CustomersPage() {
  const [users, setUsers] = useState<Profile[]>([]);
  const [orders, setOrders] = useState<OrderResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [toDelete, setToDelete] = useState<Profile | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    (async () => {
      const [u, o] = await Promise.allSettled([
        IdentityService.getAllUsers(),
        OrderService.getAll(),
      ]);
      if (u.status === "fulfilled") setUsers(u.value);
      else setError("Échec du chargement des clients.");
      if (o.status === "fulfilled") setOrders(o.value);
      setLoading(false);
    })();
  }, []);

  // Aggregate order count + total spent per customer email.
  const statsByEmail = useMemo(() => {
    const map = new Map<string, { count: number; spent: number }>();
    for (const o of orders) {
      if (!o.email) continue;
      const key = o.email.toLowerCase();
      const cur = map.get(key) || { count: 0, spent: 0 };
      cur.count += 1;
      if (o.status !== "CANCELLED") cur.spent += o.total || 0;
      map.set(key, cur);
    }
    return map;
  }, [orders]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return users.filter((u) =>
      q
        ? fullName(u).toLowerCase().includes(q) ||
          (u.email || "").toLowerCase().includes(q) ||
          (u.username || "").toLowerCase().includes(q)
        : true
    );
  }, [users, query]);

  const handleDelete = async () => {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await IdentityService.deleteUser(toDelete.id);
      setUsers((prev) => prev.filter((u) => u.id !== toDelete.id));
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
        title="Clients"
        subtitle="Les comptes clients (Keycloak) et leur activité d'achat."
      />

      <div className="relative mb-4 max-w-sm">
        <Search
          size={16}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
        />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Rechercher un client…"
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
          <UsersIcon className="mx-auto mb-3 text-gray-300" size={40} />
          <p className="text-sm text-gray-500">Aucun client.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs uppercase tracking-wider text-gray-500">
              <tr>
                <th className="px-5 py-3 text-left">Client</th>
                <th className="px-5 py-3 text-left">Email</th>
                <th className="px-5 py-3 text-center">Commandes</th>
                <th className="px-5 py-3 text-right">Total dépensé</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((u) => {
                const s = u.email
                  ? statsByEmail.get(u.email.toLowerCase())
                  : undefined;
                const name = fullName(u);
                return (
                  <tr key={u.id} className="hover:bg-gray-50">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-semibold uppercase text-blue-700">
                          {(name || u.email || "?").charAt(0)}
                        </span>
                        <div>
                          <div className="font-medium text-gray-800">{name}</div>
                          <div className="text-xs text-gray-400">
                            @{u.username}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-gray-600">{u.email}</td>
                    <td className="px-5 py-3 text-center text-gray-700">
                      {s?.count ?? 0}
                    </td>
                    <td className="px-5 py-3 text-right font-medium text-gray-800">
                      {formatPrice(s?.spent ?? 0)}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <button
                        onClick={() => setToDelete(u)}
                        className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-sm font-medium text-rose-600 hover:bg-rose-50"
                      >
                        <Trash2 size={14} /> Supprimer
                      </button>
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
        title="Supprimer le client"
        message={`Supprimer le compte « ${
          toDelete ? fullName(toDelete) : ""
        } » de Keycloak ? Cette action est irréversible.`}
        confirmLabel="Supprimer"
        busy={deleting}
        onConfirm={handleDelete}
        onCancel={() => setToDelete(null)}
      />
    </div>
  );
}
