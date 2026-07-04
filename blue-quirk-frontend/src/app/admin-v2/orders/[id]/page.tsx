"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Phone,
  MapPin,
  Mail,
  StickyNote,
  Trash2,
  Loader2,
  Save,
} from "lucide-react";
import PageHeader from "@/components/admin/ui/PageHeader";
import StatusBadge from "@/components/admin/ui/StatusBadge";
import ConfirmDialog from "@/components/admin/ui/ConfirmDialog";
import CancelOrderDialog from "@/components/admin/CancelOrderDialog";
import { OrderService, type OrderResponse } from "@/services/order.service";
import {
  ORDER_STATUSES, ORDER_STATUS_LABELS, PAYMENT_STATUSES, PAYMENT_STATUS_LABELS,
  type OrderStatus,
} from "@/types/order";
import { formatPrice } from "@/lib/money";

const STATUS_LABELS = ORDER_STATUS_LABELS;

function formatDateTime(iso: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("en-GB", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function OrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = Number(params.id);

  const [order, setOrder] = useState<OrderResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingStatus, setSavingStatus] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Cancellation flow (status → CANCELLED requires a reason).
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  // Fulfillment form (payment status, tracking number, estimated delivery).
  const [paymentStatus, setPaymentStatus] = useState("UNPAID");
  const [trackingNumber, setTrackingNumber] = useState("");
  const [estimatedDelivery, setEstimatedDelivery] = useState("");
  const [savingFulfillment, setSavingFulfillment] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const o = await OrderService.getById(id);
        setOrder(o);
        setPaymentStatus(o.paymentStatus ?? "UNPAID");
        setTrackingNumber(o.trackingNumber ?? "");
        setEstimatedDelivery(o.estimatedDelivery ?? "");
      } catch {
        setError("Order not found.");
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const saveFulfillment = async () => {
    setSavingFulfillment(true);
    setNotice(null);
    setError(null);
    try {
      const updated = await OrderService.updateFulfillment(id, {
        paymentStatus,
        trackingNumber: trackingNumber.trim(),
        estimatedDelivery: estimatedDelivery || undefined,
      });
      setOrder(updated);
      setNotice("Fulfillment details saved.");
    } catch {
      setError("Failed to save fulfillment details.");
    } finally {
      setSavingFulfillment(false);
    }
  };

  const changeStatus = async (status: OrderStatus, reason?: string) => {
    if (!order || order.status === status) return;
    // Cancelling requires a reason — open the dialog instead of changing now.
    if (status === "CANCELLED" && !reason) {
      setCancelOpen(true);
      return;
    }
    setSavingStatus(status);
    setNotice(null);
    try {
      const updated = await OrderService.updateStatus(id, status, reason);
      setOrder(updated);
      setNotice(
        `Status updated: ${STATUS_LABELS[status]}. The customer has been notified by email.`
      );
    } catch {
      setError("Failed to update status.");
    } finally {
      setSavingStatus(null);
    }
  };

  const confirmCancel = async (reason: string) => {
    if (!reason) return;
    setCancelling(true);
    setNotice(null);
    try {
      const updated = await OrderService.updateStatus(id, "CANCELLED", reason);
      setOrder(updated);
      setCancelOpen(false);
      setNotice(
        `Order cancelled (reason: ${reason}). The customer has been notified by email.`
      );
    } catch {
      setError("Failed to cancel the order.");
    } finally {
      setCancelling(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await OrderService.delete(id);
      router.push("/admin-v2/orders");
    } catch {
      setError("Failed to delete.");
      setDeleting(false);
      setConfirmDelete(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center text-gray-400">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading…
      </div>
    );
  }

  if (error && !order) {
    return (
      <div>
        <Link
          href="/admin-v2/orders"
          className="mb-4 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800"
        >
          <ArrowLeft size={16} /> Back to orders
        </Link>
        <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-600">
          {error}
        </div>
      </div>
    );
  }

  if (!order) return null;

  return (
    <div>
      <Link
        href="/admin-v2/orders"
        className="mb-4 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800"
      >
        <ArrowLeft size={16} /> Back to orders
      </Link>

      <PageHeader
        title={order.orderNumber || `Order #${order.id}`}
        subtitle={formatDateTime(order.orderDate)}
      >
        <StatusBadge status={order.status} />
        {order.paymentStatus && <StatusBadge status={order.paymentStatus} kind="payment" />}
        <button
          onClick={() => setConfirmDelete(true)}
          className="inline-flex items-center gap-1.5 rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-rose-600 transition hover:bg-rose-50"
        >
          <Trash2 size={15} /> Delete
        </button>
      </PageHeader>

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

      {order.status === "CANCELLED" && order.cancellationReason && (
        <div className="mb-4 rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
          <span className="font-semibold">Order cancelled</span> — reason:{" "}
          {order.cancellationReason}
        </div>
      )}

      {/* Status workflow */}
      <div className="mb-6 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="mb-3 text-sm font-semibold text-gray-700">
          Advance the status
        </h2>
        <div className="flex flex-wrap gap-2">
          {ORDER_STATUSES.map((s) => {
            const active = order.status === s;
            const isCancel = s === "CANCELLED";
            return (
              <button
                key={s}
                onClick={() => changeStatus(s)}
                disabled={savingStatus !== null || active}
                className={`inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition disabled:cursor-not-allowed ${
                  active
                    ? isCancel
                      ? "bg-rose-600 text-white"
                      : "bg-blue-600 text-white"
                    : isCancel
                    ? "bg-rose-50 text-rose-700 ring-1 ring-rose-200 hover:bg-rose-100 disabled:opacity-60"
                    : "bg-gray-50 text-gray-700 ring-1 ring-gray-200 hover:bg-gray-100 disabled:opacity-60"
                }`}
              >
                {savingStatus === s && (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                )}
                {STATUS_LABELS[s]}
              </button>
            );
          })}
        </div>
        <p className="mt-3 text-xs text-gray-400">
          The customer receives an automatic email on every status change.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Items */}
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm lg:col-span-2">
          <div className="border-b border-gray-100 px-5 py-4">
            <h2 className="text-sm font-semibold text-gray-700">Items</h2>
          </div>
          <div className="divide-y divide-gray-100">
            {order.items.map((it, i) => (
              <div key={i} className="flex items-center gap-4 px-5 py-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={it.image || "/placeholder.png"}
                  alt={it.name}
                  className="h-14 w-14 shrink-0 rounded-lg border border-gray-100 object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.visibility = "hidden";
                  }}
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-gray-800">{it.name}</p>
                  {it.variant && (
                    <p className="text-xs text-gray-400">{it.variant}</p>
                  )}
                </div>
                <div className="text-right text-sm">
                  <p className="text-gray-500">
                    {it.quantity} × {formatPrice(it.unitPrice)}
                  </p>
                  <p className="font-semibold text-gray-800">
                    {formatPrice(it.lineTotal)}
                  </p>
                </div>
              </div>
            ))}
          </div>
          <div className="space-y-1 border-t border-gray-100 px-5 py-4 text-sm">
            <div className="flex justify-between text-gray-500">
              <span>Subtotal</span>
              <span>{formatPrice(order.subtotal)}</span>
            </div>
            <div className="flex justify-between text-gray-500">
              <span>Shipping</span>
              <span>
                {order.shippingFee === 0
                  ? "Free"
                  : formatPrice(order.shippingFee)}
              </span>
            </div>
            <div className="flex justify-between pt-1 text-base font-bold text-gray-900">
              <span>Total</span>
              <span>{formatPrice(order.total)}</span>
            </div>
          </div>
        </div>

        {/* Customer / shipping */}
        <div className="space-y-6">
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <h2 className="mb-3 text-sm font-semibold text-gray-700">Customer</h2>
            <p className="font-medium text-gray-800">{order.customerName}</p>
            <div className="mt-3 space-y-2 text-sm text-gray-600">
              <p className="flex items-center gap-2">
                <Phone size={15} className="text-gray-400" /> {order.phone}
              </p>
              {order.email && (
                <p className="flex items-center gap-2">
                  <Mail size={15} className="text-gray-400" /> {order.email}
                </p>
              )}
              <p className="flex items-start gap-2">
                <MapPin size={15} className="mt-0.5 shrink-0 text-gray-400" />
                <span>
                  {order.address}, {order.city}
                </span>
              </p>
              {order.note && (
                <p className="flex items-start gap-2">
                  <StickyNote
                    size={15}
                    className="mt-0.5 shrink-0 text-gray-400"
                  />
                  <span>{order.note}</span>
                </p>
              )}
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <h2 className="mb-3 text-sm font-semibold text-gray-700">
              Payment & shipping
            </h2>
            <p className="mb-4 text-sm text-gray-600">
              {order.paymentMethod === "COD"
                ? "Cash on delivery (COD)"
                : order.paymentMethod}
            </p>

            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-500">
                  Payment status
                </label>
                <select
                  value={paymentStatus}
                  onChange={(e) => setPaymentStatus(e.target.value)}
                  className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                >
                  {PAYMENT_STATUSES.map((p) => (
                    <option key={p} value={p}>{PAYMENT_STATUS_LABELS[p]}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-500">
                  Tracking number
                </label>
                <input
                  value={trackingNumber}
                  onChange={(e) => setTrackingNumber(e.target.value)}
                  placeholder="ex. MA123456789"
                  className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-500">
                  Estimated delivery
                </label>
                <input
                  type="date"
                  value={estimatedDelivery}
                  onChange={(e) => setEstimatedDelivery(e.target.value)}
                  className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <button
                onClick={saveFulfillment}
                disabled={savingFulfillment}
                className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-gray-900 px-3 py-2 text-sm font-medium text-white transition hover:bg-gray-800 disabled:opacity-60"
              >
                {savingFulfillment ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
                Save
              </button>
            </div>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        title="Delete order"
        message={`Permanently delete order #${order.id}? This action cannot be undone.`}
        confirmLabel="Delete"
        busy={deleting}
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(false)}
      />

      {/* Cancellation dialog — pick a reason, customer is emailed */}
      {cancelOpen && (
        <CancelOrderDialog
          busy={cancelling}
          orderLabel={order.orderNumber || `#${order.id}`}
          onConfirm={confirmCancel}
          onClose={() => setCancelOpen(false)}
        />
      )}
    </div>
  );
}
