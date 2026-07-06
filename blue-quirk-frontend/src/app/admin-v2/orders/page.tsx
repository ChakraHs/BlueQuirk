"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Search, ShoppingBag, Eye, XCircle, Loader2 } from "lucide-react";
import PageHeader from "@/components/admin/ui/PageHeader";
import StatusBadge from "@/components/admin/ui/StatusBadge";
import { TableSkeleton } from "@/components/admin/ui/Skeleton";
import CancelOrderDialog from "@/components/admin/CancelOrderDialog";
import { OrderService, type OrderResponse } from "@/services/order.service";
import { ORDER_STATUSES, ORDER_STATUS_LABELS, type OrderStatus } from "@/types/order";
import { formatPrice } from "@/lib/money";

// Statuses offered in the quick inline dropdown (cancellation is a separate
// button so it can collect a reason).
const PROGRESS_STATUSES = ORDER_STATUSES.filter((s) => s !== "CANCELLED");

const TAB_LABELS: Record<string, string> = { ALL: "All", ...ORDER_STATUS_LABELS };

function formatDate(iso: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-GB", {
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
  const [busyId, setBusyId] = useState<number | null>(null);
  const [cancelTarget, setCancelTarget] = useState<OrderResponse | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        setOrders(await OrderService.getAll());
      } catch {
        setError("Unable to load orders.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const patchOrder = (updated: OrderResponse) =>
    setOrders((prev) => prev.map((o) => (o.id === updated.id ? updated : o)));

  const changeStatus = async (order: OrderResponse, status: string) => {
    if (order.status === status) return;
    setBusyId(order.id);
    setNotice(null);
    setError(null);
    try {
      patchOrder(await OrderService.updateStatus(order.id, status));
      setNotice(
        `Order ${order.orderNumber || `#${order.id}`}: status "${ORDER_STATUS_LABELS[status]}". Customer notified by email.`
      );
    } catch {
      setError("Failed to update status.");
    } finally {
      setBusyId(null);
    }
  };

  const confirmCancel = async (reason: string) => {
    if (!cancelTarget) return;
    setCancelling(true);
    setNotice(null);
    setError(null);
    try {
      patchOrder(await OrderService.updateStatus(cancelTarget.id, "CANCELLED", reason));
      setNotice(
        `Order ${cancelTarget.orderNumber || `#${cancelTarget.id}`} cancelled (reason: ${reason}). Customer notified by email.`
      );
      setCancelTarget(null);
    } catch {
      setError("Failed to cancel the order.");
    } finally {
      setCancelling(false);
    }
  };

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
            String(o.id).includes(q) ||
            (o.orderNumber || "").toLowerCase().includes(q) ||
            (o.email || "").toLowerCase().includes(q)
          : true
      )
      .sort((a, b) => (b.orderDate || "").localeCompare(a.orderDate || ""));
  }, [orders, tab, query]);

  return (
    <div>
      <PageHeader
        title="Orders"
        subtitle="Manage the order lifecycle (cash on delivery)."
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
          placeholder="Search by name, phone, number…"
          className="w-full rounded-md border border-gray-300 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
        />
      </div>

      {notice && (
        <div className="mb-4 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
          {notice}
        </div>
      )}
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
          <p className="text-sm text-gray-500">No orders found.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="bg-gray-50 text-xs uppercase tracking-wider text-gray-500">
              <tr>
                <th className="px-5 py-3 text-left">No.</th>
                <th className="px-5 py-3 text-left">Date</th>
                <th className="px-5 py-3 text-left">Customer</th>
                <th className="px-5 py-3 text-left">City</th>
                <th className="px-5 py-3 text-center">Items</th>
                <th className="px-5 py-3 text-left">Status</th>
                <th className="px-5 py-3 text-right">Total</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((o) => (
                <tr key={o.id} className="hover:bg-gray-50">
                  <td className="px-5 py-3">
                    <Link
                      href={`/admin-v2/orders/${o.id}`}
                      className="font-mono text-xs font-semibold text-gray-800 hover:text-blue-600"
                    >
                      {o.orderNumber || `#${o.id}`}
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
                  <td className="px-5 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <select
                        value={o.status}
                        disabled={busyId === o.id || o.status === "CANCELLED"}
                        onChange={(e) => changeStatus(o, e.target.value)}
                        title="Change status"
                        className="rounded-md border border-gray-300 bg-white px-2 py-1.5 text-xs outline-none focus:border-blue-500 disabled:opacity-60"
                      >
                        {o.status === "CANCELLED" && (
                          <option value="CANCELLED">
                            {ORDER_STATUS_LABELS.CANCELLED}
                          </option>
                        )}
                        {PROGRESS_STATUSES.map((s) => (
                          <option key={s} value={s}>
                            {ORDER_STATUS_LABELS[s]}
                          </option>
                        ))}
                      </select>
                      <button
                        onClick={() => setCancelTarget(o)}
                        disabled={busyId === o.id || o.status === "CANCELLED"}
                        title="Cancel order"
                        className="inline-flex items-center gap-1 rounded-md border border-rose-200 px-2 py-1.5 text-xs font-medium text-rose-600 hover:bg-rose-50 disabled:opacity-40"
                      >
                        <XCircle size={13} /> Cancel
                      </button>
                      <Link
                        href={`/admin-v2/orders/${o.id}`}
                        title="View details"
                        className="inline-flex items-center gap-1 rounded-md border border-gray-300 px-2 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
                      >
                        <Eye size={13} /> View
                      </Link>
                      {busyId === o.id && (
                        <Loader2 size={14} className="animate-spin text-gray-400" />
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {cancelTarget && (
        <CancelOrderDialog
          busy={cancelling}
          orderLabel={cancelTarget.orderNumber || `#${cancelTarget.id}`}
          onConfirm={confirmCancel}
          onClose={() => setCancelTarget(null)}
        />
      )}
    </div>
  );
}
