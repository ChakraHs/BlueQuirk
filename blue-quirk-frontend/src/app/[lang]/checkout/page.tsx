"use client";

import { use, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Truck, ShieldCheck, Loader2, AlertCircle, CheckCircle2, Phone, MapPin,
  User as UserIcon, Mail, Package, LogIn,
} from "lucide-react";
import { useCart, cartTotal, clearCart } from "@/lib/cart";
import { formatPrice } from "@/lib/money";
import { useShippingConfig, computeShipping } from "@/lib/shipping";
import FreeShippingBar from "@/components/storefront/FreeShippingBar";
import { isAuthenticated, getAuthUser, type AuthUser } from "@/lib/auth";
import { OrderService, cartToOrderItems, type OrderResponse } from "@/services/order.service";
import LoginModal from "@/components/storefront/LoginModal";

type Form = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  postalCode: string;
  note: string;
};

const EMPTY: Form = {
  firstName: "", lastName: "", email: "", phone: "",
  address: "", city: "", postalCode: "", note: "",
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Moroccan-friendly: optional +, digits/spaces/dashes, at least 9 digits.
const PHONE_RE = /^[+]?[\d\s-]{9,}$/;

export default function CheckoutPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = use(params);
  const items = useCart();
  const total = cartTotal(items);
  const shippingConfig = useShippingConfig();
  const shipping = computeShipping(total, shippingConfig);
  const grandTotal = total + shipping;

  const [form, setForm] = useState<Form>(EMPTY);
  const [errors, setErrors] = useState<Partial<Record<keyof Form, string>>>({});
  const [touched, setTouched] = useState<Partial<Record<keyof Form, boolean>>>({});
  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [placed, setPlaced] = useState<OrderResponse | null>(null);
  const [loginOpen, setLoginOpen] = useState(false);
  const [signedIn, setSignedIn] = useState(false);

  // Prefill from the signed-in account if there is one — but never force login.
  useEffect(() => {
    if (isAuthenticated()) {
      const user = getAuthUser();
      if (user) {
        setSignedIn(true);
        applyUser(user);
      }
    }
  }, []);

  function applyUser(user: AuthUser) {
    setForm((f) => ({
      ...f,
      firstName: user.firstName || f.firstName,
      lastName: user.lastName || f.lastName,
      email: user.email || f.email,
    }));
  }

  const validateField = (field: keyof Form, value: string): string | undefined => {
    const v = value.trim();
    switch (field) {
      case "firstName": return v ? undefined : "Prénom requis";
      case "lastName": return v ? undefined : "Nom requis";
      case "email":
        if (!v) return "Email requis";
        return EMAIL_RE.test(v) ? undefined : "Email invalide";
      case "phone":
        if (!v) return "Téléphone requis";
        return PHONE_RE.test(v) ? undefined : "Téléphone invalide";
      case "address": return v ? undefined : "Adresse requise";
      case "city": return v ? undefined : "Ville requise";
      default: return undefined; // postalCode + note optional
    }
  };

  const update =
    (field: keyof Form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const value = e.target.value;
      setForm((prev) => ({ ...prev, [field]: value }));
      if (touched[field]) {
        setErrors((prev) => ({ ...prev, [field]: validateField(field, value) }));
      }
    };

  const blur = (field: keyof Form) => () => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    setErrors((prev) => ({ ...prev, [field]: validateField(field, form[field]) }));
  };

  const validateAll = (): boolean => {
    const next: Partial<Record<keyof Form, string>> = {};
    (Object.keys(EMPTY) as (keyof Form)[]).forEach((f) => {
      const err = validateField(f, form[f]);
      if (err) next[f] = err;
    });
    setErrors(next);
    setTouched(Object.fromEntries((Object.keys(EMPTY) as (keyof Form)[]).map((f) => [f, true])));
    return Object.keys(next).length === 0;
  };

  const canSubmit = useMemo(
    () =>
      form.firstName.trim() && form.lastName.trim() && form.email.trim() &&
      form.phone.trim() && form.address.trim() && form.city.trim() &&
      items.length > 0,
    [form, items]
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    if (!validateAll()) return;
    if (items.length === 0) return;

    setLoading(true);
    try {
      const order = await OrderService.create({
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        city: form.city.trim(),
        address: form.address.trim(),
        postalCode: form.postalCode.trim() || undefined,
        note: form.note.trim() || undefined,
        items: cartToOrderItems(items),
      });
      clearCart();
      setPlaced(order);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setSubmitError(msg || "Une erreur s'est produite. Veuillez réessayer.");
    } finally {
      setLoading(false);
    }
  };

  // ---- Success / confirmation ----
  if (placed) {
    return <Confirmation order={placed} lang={lang} signedIn={signedIn} />;
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
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
      <h1 className="mb-2 text-2xl font-bold tracking-tight text-gray-900 md:text-3xl">
        Finaliser la commande
      </h1>
      <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1.5 text-sm font-semibold text-blue-700">
        <Truck className="size-4" />
        Paiement à la livraison (Cash on Delivery)
      </div>

      <form onSubmit={handleSubmit} className="grid gap-8 lg:grid-cols-[1fr_380px] lg:gap-10">
        {/* ---- LEFT: Customer information ---- */}
        <div>
          <div className="mb-5 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-bold text-gray-900">Vos informations</h2>
            {signedIn ? (
              <span className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-600">
                <CheckCircle2 size={16} /> Connecté
              </span>
            ) : (
              <button
                type="button"
                onClick={() => setLoginOpen(true)}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-700"
              >
                <LogIn size={16} />
                Vous avez déjà un compte ? Se connecter
              </button>
            )}
          </div>

          {submitError && (
            <div role="alert" className="mb-5 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              <AlertCircle size={18} className="mt-0.5 shrink-0" />
              <span>{submitError}</span>
            </div>
          )}

          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field icon={<UserIcon size={18} />} label="Prénom" required value={form.firstName} onChange={update("firstName")} onBlur={blur("firstName")} error={errors.firstName} placeholder="Jean" autoComplete="given-name" />
              <Field label="Nom" required value={form.lastName} onChange={update("lastName")} onBlur={blur("lastName")} error={errors.lastName} placeholder="Dupont" autoComplete="family-name" />
            </div>
            <Field icon={<Mail size={18} />} label="Email" required type="email" value={form.email} onChange={update("email")} onBlur={blur("email")} error={errors.email} placeholder="jean@example.com" autoComplete="email" />
            <Field icon={<Phone size={18} />} label="Téléphone" required type="tel" value={form.phone} onChange={update("phone")} onBlur={blur("phone")} error={errors.phone} placeholder="0612345678" autoComplete="tel" />
            <Field icon={<MapPin size={18} />} label="Adresse" required value={form.address} onChange={update("address")} onBlur={blur("address")} error={errors.address} placeholder="Rue, quartier, n°" autoComplete="street-address" />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Ville" required value={form.city} onChange={update("city")} onBlur={blur("city")} error={errors.city} placeholder="Casablanca" autoComplete="address-level2" />
              <Field label="Code postal (optionnel)" value={form.postalCode} onChange={update("postalCode")} placeholder="20000" autoComplete="postal-code" />
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

        {/* ---- RIGHT: Order summary ---- */}
        <aside className="h-fit rounded-2xl border border-gray-200 p-6 lg:sticky lg:top-6">
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
                    <span className="text-xs text-gray-500">
                      {item.quantity} × {formatPrice(item.price)}
                    </span>
                    <span className="mt-auto text-sm font-bold text-gray-900">
                      {formatPrice(item.price * item.quantity)}
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>

          <FreeShippingBar subtotal={total} lang={lang} className="mt-5" />

          <dl className="mt-5 space-y-2 border-t border-gray-100 pt-5 text-sm">
            <div className="flex justify-between text-gray-600">
              <dt>Sous-total</dt>
              <dd className="font-medium text-gray-900">{formatPrice(total)}</dd>
            </div>
            <div className="flex justify-between text-gray-600">
              <dt>Livraison</dt>
              <dd className={`font-medium ${shipping === 0 ? "text-emerald-600" : "text-gray-900"}`}>
                {shipping === 0 ? "Gratuite" : formatPrice(shipping)}
              </dd>
            </div>
          </dl>

          <div className="mt-4 flex justify-between border-t border-gray-200 pt-4">
            <span className="text-base font-bold text-gray-900">Total</span>
            <span className="text-base font-bold text-gray-900">{formatPrice(grandTotal)}</span>
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

      <LoginModal
        open={loginOpen}
        onClose={() => setLoginOpen(false)}
        onSuccess={(user) => {
          setSignedIn(true);
          applyUser(user);
        }}
      />
    </main>
  );
}

