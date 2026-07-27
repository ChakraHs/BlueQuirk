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
  RefreshCw,
  ScrollText,
  AlertTriangle,
} from "lucide-react";
import PageHeader from "@/components/admin/ui/PageHeader";
import StatusBadge from "@/components/admin/ui/StatusBadge";
import ConfirmDialog from "@/components/admin/ui/ConfirmDialog";
import CancelOrderDialog from "@/components/admin/CancelOrderDialog";
import {
  OrderService,
  type OrderResponse,
  type OrderAuditLog,
  type TodifySyncLog,
} from "@/services/order.service";
import type { OrderFinancials } from "@/types/finance";
import {
  ORDER_STATUSES, ORDER_STATUS_LABELS, PAYMENT_STATUSES, PAYMENT_STATUS_LABELS,
  type OrderStatus,
} from "@/types/order";
import { formatPrice, formatPercent } from "@/lib/money";

const STATUS_LABELS = ORDER_STATUS_LABELS;

// Human labels for the order audit-log actions.
const ACTION_LABELS: Record<string, string> = {
  CANCELLED: "Order cancelled",
  TODIFY_CANCEL_REQUESTED: "Todify cancellation requested",
  TODIFY_CANCEL_CONFIRMED: "Todify cancellation confirmed",
  TODIFY_CANCEL_FAILED: "Todify cancellation failed",
  TODIFY_CANCEL_RETRIED: "Todify cancellation retried",
  DELETED: "Order deleted",
};

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
  const [financials, setFinancials] = useState<OrderFinancials | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingStatus, setSavingStatus] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Todify cancellation retry + lifecycle audit / sync logs.
  const [retrying, setRetrying] = useState(false);
  const [auditLogs, setAuditLogs] = useState<OrderAuditLog[]>([]);
  const [todifyLogs, setTodifyLogs] = useState<TodifySyncLog[] | null>(null);
  const [loadingLogs, setLoadingLogs] = useState(false);

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
        const [o, fin, audit] = await Promise.all([
          OrderService.getById(id),
          OrderService.getFinancials(id).catch(() => null),
          OrderService.getAudit(id).catch(() => []),
        ]);
        setOrder(o);
        setFinancials(fin);
        setAuditLogs(audit);
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

  const refreshAudit = () => OrderService.getAudit(id).then(setAuditLogs).catch(() => {});

  const retryTodifyCancel = async () => {
    setRetrying(true);
    setNotice(null);
    setError(null);
    try {
      const updated = await OrderService.retryTodifyCancel(id);
      setOrder(updated);
      await refreshAudit();
      setNotice(
        updated.todifySyncState === "CANCELLED"
          ? "Todify cancellation synchronized."
          : "Cancellation re-sent to Todify. It is still pending — you can retry again."
      );
    } catch (e) {
      setError(
        (e as { response?: { data?: { message?: string } } })?.response?.data?.message ||
          "Failed to retry the Todify cancellation."
      );
    } finally {
      setRetrying(false);
    }
  };

  const loadTodifyLogs = async () => {
    setLoadingLogs(true);
    try {
      setTodifyLogs(await OrderService.getTodifyLogs(id));
    } catch {
      setTodifyLogs([]);
    } finally {
      setLoadingLogs(false);
    }
  };

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
    } catch (e) {
      // Surface the backend guard (e.g. Todify cancellation still pending).
      setError(
        (e as { response?: { data?: { message?: string } } })?.response?.data?.message ||
          "Failed to delete the order."
      );
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
        {/* Permanent delete is only available for cancelled orders. */}
        {order.status === "CANCELLED" && (
          <button
            onClick={() => setConfirmDelete(true)}
            className="inline-flex items-center gap-1.5 rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-rose-600 transition hover:bg-rose-50"
          >
            <Trash2 size={15} /> Delete permanently
          </button>
        )}
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

      {order.status === "CANCELLED" && (
        <div className="mb-4 rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
          <span className="font-semibold">Order cancelled</span>
          {order.cancellationReason && <> — reason: {order.cancellationReason}</>}
          <div className="mt-1 text-xs text-rose-600/80">
            {order.cancelledBy && <>By {order.cancelledBy}</>}
            {order.cancelledAt && <> · {formatDateTime(order.cancelledAt)}</>}
          </div>
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

          {/* Profit & cost — admin only (confidential) */}
          {financials && (
            <div className="border-t border-gray-100 px-5 py-4">
              <div className="mb-2 flex items-center gap-2">
                <h3 className="text-sm font-semibold text-gray-700">
                  Profit &amp; margin
                </h3>
                <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-gray-500">
                  Admin only
                </span>
              </div>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between text-gray-500">
                  <span>Products total</span>
                  <span>{formatPrice(financials.sellingTotal)}</span>
                </div>
                <div className="flex justify-between text-gray-500">
                  <span>Cost total</span>
                  <span>−{formatPrice(financials.costTotal)}</span>
                </div>
                <div className="flex justify-between text-gray-500">
                  <span>Discount</span>
                  <span>{formatPrice(financials.discount)}</span>
                </div>
                <div className="flex justify-between text-gray-500">
                  <span>Shipping</span>
                  <span>
                    {financials.shipping === 0 ? "Free" : formatPrice(financials.shipping)}
                  </span>
                </div>
                <div className="flex justify-between text-gray-700">
                  <span>Final total (paid)</span>
                  <span>{formatPrice(financials.finalTotal)}</span>
                </div>
                <div className="flex justify-between text-gray-500">
                  <span>
                    Real shipping cost
                    <span className="ml-1 text-[10px] uppercase tracking-wide text-gray-400">
                      internal
                    </span>
                  </span>
                  <span>−{formatPrice(financials.realShippingCost)}</span>
                </div>
                <div
                  className={`mt-1 flex justify-between border-t border-gray-100 pt-2 text-base font-bold ${
                    financials.netProfit < 0 ? "text-rose-600" : "text-emerald-600"
                  }`}
                >
                  <span>Net profit</span>
                  <span>
                    {formatPrice(financials.netProfit)}
                    <span className="ml-2 text-sm font-medium">
                      ({formatPercent(financials.marginPercent)})
                    </span>
                  </span>
                </div>
              </div>
            </div>
          )}
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

      {/* Todify fulfillment — sync state, cancellation retry, response & logs */}
      {order.todifyOrderId && (
        <div className="mt-6 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-700">Todify fulfillment</h2>
            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-600">
              {order.todifySyncState || "—"}
            </span>
          </div>

          <div className="space-y-1 text-sm text-gray-600">
            <div className="flex justify-between">
              <span>Todify order ID</span>
              <span className="font-mono text-xs">{order.todifyOrderId}</span>
            </div>
            {order.todifyReferenceCode && (
              <div className="flex justify-between">
                <span>Reference</span>
                <span className="font-mono text-xs">{order.todifyReferenceCode}</span>
              </div>
            )}
            {order.todifyStatus && (
              <div className="flex justify-between">
                <span>Todify status</span>
                <span>{order.todifyStatus}</span>
              </div>
            )}
          </div>

          {order.todifySyncState === "CANCELLATION_PENDING" && (
            <div className="mt-3 flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
              <AlertTriangle size={14} className="mt-0.5 shrink-0" />
              <span>
                Cancellation is pending in Todify. This order cannot be deleted until the
                cancellation has been successfully synchronized with Todify.
              </span>
            </div>
          )}

          {/* View Todify Response (last error / response) */}
          {order.todifyErrorMessage && (
            <div className="mt-3">
              <p className="mb-1 text-xs font-medium text-gray-500">Latest Todify response</p>
              <pre className="max-h-40 overflow-auto whitespace-pre-wrap break-all rounded-md bg-gray-50 p-2 text-[11px] text-gray-700">
                {order.todifyErrorMessage}
              </pre>
            </div>
          )}

          <div className="mt-4 flex flex-wrap gap-2">
            {order.status === "CANCELLED" && order.todifySyncState !== "CANCELLED" && (
              <button
                onClick={retryTodifyCancel}
                disabled={retrying}
                className="inline-flex items-center gap-1.5 rounded-md border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-800 transition hover:bg-amber-100 disabled:opacity-60"
              >
                {retrying ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
                Retry Todify cancellation
              </button>
            )}
            <button
              onClick={loadTodifyLogs}
              disabled={loadingLogs}
              className="inline-flex items-center gap-1.5 rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-60"
            >
              {loadingLogs ? <Loader2 size={13} className="animate-spin" /> : <ScrollText size={13} />}
              View synchronization logs
            </button>
          </div>

          {todifyLogs && (
            <div className="mt-3 space-y-2">
              {todifyLogs.length === 0 ? (
                <p className="text-xs text-gray-400">No synchronization logs for this order.</p>
              ) : (
                todifyLogs.map((l) => (
                  <div key={l.id} className="rounded-md border border-gray-100 bg-gray-50 p-2 text-[11px]">
                    <div className="flex justify-between text-gray-500">
                      <span className="font-medium">
                        {l.event} · {l.type}
                        {l.httpStatus ? ` · HTTP ${l.httpStatus}` : ""}
                      </span>
                      <span>{formatDateTime(l.createdAt)}</span>
                    </div>
                    {(l.errorMessage || l.responseBody) && (
                      <pre className="mt-1 max-h-28 overflow-auto whitespace-pre-wrap break-all text-gray-600">
                        {l.errorMessage || l.responseBody}
                      </pre>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      )}

      {/* Activity / audit log — who did what, when */}
      {auditLogs.length > 0 && (
        <div className="mt-6 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold text-gray-700">Activity log</h2>
          <ul className="space-y-3">
            {auditLogs.map((a) => (
              <li key={a.id} className="flex gap-3 text-sm">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-gray-300" />
                <div className="min-w-0">
                  <p className="text-gray-800">
                    <span className="font-medium">{ACTION_LABELS[a.action] || a.action}</span>
                    {a.reason ? ` — ${a.reason}` : ""}
                  </p>
                  <p className="text-xs text-gray-400">
                    {formatDateTime(a.createdAt)}
                    {a.performedBy ? ` · ${a.performedBy}` : ""}
                    {a.httpStatus ? ` · HTTP ${a.httpStatus}` : ""}
                  </p>
                  {a.detail && <p className="mt-0.5 text-xs text-gray-500">{a.detail}</p>}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      <ConfirmDialog
        open={confirmDelete}
        title="Delete cancelled order"
        message="Are you sure you want to permanently delete this cancelled order? This action cannot be undone."
        confirmLabel="Delete permanently"
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
