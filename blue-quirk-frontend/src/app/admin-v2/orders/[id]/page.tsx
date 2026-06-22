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
} from "lucide-react";
import PageHeader from "@/components/admin/ui/PageHeader";
import StatusBadge from "@/components/admin/ui/StatusBadge";
import ConfirmDialog from "@/components/admin/ui/ConfirmDialog";
import { OrderService, type OrderResponse } from "@/services/order.service";
import { ORDER_STATUSES, type OrderStatus } from "@/types/order";
import { formatPrice } from "@/lib/money";

const STATUS_LABELS: Record<string, string> = {
  PENDING: "En attente",
  CONFIRMED: "Confirmée",
  SHIPPED: "Expédiée",
  DELIVERED: "Livrée",
  CANCELLED: "Annulée",
};

function formatDateTime(iso: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("fr-FR", {
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

  useEffect(() => {
    (async () => {
      try {
        setOrder(await OrderService.getById(id));
      } catch {
        setError("Commande introuvable.");
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const changeStatus = async (status: OrderStatus) => {
    if (!order || order.status === status) return;
    setSavingStatus(status);
    setNotice(null);
    try {
      const updated = await OrderService.updateStatus(id, status);
      setOrder(updated);
      setNotice(
        `Statut mis à jour : ${STATUS_LABELS[status]}. Le client a été notifié par e-mail.`
      );
    } catch {
      setError("Échec de la mise à jour du statut.");
    } finally {
      setSavingStatus(null);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await OrderService.delete(id);
      router.push("/admin-v2/orders");
    } catch {
      setError("Échec de la suppression.");
      setDeleting(false);
      setConfirmDelete(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center text-gray-400">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Chargement…
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
          <ArrowLeft size={16} /> Retour aux commandes
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
        <ArrowLeft size={16} /> Retour aux commandes
      </Link>

      <PageHeader
        title={`Commande #${order.id}`}
        subtitle={formatDateTime(order.orderDate)}
      >
        <StatusBadge status={order.status} />
        <button
          onClick={() => setConfirmDelete(true)}
          className="inline-flex items-center gap-1.5 rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-rose-600 transition hover:bg-rose-50"
        >
          <Trash2 size={15} /> Supprimer
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

      {/* Status workflow */}
      <div className="mb-6 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="mb-3 text-sm font-semibold text-gray-700">
          Faire évoluer le statut
        </h2>
        <div className="flex flex-wrap gap-2">
          {ORDER_STATUSES.map((s) => {
            const active = order.status === s;
            return (
              <button
                key={s}
                onClick={() => changeStatus(s)}
                disabled={savingStatus !== null || active}
                className={`inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition disabled:cursor-not-allowed ${
                  active
                    ? "bg-blue-600 text-white"
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
          Le client reçoit un e-mail automatique à chaque changement de statut.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Items */}
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm lg:col-span-2">
          <div className="border-b border-gray-100 px-5 py-4">
            <h2 className="text-sm font-semibold text-gray-700">Articles</h2>
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
              <span>Sous-total</span>
              <span>{formatPrice(order.subtotal)}</span>
            </div>
            <div className="flex justify-between text-gray-500">
              <span>Livraison</span>
              <span>
                {order.shippingFee === 0
                  ? "Gratuite"
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
            <h2 className="mb-3 text-sm font-semibold text-gray-700">Client</h2>
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
              Paiement
            </h2>
            <p className="text-sm text-gray-600">
              {order.paymentMethod === "COD"
                ? "Paiement à la livraison (COD)"
                : order.paymentMethod}
            </p>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        title="Supprimer la commande"
        message={`Supprimer définitivement la commande #${order.id} ? Cette action est irréversible.`}
        confirmLabel="Supprimer"
        busy={deleting}
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(false)}
      />
    </div>
  );
}
