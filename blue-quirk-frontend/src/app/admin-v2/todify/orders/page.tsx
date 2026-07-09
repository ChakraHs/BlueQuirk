"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Truck, RefreshCw, Send } from "lucide-react";
import PageHeader from "@/components/admin/ui/PageHeader";
import { TableSkeleton } from "@/components/admin/ui/Skeleton";
import { TodifyService } from "@/services/todify.service";
import type { OrderResponse } from "@/services/order.service";

const SYNC_BADGE: Record<string, string> = {
  SENT: "bg-green-100 text-green-700",
  PENDING: "bg-amber-100 text-amber-700",
  RETRYING: "bg-amber-100 text-amber-700",
  FAILED: "bg-red-100 text-red-700",
  NOT_APPLICABLE: "bg-gray-100 text-gray-500",
};

export default function TodifyOrdersPage() {
  const [orders, setOrders] = useState<OrderResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<number | null>(null);

  async function load() {
    setLoading(true);
    try {
      setOrders(await TodifyService.orders());
    } catch {
      setError("Unable to load orders.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  // Only orders that are relevant to Todify (anything not purely local),
  // newest first (most recent order id / date at the top).
  const todifyOrders = useMemo(
    () =>
      orders
        .filter((o) => o.todifySyncState && o.todifySyncState !== "NOT_APPLICABLE")
        .sort((a, b) => b.id - a.id),
    [orders]
  );

  function patch(updated: OrderResponse) {
    setOrders((prev) => prev.map((o) => (o.id === updated.id ? updated : o)));
  }

  async function sync(id: number) {
    setBusy(id);
    try {
      patch(await TodifyService.syncOrder(id));
    } finally {
      setBusy(null);
    }
  }

  async function refresh(id: number) {
    setBusy(id);
    try {
      patch(await TodifyService.refreshOrder(id));
    } finally {
      setBusy(null);
    }
  }

  return (
    <div>
      <PageHeader
        title="Todify Orders"
        subtitle="Track order synchronization with Todify (fulfillment)."
      />

      <div className="mb-4">
        <button
          onClick={load}
          className="inline-flex items-center gap-2 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          <RefreshCw size={15} /> Refresh
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-600">
          {error}
        </div>
      )}

      {loading ? (
        <TableSkeleton />
      ) : todifyOrders.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-12 text-center">
          <Truck className="mx-auto mb-3 text-gray-300" size={40} />
          <p className="text-sm text-gray-500">
            No Todify-linked orders yet.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs uppercase tracking-wider text-gray-500">
              <tr>
                <th className="px-4 py-3 text-left">Order</th>
                <th className="px-4 py-3 text-left">Todify ID</th>
                <th className="px-4 py-3 text-left">Local status</th>
                <th className="px-4 py-3 text-left">Todify status</th>
                <th className="px-4 py-3 text-left">Sync</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {todifyOrders.map((o) => (
                <tr key={o.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin-v2/orders/${o.id}`}
                      className="font-mono text-xs font-semibold text-gray-800 hover:text-blue-600"
                    >
                      {o.orderNumber || `#${o.id}`}
                    </Link>
                    <div className="text-xs text-gray-400">{o.customerName}</div>
                  </td>
                  <td className="px-4 py-3">
                    {o.todifyReferenceCode || o.todifyOrderId ? (
                      <div>
                        <div className="font-mono text-xs text-gray-700">
                          {o.todifyReferenceCode || "—"}
                        </div>
                        <div className="font-mono text-[11px] text-gray-400">
                          {o.todifyOrderId}
                        </div>
                      </div>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-700">{o.status}</td>
                  <td className="px-4 py-3 text-gray-700">{o.todifyStatus || "—"}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        SYNC_BADGE[o.todifySyncState || "NOT_APPLICABLE"] ||
                        "bg-gray-100 text-gray-500"
                      }`}
                    >
                      {o.todifySyncState}
                    </span>
                    {o.todifySyncState === "FAILED" && o.todifyErrorMessage && (
                      <div
                        className="mt-1 max-w-[220px] truncate text-[11px] text-red-500"
                        title={o.todifyErrorMessage}
                      >
                        {o.todifyErrorMessage}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        disabled={busy === o.id}
                        onClick={() => sync(o.id)}
                        className="inline-flex items-center gap-1 rounded-md bg-blue-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                        title="Resend to Todify"
                      >
                        <Send size={13} /> Sync
                      </button>
                      <button
                        disabled={busy === o.id || !o.todifyOrderId}
                        onClick={() => refresh(o.id)}
                        className="inline-flex items-center gap-1 rounded-md border border-gray-300 px-2.5 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40"
                        title="Refresh status from Todify"
                      >
                        <RefreshCw size={13} /> Refresh
                      </button>
                    </div>
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
