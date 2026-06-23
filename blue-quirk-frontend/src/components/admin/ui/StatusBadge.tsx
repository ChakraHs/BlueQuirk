// Coloured pills for order, payment + product statuses, with French labels.
import {
  ORDER_STATUS_LABELS,
  PAYMENT_STATUS_LABELS,
} from "@/types/order";

const ORDER_STYLES: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-700",
  CONFIRMED: "bg-blue-100 text-blue-700",
  PROCESSING: "bg-sky-100 text-sky-700",
  PACKED: "bg-indigo-100 text-indigo-700",
  SHIPPED: "bg-violet-100 text-violet-700",
  DELIVERED: "bg-emerald-100 text-emerald-700",
  CANCELLED: "bg-rose-100 text-rose-700",
};

const PAYMENT_STYLES: Record<string, string> = {
  UNPAID: "bg-amber-100 text-amber-700",
  PAID: "bg-emerald-100 text-emerald-700",
  REFUNDED: "bg-slate-200 text-slate-600",
};

const PRODUCT_STYLES: Record<string, string> = {
  PUBLISHED: "bg-emerald-100 text-emerald-700",
  DRAFT: "bg-amber-100 text-amber-700",
  ARCHIVED: "bg-slate-200 text-slate-600",
  // legacy values that may still exist in data
  ACTIVE: "bg-emerald-100 text-emerald-700",
  INACTIVE: "bg-slate-200 text-slate-600",
};

export function StatusBadge({
  status,
  kind = "order",
}: {
  status: string;
  kind?: "order" | "payment" | "product";
}) {
  const styles =
    kind === "order"
      ? ORDER_STYLES
      : kind === "payment"
        ? PAYMENT_STYLES
        : PRODUCT_STYLES;
  const cls = styles[status] ?? "bg-slate-100 text-slate-600";
  const label =
    kind === "order"
      ? ORDER_STATUS_LABELS[status] ?? status
      : kind === "payment"
        ? PAYMENT_STATUS_LABELS[status] ?? status
        : status;

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${cls}`}
    >
      {label}
    </span>
  );
}

export default StatusBadge;
