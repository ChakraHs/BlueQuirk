"use client";

import { use, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Truck, ShieldCheck, Loader2, AlertCircle, CheckCircle2, Phone, MapPin, User as UserIcon,
} from "lucide-react";
import { useCart, cartTotal, clearCart } from "@/lib/cart";
import { formatPrice } from "@/lib/money";
import { isAuthenticated, getAuthUser } from "@/lib/auth";
import { OrderService, cartToOrderItems, type OrderResponse } from "@/services/order.service";

export default function CheckoutPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = use(params);
  const router = useRouter();
  const items = useCart();
  const total = cartTotal(items);

  const [authChecked, setAuthChecked] = useState(false);
  const [form, setForm] = useState({
    customerName: "",
    phone: "",
    city: "",
    address: "",
    note: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [placed, setPlaced] = useState<OrderResponse | null>(null);

  // Auth gate: customers must be signed in to check out. Send guests to sign up
  // and bring them back here afterwards.
  useEffect(() => {
    if (!isAuthenticated()) {
      router.replace(`/signup?redirect=/${lang}/checkout`);
      return;
    }
    const user = getAuthUser();
    if (user) {
      setForm((f) => ({
        ...f,
        customerName: [user.firstName, user.lastName].filter(Boolean).join(" ") || f.customerName,
      }));
    }
    setAuthChecked(true);
  }, [lang, router]);

  const update =
    (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const canSubmit = useMemo(
    () =>
      form.customerName.trim() &&
      form.phone.trim() &&
      form.city.trim() &&
      form.address.trim() &&
      items.length > 0,
    [form, items]
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!canSubmit) {
      setError("Veuillez remplir nom, téléphone, ville et adresse.");
      return;
    }
    setLoading(true);
    try {
      const order = await OrderService.create({
        customerName: form.customerName.trim(),
        phone: form.phone.trim(),
        city: form.city.trim(),
        address: form.address.trim(),
        note: form.note.trim() || undefined,
        items: cartToOrderItems(items),
      });
      clearCart();
      setPlaced(order);
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 401 || status === 403) {
        router.replace(`/signup?redirect=/${lang}/checkout`);
        return;
      }
      setError("Une erreur s'est produite. Veuillez réessayer.");
    } finally {
      setLoading(false);
    }
  };

  // ---- Success ----
  if (placed) {
    return (
      <main className="mx-auto max-w-2xl px-6 py-16">
        <div className="flex flex-col items-center rounded-2xl border border-gray-200 p-10 text-center">
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
            <CheckCircle2 size={34} />
          </span>
          <h1 className="mt-5 text-2xl font-bold text-gray-900">Commande confirmée !</h1>
          <p className="mt-2 text-gray-600">
            Merci, votre commande <strong>#{placed.id}</strong> a bien été enregistrée. Nous vous
            appellerons au <strong>{placed.phone}</strong> pour confirmer la livraison.
          </p>
          <p className="mt-1 text-sm text-gray-500">
            Paiement en espèces à la livraison — total à payer{" "}
            <strong>{formatPrice(placed.total)}</strong>. Un email de confirmation vous a été envoyé.
          </p>
          <Link
            href={`/${lang}`}
            className="mt-7 rounded-full bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
          >
            Continuer mes achats
          </Link>
        </div>
      </main>
    );
  }

  if (!authChecked) {
    return (
      <main className="mx-auto flex max-w-2xl items-center justify-center px-6 py-24 text-gray-400">
        <Loader2 className="size-6 animate-spin" />
      </main>
    );
  }

  if (items.length === 0) {
    return (
      <main className="mx-auto max-w-2xl px-6 py-16 text-center">
        <h1 className="text-lg font-semibold text-gray-900">Votre panier est vide</h1>
        <Link
          href={`/${lang}`}
          className="mt-6 inline-block rounded-full bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
        >
          Découvrir les produits
        </Link>
      </main>
    );
  }

  // ---- Checkout form ----
  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <h1 className="mb-2 text-2xl font-bold tracking-tight text-gray-900 md:text-3xl">
        Finaliser la commande
      </h1>
      <div className="mb-8 inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1.5 text-sm font-semibold text-blue-700">
        <Truck className="size-4" />
        Paiement à la livraison (Cash on Delivery)
      </div>

      <form onSubmit={handleSubmit} className="grid gap-10 lg:grid-cols-[1fr_380px]">
        {/* Delivery details */}
        <div>
          <h2 className="mb-4 text-lg font-bold text-gray-900">Informations de livraison</h2>

          {error && (
            <div role="alert" className="mb-5 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              <AlertCircle size={18} className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-4">
            <Field icon={<UserIcon size={18} />} label="Nom complet" value={form.customerName} onChange={update("customerName")} placeholder="Jean Dupont" />
            <Field icon={<Phone size={18} />} label="Téléphone" value={form.phone} onChange={update("phone")} placeholder="0612345678" type="tel" />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field icon={<MapPin size={18} />} label="Ville" value={form.city} onChange={update("city")} placeholder="Casablanca" />
              <Field label="Adresse" value={form.address} onChange={update("address")} placeholder="Rue, quartier, n°" />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Note (optionnel)</label>
              <textarea
                value={form.note}
                onChange={update("note")}
                rows={3}
                placeholder="Instructions de livraison, point de repère…"
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 transition focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
              />
            </div>
          </div>

          <div className="mt-6 flex items-center gap-2 rounded-lg bg-gray-50 px-4 py-3 text-sm text-gray-600">
            <ShieldCheck className="size-4 text-gray-900" />
            Aucun paiement en ligne — vous réglez en espèces à la réception.
          </div>
        </div>

        {/* Order summary */}
        <aside className="h-fit rounded-2xl border border-gray-200 p-6">
          <h2 className="text-lg font-bold text-gray-900">Votre commande</h2>

          <ul className="mt-4 space-y-4">
            {items.map((item, idx) => {
              const attrs = Object.entries(item.attributes).filter(([, v]) => v);
              return (
                <li key={idx} className="flex gap-3">
                  <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-gray-100">
                    <Image src={item.image} alt={item.name} fill sizes="64px" className="object-cover" />
                    <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-blue-600 px-1 text-[11px] font-bold text-white">
                      {item.quantity}
                    </span>
                  </div>
                  <div className="flex flex-1 flex-col">
                    <span className="line-clamp-1 text-sm font-semibold text-gray-900">{item.name}</span>
                    {attrs.length > 0 && (
                      <span className="text-xs text-gray-500">{attrs.map(([k, v]) => `${k}: ${v}`).join(" · ")}</span>
                    )}
                    <span className="mt-auto text-sm font-bold text-gray-900">
                      {formatPrice(item.price * item.quantity)}
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>

          <dl className="mt-5 space-y-2 border-t border-gray-100 pt-5 text-sm">
            <div className="flex justify-between text-gray-600">
              <dt>Sous-total</dt>
              <dd className="font-medium text-gray-900">{formatPrice(total)}</dd>
            </div>
            <div className="flex justify-between text-gray-600">
              <dt>Livraison</dt>
              <dd className="font-medium text-emerald-600">Gratuite</dd>
            </div>
          </dl>

          <div className="mt-4 flex justify-between border-t border-gray-200 pt-4">
            <span className="text-base font-bold text-gray-900">Total</span>
            <span className="text-base font-bold text-gray-900">{formatPrice(total)}</span>
          </div>

          <button
            type="submit"
            disabled={loading || !canSubmit}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-full bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {loading && <Loader2 size={18} className="animate-spin" />}
            {loading ? "Confirmation…" : "Confirmer la commande"}
          </button>

          <Link href={`/${lang}/cart`} className="mt-3 block text-center text-sm font-medium text-blue-600 hover:text-blue-700">
            Revenir au panier
          </Link>
        </aside>
      </form>
    </main>
  );
}

function Field({
  icon, label, value, onChange, placeholder, type = "text",
}: {
  icon?: React.ReactNode;
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-gray-700">{label}</label>
      <div className="relative">
        {icon && (
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">{icon}</span>
        )}
        <input
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          className={`w-full rounded-lg border border-gray-300 bg-white py-2.5 ${icon ? "pl-10" : "pl-3"} pr-3 text-sm text-gray-900 placeholder:text-gray-400 transition focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20`}
        />
      </div>
    </div>
  );
}
