"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import {
  Search, Loader2, Package, AlertCircle, CheckCircle2, Truck, MapPin,
  CreditCard, Hash, CalendarClock, XCircle,
} from "lucide-react";
import { OrderService, type OrderResponse } from "@/services/order.service";
import { formatPrice } from "@/lib/money";
import {
  ORDER_STATUS_LABELS, PAYMENT_STATUS_LABELS,
} from "@/types/order";

// Visible progression for the shipping timeline (CANCELLED is handled apart).
const FLOW = ["PENDING", "CONFIRMED", "PROCESSING", "PACKED", "SHIPPED", "DELIVERED"] as const;

function TrackingInner() {
  const params = useSearchParams();
  const [query, setQuery] = useState("");
  const [order, setOrder] = useState<OrderResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);

  const runSearch = async (orderNumber: string) => {
    const ref = orderNumber.trim();
    if (!ref) {
      setError("Veuillez saisir un numéro de commande.");
      return;
    }
    setLoading(true);
    setError(null);
    setOrder(null);
    try {
      const result = await OrderService.track(ref);
      setSearched(true);
      if (!result) {
        setError("Aucune commande trouvée pour ce numéro. Vérifiez et réessayez.");
      } else {
        setOrder(result);
      }
    } catch {
      setError("Une erreur s'est produite. Veuillez réessayer.");
    } finally {
      setLoading(false);
    }
  };

  // Auto-search when arriving from the confirmation page (?order=BQ-…).
  useEffect(() => {
    const initial = params.get("order");
    if (initial) {
      setQuery(initial);
      runSearch(initial);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4 sm:px-6">
          <Link href="/" className="text-xl font-bold tracking-tight text-gray-900">
            Blue<span className="text-blue-600">Quirk</span>
          </Link>
          <Link href="/" className="text-sm font-medium text-blue-600 hover:text-blue-700">
            Boutique
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <div className="mb-6 text-center">
          <span className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-blue-600">
            <Package size={24} />
          </span>
          <h1 className="text-2xl font-bold text-gray-900">Suivi de commande</h1>
          <p className="mt-1 text-sm text-gray-500">
            Saisissez votre numéro de commande (ex. BQ-2026-000123).
          </p>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            runSearch(query);
          }}
          className="mx-auto flex max-w-md gap-2"
        >
          <div className="relative flex-1">
            <Search size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="BQ-2026-000123"
              className="w-full rounded-lg border border-gray-300 bg-white py-2.5 pl-10 pr-3 text-sm text-gray-900 placeholder:text-gray-400 transition focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-70"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
            Suivre
          </button>
        </form>

        {error && (
          <div role="alert" className="mx-auto mt-6 flex max-w-md items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <AlertCircle size={18} className="mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {order && <OrderView order={order} />}

        {!order && !error && searched && (
          <p className="mt-8 text-center text-sm text-gray-400">Aucun résultat.</p>
        )}
      </div>
    </main>
  );
}

function OrderView({ order }: { order: OrderResponse }) {
  const cancelled = order.status === "CANCELLED";
  const currentIdx = FLOW.indexOf(order.status as (typeof FLOW)[number]);

  return (
    <div className="mt-8 space-y-5">
      {/* Summary header */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-wide text-gray-400">Commande</p>
            <p className="font-mono text-lg font-bold text-gray-900">
              {order.orderNumber || `#${order.id}`}
            </p>
          </div>
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-semibold ${
              cancelled ? "bg-rose-100 text-rose-700" : "bg-blue-100 text-blue-700"
            }`}
          >
            {cancelled ? <XCircle size={16} /> : <Truck size={16} />}
            {ORDER_STATUS_LABELS[order.status] ?? order.status}
          </span>
        </div>

        <dl className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Info icon={<CreditCard size={16} />} label="Paiement"
            value={`${order.paymentMethod === "COD" ? "À la livraison" : order.paymentMethod} — ${PAYMENT_STATUS_LABELS[order.paymentStatus ?? "UNPAID"] ?? order.paymentStatus}`} />
          <Info icon={<CalendarClock size={16} />} label="Livraison estimée"
            value={order.estimatedDelivery
              ? new Date(order.estimatedDelivery).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })
              : "Sous 3 à 5 jours ouvrables"} />
          {order.trackingNumber && (
            <Info icon={<Hash size={16} />} label="Numéro de suivi" value={order.trackingNumber} />
          )}
          <Info icon={<MapPin size={16} />} label="Livraison"
            value={`${order.address}, ${order.city}${order.postalCode ? " " + order.postalCode : ""}`} />
        </dl>
      </div>

      {/* Status timeline */}
      {!cancelled && (
        <div className="rounded-2xl border border-gray-200 bg-white p-6">
          <h2 className="mb-5 text-sm font-bold text-gray-900">Statut de la livraison</h2>
          <ol className="space-y-4">
            {FLOW.map((step, i) => {
              const done = i <= currentIdx;
              const active = i === currentIdx;
              return (
                <li key={step} className="flex items-center gap-3">
                  <span
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs ${
                      done ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-400"
                    }`}
                  >
                    {done ? <CheckCircle2 size={16} /> : i + 1}
                  </span>
                  <span className={`text-sm ${active ? "font-bold text-gray-900" : done ? "font-medium text-gray-700" : "text-gray-400"}`}>
                    {ORDER_STATUS_LABELS[step]}
                  </span>
                </li>
              );
            })}
          </ol>
        </div>
      )}

      {/* Items */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6">
        <h2 className="mb-4 text-sm font-bold text-gray-900">Articles</h2>
        <ul className="divide-y divide-gray-100">
          {order.items.map((it, i) => (
            <li key={i} className="flex items-center gap-3 py-3">
              {it.image && (
                <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-md bg-gray-100">
                  <Image src={it.image} alt={it.name} fill sizes="56px" className="object-cover" />
                </div>
              )}
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">{it.name}</p>
                {it.variant && <p className="text-xs text-gray-500">{it.variant}</p>}
                <p className="text-xs text-gray-500">{it.quantity} × {formatPrice(it.unitPrice)}</p>
              </div>
              <span className="text-sm font-semibold text-gray-900">{formatPrice(it.lineTotal)}</span>
            </li>
          ))}
        </ul>
        <div className="mt-4 space-y-1.5 border-t border-gray-100 pt-4 text-sm">
          <Row label="Sous-total" value={formatPrice(order.subtotal)} />
          <Row label="Livraison" value={order.shippingFee === 0 ? "Gratuite" : formatPrice(order.shippingFee)} />
          <div className="flex justify-between pt-1 text-base font-bold text-gray-900">
            <span>Total</span>
            <span>{formatPrice(order.total)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function Info({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2.5">
      <span className="mt-0.5 text-gray-400">{icon}</span>
      <div>
        <dt className="text-xs text-gray-400">{label}</dt>
        <dd className="text-sm font-medium text-gray-900">{value}</dd>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-gray-600">
      <span>{label}</span>
      <span className="font-medium text-gray-900">{value}</span>
    </div>
  );
}

export default function OrderTrackingPage() {
  return (
    <Suspense fallback={
      <main className="flex min-h-screen items-center justify-center text-gray-400">
        <Loader2 className="size-6 animate-spin" />
      </main>
    }>
      <TrackingInner />
    </Suspense>
  );
}