// ---- Confirmation screen ----
function Confirmation({
  order, lang, signedIn,
}: {
  order: OrderResponse;
  lang: string;
  signedIn: boolean;
}) {
  const ref = order.orderNumber || `#${order.id}`;
  const eta = order.estimatedDelivery
    ? new Date(order.estimatedDelivery).toLocaleDateString("fr-FR", {
        weekday: "long", day: "numeric", month: "long",
      })
    : "Sous 3 à 5 jours ouvrables";

  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <div className="flex flex-col items-center rounded-2xl border border-gray-200 p-8 text-center sm:p-10">
        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
          <CheckCircle2 size={34} />
        </span>
        <h1 className="mt-5 text-2xl font-bold text-gray-900">Commande confirmée !</h1>
        <p className="mt-2 text-gray-600">
          Merci {order.customerName?.split(" ")[0]}, votre commande est enregistrée.
        </p>

        <div className="mt-5 w-full rounded-xl bg-gray-50 p-4 text-left">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">Numéro de commande</span>
            <span className="font-mono text-sm font-bold text-gray-900">{ref}</span>
          </div>
          <div className="mt-2 flex items-center justify-between">
            <span className="text-sm text-gray-500">Livraison estimée</span>
            <span className="text-sm font-medium text-gray-900">{eta}</span>
          </div>
          <div className="mt-2 flex items-center justify-between">
            <span className="text-sm text-gray-500">Total à payer (à la livraison)</span>
            <span className="text-sm font-bold text-gray-900">{formatPrice(order.total)}</span>
          </div>
        </div>

        {/* Item summary */}
        <ul className="mt-4 w-full divide-y divide-gray-100 rounded-xl border border-gray-100 text-left">
          {order.items.map((it, i) => (
            <li key={i} className="flex items-center gap-3 p-3">
              {it.image && (
                <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-md bg-gray-100">
                  <Image src={it.image} alt={it.name} fill sizes="48px" className="object-cover" />
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

        <p className="mt-4 text-sm text-gray-500">
          Nous vous appellerons au <strong>{order.phone}</strong> pour confirmer la livraison.
          Un email de confirmation vous a été envoyé.
        </p>

        <div className="mt-7 flex w-full flex-col gap-3 sm:flex-row sm:justify-center">
          <Link
            href={`/order-tracking?order=${encodeURIComponent(order.orderNumber || "")}`}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
          >
            <Package size={16} /> Suivre ma commande
          </Link>
          {!signedIn && (
            <Link
              href={`/signup?redirect=/${lang}`}
              className="inline-flex items-center justify-center gap-2 rounded-full border border-gray-300 px-6 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
            >
              Créer un compte (optionnel)
            </Link>
          )}
        </div>

        <Link href={`/${lang}`} className="mt-5 text-sm font-medium text-blue-600 hover:text-blue-700">
          Continuer mes achats
        </Link>
      </div>
    </main>
  );
}

function Field({
  icon, label, value, onChange, onBlur, placeholder, type = "text",
  required, error, autoComplete,
}: {
  icon?: React.ReactNode;
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onBlur?: () => void;
  placeholder?: string;
  type?: string;
  required?: boolean;
  error?: string;
  autoComplete?: string;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-gray-700">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <div className="relative">
        {icon && (
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">{icon}</span>
        )}
        <input
          type={type}
          value={value}
          onChange={onChange}
          onBlur={onBlur}
          placeholder={placeholder}
          autoComplete={autoComplete}
          aria-invalid={!!error}
          className={`w-full rounded-lg border bg-white py-2.5 ${icon ? "pl-10" : "pl-3"} pr-3 text-sm text-gray-900 placeholder:text-gray-400 transition focus:outline-none focus:ring-2 ${
            error
              ? "border-red-400 focus:border-red-500 focus:ring-red-500/20"
              : "border-gray-300 focus:border-blue-600 focus:ring-blue-600/20"
          }`}
        />
      </div>
      {error && (
        <p className="mt-1 flex items-center gap-1 text-xs text-red-600">
          <AlertCircle size={12} /> {error}
        </p>
      )}
    </div>
  );
}
