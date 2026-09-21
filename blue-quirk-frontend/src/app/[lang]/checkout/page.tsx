"use client";

import { use, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Truck, ShieldCheck, Loader2, AlertCircle, CheckCircle2, Phone, MapPin,
  User as UserIcon, Mail, Package, LogIn, Tag, X, Check, Plus, Wallet, ArrowLeft,
} from "lucide-react";
import { useCart, cartTotal, cartCount, clearCart, cartItemKey } from "@/lib/cart";
import { formatPrice } from "@/lib/money";
import { formatVariant } from "@/lib/colors";
import { thumbSrc } from "@/lib/productImage";
import { quickAddProduct } from "@/lib/quickAdd";
import { ProductService } from "@/services/product.service";
import type { Product } from "@/types/product";
import CheckoutItem from "@/components/checkout/CheckoutItem";
import { useShippingConfig, computeShipping } from "@/lib/shipping";
import { useCartQuote } from "@/lib/bundle";
import { progressiveState } from "@/lib/progressive";
import ProgressiveIncentive from "@/components/storefront/ProgressiveIncentive";
import FreeShippingBar from "@/components/storefront/FreeShippingBar";
import { isAuthenticated, getAuthUser, type AuthUser } from "@/lib/auth";
import { OrderService, cartToOrderItems, type OrderResponse } from "@/services/order.service";
import LoginModal from "@/components/storefront/LoginModal";
import CitySelect from "@/components/checkout/CitySelect";
import { t } from "@/lib/i18n";
import { track } from "@/lib/analytics/tracker";
import { trackingService } from "@/lib/tracking/service";

type Form = {
  fullName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  note: string;
};

const EMPTY: Form = {
  fullName: "", email: "", phone: "",
  address: "", city: "", note: "",
};

/** Split a full name into a first name (first word) + last name (the rest). */
function splitName(full: string): { firstName: string; lastName: string } {
  const parts = full.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { firstName: "", lastName: "" };
  return { firstName: parts[0], lastName: parts.slice(1).join(" ") };
}

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
  const itemCount = cartCount(items);
  const shippingConfig = useShippingConfig();
  const shipping = computeShipping(total, shippingConfig, itemCount);
  const grandTotal = total + shipping;

  // --- Coupon state. The server validates + reprices; we only display what it
  // returns and forward the code on submit. The final total is never computed here.
  const [couponInput, setCouponInput] = useState("");
  const [appliedCode, setAppliedCode] = useState<string | null>(null);

  const [form, setForm] = useState<Form>(EMPTY);
  const [errors, setErrors] = useState<Partial<Record<keyof Form, string>>>({});
  const [touched, setTouched] = useState<Partial<Record<keyof Form, boolean>>>({});
  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [placed, setPlaced] = useState<OrderResponse | null>(null);
  const [loginOpen, setLoginOpen] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [continueShoppingHref, setContinueShoppingHref] = useState(`/${lang}`);

  // Continue shopping returns to the most recently viewed collection. A direct
  // visit or a cleared browser store falls back cleanly to the storefront home.
  useEffect(() => {
    const rawCategoryId = localStorage.getItem(`bluequirk:last-category:${lang}`);
    const categoryId = Number(rawCategoryId);
    if (Number.isSafeInteger(categoryId) && categoryId > 0) {
      setContinueShoppingHref(`/${lang}/category/${categoryId}`);
    }
  }, [lang]);

  // --- Authoritative pricing from the backend: subtotal + automatic bundle
  // discount + (optional) coupon, computed exactly as the order will be. We only
  // display what it returns; the final total is never computed on the client.
  const quoteItems = useMemo(() => items.map((i) => ({ id: i.id, quantity: i.quantity })), [items]);
  const { quote, loading: quoting } = useCartQuote(quoteItems, {
    couponCode: appliedCode ?? undefined,
    email: form.email.trim() || undefined,
    // The selected city drives the per-city shipping fee in the authoritative quote.
    city: form.city.trim() || undefined,
  });

  const progressive = progressiveState(quote);
  const progressiveDiscount = quote?.progressiveApplied ? quote.progressiveDiscount : 0;
  const bundleDiscount = quote?.bundleApplied ? quote.bundleDiscount : 0;
  const couponActive = quote?.couponValid === true;
  const couponDiscount = couponActive ? quote!.couponDiscount : 0;
  const couponError =
    appliedCode && quote && !quote.couponValid
      ? quote.couponMessage || t(lang, "checkout.couponInvalid")
      : null;
  const effectiveShipping = quote ? quote.shippingFee : shipping;
  const finalTotal = quote ? quote.total : grandTotal;

  // Shipping depends on the delivery city, so we don't show a concrete amount (nor
  // add it to the total) until the customer has picked a ville. Before that the
  // total reflects the items only; once a city is chosen the authoritative quote
  // already carries its per-city fee.
  const cityChosen = form.city.trim().length > 0;
  const displayTotal = cityChosen ? finalTotal : finalTotal - effectiveShipping;

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
    const name = [user.firstName, user.lastName].filter(Boolean).join(" ").trim();
    setForm((f) => ({
      ...f,
      fullName: name || f.fullName,
      email: user.email || f.email,
    }));
  }

  const validateField = (field: keyof Form, value: string): string | undefined => {
    const v = value.trim();
    switch (field) {
      case "fullName": return v ? undefined : t(lang, "checkout.fullNameRequired");
      case "email":
        // Optional for COD — an empty email is fine (we reach the customer by
        // phone). Only validate the format when something was actually typed.
        if (!v) return undefined;
        return EMAIL_RE.test(v) ? undefined : t(lang, "checkout.emailInvalid");
      case "phone":
        if (!v) return t(lang, "checkout.phoneRequired");
        return PHONE_RE.test(v) ? undefined : t(lang, "checkout.phoneInvalid");
      case "address": return v ? undefined : t(lang, "checkout.addressRequired");
      case "city": return v ? undefined : t(lang, "checkout.cityRequired");
      default: return undefined; // note optional
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
      // Email is intentionally NOT required — COD reaches the customer by phone.
      form.fullName.trim() &&
      form.phone.trim() && form.address.trim() && form.city.trim() &&
      items.length > 0,
    [form, items]
  );

  // Fire begin_checkout once, when the checkout page first has items.
  const checkoutTracked = useRef(false);
  useEffect(() => {
    if (!checkoutTracked.current && items.length > 0) {
      checkoutTracked.current = true;
      track("begin_checkout", { value: cartTotal(items) });
      // Marketing/ads InitiateCheckout — the single source for this event (the
      // Buy-Now button also routes here, so it's covered too). The ref guard
      // keeps re-renders from firing it twice.
      trackingService.initiateCheckout({
        items: items.map((i) => ({ id: i.id, price: i.price, quantity: i.quantity })),
        value: cartTotal(items),
      });
    }
  }, [items]);

  // --- Full products for the cart lines, so the order summary can offer inline
  // size/colour editing (the cart line only stores the chosen labels, not the
  // product's full option set). Each id is fetched once; results are keyed by id.
  const [productMap, setProductMap] = useState<Record<number, Product>>({});
  const fetchedProducts = useRef<Set<number>>(new Set());
  useEffect(() => {
    const missing = items.map((i) => i.id).filter((id) => !fetchedProducts.current.has(id));
    if (missing.length === 0) return;
    missing.forEach((id) => fetchedProducts.current.add(id));
    let alive = true;
    Promise.all(
      missing.map((id) =>
        ProductService.getById(id, lang)
          .then((p) => [id, p] as const)
          .catch(() => null)
      )
    ).then((results) => {
      if (!alive) return;
      setProductMap((prev) => {
        const next = { ...prev };
        for (const r of results) if (r) next[r[0]] = r[1];
        return next;
      });
    });
    return () => {
      alive = false;
    };
  }, [items, lang]);

  // --- Order-bump: one trending product the customer can add in a single tap
  // before confirming. Fetched once; hidden once it's already in the cart.
  const [bumpPool, setBumpPool] = useState<Product[]>([]);
  const bumpFetched = useRef(false);
  useEffect(() => {
    if (bumpFetched.current) return;
    bumpFetched.current = true;
    ProductService.getTrending(10, lang)
      .catch(() =>
        ProductService.getAll(0, 10, lang, "PUBLISHED")
          .then((r) => r.content)
          .catch(() => [])
      )
      .then((list) => setBumpPool(Array.isArray(list) ? list : []));
  }, [lang]);
  const bump = useMemo(
    () => bumpPool.find((p) => !items.some((i) => i.id === p.id)) ?? null,
    [bumpPool, items]
  );

  // Applying a coupon just records the code; the backend cart quote (above)
  // validates it against the current cart — already bundle-aware — and returns the
  // final total. No separate client-side coupon call is needed.
  const applyingCoupon = quoting && !!appliedCode && !couponActive;

  const handleApplyCoupon = () => {
    const code = couponInput.trim();
    if (!code) return;
    setAppliedCode(code);
  };

  const handleRemoveCoupon = () => {
    setAppliedCode(null);
    setCouponInput("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    if (!validateAll()) return;
    if (items.length === 0) return;

    setLoading(true);
    try {
      const { firstName, lastName } = splitName(form.fullName);
      const order = await OrderService.create({
        firstName,
        lastName,
        email: form.email.trim() || undefined,
        phone: form.phone.trim(),
        city: form.city.trim(),
        address: form.address.trim(),
        note: form.note.trim() || undefined,
        couponCode: couponActive ? appliedCode ?? undefined : undefined,
        lang,
        items: cartToOrderItems(items),
      });
      track("purchase", {
        value: order.total,
        meta: { orderId: order.id, orderNumber: order.orderNumber },
      });
      // Marketing/ads Purchase — fired ONLY after the order is server-confirmed,
      // with the real order id, product ids/quantities (from the cart, still in
      // scope before clearCart) and the server-computed total. The service dedups
      // by order id (localStorage) and uses eventID `order-<id>`, so a refresh /
      // back-forward / duplicate submit can never emit a second conversion.
      trackingService.purchase({
        orderId: order.id,
        items: items.map((i) => ({ id: i.id, price: i.price, quantity: i.quantity })),
        value: order.total,
      });
      clearCart();
      setPlaced(order);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setSubmitError(msg || t(lang, "checkout.genericError"));
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
        <h1 className="text-lg font-semibold text-gray-900">{t(lang, "checkout.emptyTitle")}</h1>
        <Link
          href={continueShoppingHref}
          className="mt-6 inline-block rounded-full bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
        >
          {t(lang, "wishlist.browse")}
        </Link>
      </main>
    );
  }

  // ---- Checkout form ----
  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
      <h1 className="mb-2 text-2xl font-bold tracking-tight text-gray-900 md:text-3xl">
        {t(lang, "checkout.title")}
      </h1>
      <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1.5 text-sm font-semibold text-blue-700">
        <Truck className="size-4" />
        {t(lang, "checkout.codBadge")}
      </div>
      <Link
        href={continueShoppingHref}
        className="mb-6 flex w-fit items-center gap-1.5 text-sm font-semibold text-gray-600 transition hover:text-primary"
      >
        <ArrowLeft className="size-4 rtl:rotate-180" />
        {t(lang, "cart.continue")}
      </Link>

      <form onSubmit={handleSubmit} className="grid gap-8 lg:grid-cols-[1fr_380px] lg:gap-10">
        {/* ---- LEFT: Customer information ---- */}
        <div>
          <div className="mb-5 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-bold text-gray-900">{t(lang, "checkout.yourInfo")}</h2>
            {signedIn ? (
              <span className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-600">
                <CheckCircle2 size={16} /> {t(lang, "checkout.signedIn")}
              </span>
            ) : (
              <button
                type="button"
                onClick={() => setLoginOpen(true)}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-700"
              >
                <LogIn size={16} />
                {t(lang, "checkout.haveAccount")}
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
            <Field icon={<UserIcon size={18} />} label={t(lang, "checkout.fullName")} required value={form.fullName} onChange={update("fullName")} onBlur={blur("fullName")} error={errors.fullName} placeholder={t(lang, "checkout.fullName")} autoComplete="name" />
            <Field icon={<Mail size={18} />} label={`${t(lang, "checkout.email")} (${t(lang, "common.optional")})`} type="email" value={form.email} onChange={update("email")} onBlur={blur("email")} error={errors.email} hint={t(lang, "checkout.emailHint")} placeholder="jean@example.com" autoComplete="email" />
            <Field icon={<Phone size={18} />} label={t(lang, "checkout.phone")} required type="tel" value={form.phone} onChange={update("phone")} onBlur={blur("phone")} error={errors.phone} placeholder="0612345678" autoComplete="tel" />
            <Field icon={<MapPin size={18} />} label={t(lang, "checkout.address")} required value={form.address} onChange={update("address")} onBlur={blur("address")} error={errors.address} placeholder="Rue, quartier, n°" autoComplete="street-address" />
            <CitySelect
              label={t(lang, "checkout.city")}
              lang={lang}
              required
              value={form.city}
              onChange={(v) => {
                setForm((prev) => ({ ...prev, city: v }));
                if (touched.city) setErrors((prev) => ({ ...prev, city: validateField("city", v) }));
              }}
              onBlur={blur("city")}
              error={errors.city}
              placeholder="Casablanca"
            />
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">{t(lang, "checkout.note")} ({t(lang, "common.optional")})</label>
              <textarea
                value={form.note}
                onChange={update("note")}
                rows={3}
                placeholder={t(lang, "checkout.notePlaceholder")}
                className="w-full rounded-lg border border-gray-300 bg-surface px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 transition focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
              />
            </div>
          </div>

          <div className="mt-6 flex items-center gap-2 rounded-lg bg-gray-50 px-4 py-3 text-sm text-gray-600">
            <ShieldCheck className="size-4 text-gray-900" />
            {t(lang, "checkout.codNotice")}
          </div>
        </div>

        {/* ---- RIGHT: Order summary ---- */}
        <aside className="h-fit rounded-2xl border border-gray-200 p-6 lg:sticky lg:top-6">
          <h2 className="text-lg font-bold text-gray-900">{t(lang, "checkout.yourOrder")}</h2>

          <ul className="mt-4 space-y-3">
            {items.map((item) => (
              <CheckoutItem
                key={cartItemKey(item)}
                item={item}
                product={productMap[item.id]}
                lang={lang}
              />
            ))}
          </ul>

          <FreeShippingBar subtotal={total} itemCount={itemCount} lang={lang} className="mt-5" />

          {/* Progressive multi-item discount incentive — states the discount already
              unlocked and how much more each added item earns (no progress bar). A
              "continue shopping" link lets the shopper go add more items (to earn the
              per-item discount) — back to the collection they were browsing. */}
          {progressive && (
            <div className="mt-5">
              <ProgressiveIncentive state={progressive} lang={lang} />
              <Link
                href={continueShoppingHref}
                className="mt-2 inline-flex items-center gap-1.5 text-sm font-semibold text-blue-600 transition hover:text-blue-700"
              >
                <ArrowLeft className="size-3.5 rtl:rotate-180" />
                {t(lang, "cart.continue")}
              </Link>
            </div>
          )}

          {/* Order-bump — a single trending product added in one tap. Raises AOV
              without a detour to the product page. */}
          {bump && (
            <div className="mt-5 rounded-xl border border-dashed border-primary/40 bg-primary/[0.03] p-3">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-primary">
                {t(lang, "checkout.bumpTitle")}
              </p>
              <div className="flex items-center gap-3">
                {bump.images?.[0] && (
                  <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-gray-100">
                    <Image
                      src={thumbSrc(bump.images[0])}
                      alt={bump.name}
                      fill
                      sizes="56px"
                      className="object-cover"
                    />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-1 text-sm font-semibold text-gray-900">{bump.name}</p>
                  <p className="text-xs font-medium text-gray-500">{formatPrice(bump.price, lang)}</p>
                  <Link
                    href={`/${lang}/product/${bump.id}`}
                    className="text-xs font-medium text-blue-600 hover:text-blue-700"
                  >
                    {t(lang, "checkout.viewDetails")}
                  </Link>
                </div>
                <button
                  type="button"
                  onClick={() => quickAddProduct(bump, lang)}
                  className="inline-flex shrink-0 items-center gap-1 rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-primary-hover active:scale-95"
                >
                  <Plus className="size-3.5" />
                  {t(lang, "checkout.bumpAdd")}
                </button>
              </div>
            </div>
          )}

          {/* Coupon — shown only when the admin has enabled the block. */}
          {shippingConfig.couponEnabled && (
          <div className="mt-5 border-t border-gray-100 pt-5">
            {couponActive ? (
              <div className="flex items-center justify-between rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5">
                <span className="inline-flex items-center gap-2 text-sm font-medium text-emerald-700">
                  <Check size={16} />
                  <span className="font-mono">{quote?.couponCode ?? appliedCode}</span>
                  {t(lang, "checkout.couponApplied")}
                </span>
                <button
                  type="button"
                  onClick={handleRemoveCoupon}
                  className="inline-flex items-center gap-1 text-sm font-medium text-gray-500 hover:text-rose-600"
                >
                  <X size={14} /> {t(lang, "checkout.couponRemove")}
                </button>
              </div>
            ) : (
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  {t(lang, "checkout.couponLabel")}
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Tag size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      value={couponInput}
                      onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                      onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleApplyCoupon(); } }}
                      placeholder={t(lang, "checkout.couponPlaceholder")}
                      className="w-full rounded-lg border border-gray-300 bg-surface py-2 pl-9 pr-3 font-mono text-sm uppercase text-gray-900 placeholder:font-sans placeholder:normal-case placeholder:text-gray-400 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleApplyCoupon}
                    disabled={applyingCoupon || !couponInput.trim()}
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-gray-900 px-4 text-sm font-semibold text-gray-50 transition hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {applyingCoupon && <Loader2 size={14} className="animate-spin" />}
                    {t(lang, "checkout.couponApply")}
                  </button>
                </div>
                {couponError && (
                  <p className="mt-1.5 flex items-center gap-1 text-xs text-rose-600">
                    <AlertCircle size={12} /> {couponError}
                  </p>
                )}
              </div>
            )}
          </div>
          )}

          <dl className="mt-5 space-y-2 border-t border-gray-100 pt-5 text-sm">
            <div className="flex justify-between text-gray-600">
              <dt>{t(lang, "cart.subtotal")}</dt>
              <dd className="font-medium text-gray-900">{formatPrice(total, lang)}</dd>
            </div>
            {bundleDiscount > 0 && (
              <div className="flex justify-between text-emerald-600">
                <dt className="inline-flex items-center gap-1">
                  <Tag size={13} /> {quote?.bundleLabel || t(lang, "bundle.applied")}
                </dt>
                <dd className="font-medium">−{formatPrice(bundleDiscount, lang)}</dd>
              </div>
            )}
            {progressiveDiscount > 0 && (
              <div className="flex justify-between text-emerald-600">
                <dt className="inline-flex items-center gap-1">
                  <Tag size={13} /> {t(lang, "progressive.discountLine")}
                </dt>
                <dd className="font-medium">−{formatPrice(progressiveDiscount, lang)}</dd>
              </div>
            )}
            {couponActive && couponDiscount > 0 && (
              <div className="flex justify-between text-emerald-600">
                <dt className="inline-flex items-center gap-1">
                  <Tag size={13} /> {t(lang, "checkout.discount")}
                </dt>
                <dd className="font-medium">−{formatPrice(couponDiscount, lang)}</dd>
              </div>
            )}
            <div className="flex justify-between text-gray-600">
              <dt>{t(lang, "cart.shipping")}</dt>
              {cityChosen ? (
                <dd className={`font-medium ${effectiveShipping === 0 ? "text-emerald-600" : "text-gray-900"}`}>
                  {effectiveShipping === 0 ? t(lang, "cart.free") : formatPrice(effectiveShipping, lang)}
                </dd>
              ) : (
                <dd className="font-medium text-gray-500">{t(lang, "checkout.shippingAfterCity")}</dd>
              )}
            </div>
          </dl>

          <div className="mt-4 flex justify-between border-t border-gray-200 pt-4">
            <span className="text-base font-bold text-gray-900">{t(lang, "cart.total")}</span>
            <span className="text-base font-bold text-gray-900">{formatPrice(displayTotal, lang)}</span>
          </div>

          <button
            type="submit"
            disabled={loading || !canSubmit}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-full bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {loading && <Loader2 size={18} className="animate-spin" />}
            {loading ? t(lang, "checkout.confirming") : t(lang, "checkout.placeOrder")}
          </button>

          {/* Last-second reassurance — the three objections right before the click. */}
          <ul className="mt-4 flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 text-xs font-medium text-gray-500">
            <li className="inline-flex items-center gap-1.5"><Wallet className="size-3.5 text-emerald-600" />{t(lang, "product.trustCod")}</li>
            <li className="inline-flex items-center gap-1.5"><Truck className="size-3.5 text-emerald-600" />{t(lang, "product.trustEta")}</li>
          </ul>

          <Link href={`/${lang}/cart`} className="mt-3 block text-center text-sm font-medium text-blue-600 hover:text-blue-700">
            {t(lang, "checkout.backToCart")}
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
  const dateLocale = lang === "ar" ? "ar" : lang === "en" ? "en-GB" : "fr-FR";
  const eta = order.estimatedDelivery
    ? new Date(order.estimatedDelivery).toLocaleDateString(dateLocale, {
        weekday: "long", day: "numeric", month: "long",
      })
    : t(lang, "checkout.etaFallback");

  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <div className="flex flex-col items-center rounded-2xl border border-gray-200 p-8 text-center sm:p-10">
        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
          <CheckCircle2 size={34} />
        </span>
        <h1 className="mt-5 text-2xl font-bold text-gray-900">{t(lang, "checkout.confirmedTitle")}</h1>
        <p className="mt-2 text-gray-600">
          {t(lang, "checkout.thanks", { name: order.customerName?.split(" ")[0] ?? "" })}
        </p>

        <div className="mt-5 w-full rounded-xl bg-gray-50 p-4 text-left">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">{t(lang, "checkout.orderNumber")}</span>
            <span className="font-mono text-sm font-bold text-gray-900">{ref}</span>
          </div>
          <div className="mt-2 flex items-center justify-between">
            <span className="text-sm text-gray-500">{t(lang, "checkout.estDelivery")}</span>
            <span className="text-sm font-medium text-gray-900">{eta}</span>
          </div>
          {order.discountAmount > 0 && (
            <div className="mt-2 flex items-center justify-between">
              <span className="text-sm text-emerald-600">
                {t(lang, "checkout.discount")}
                {order.appliedCouponCode ? ` (${order.appliedCouponCode})` : ""}
              </span>
              <span className="text-sm font-medium text-emerald-600">−{formatPrice(order.discountAmount, lang)}</span>
            </div>
          )}
          <div className="mt-2 flex items-center justify-between">
            <span className="text-sm text-gray-500">{t(lang, "checkout.totalToPay")}</span>
            <span className="text-sm font-bold text-gray-900">{formatPrice(order.total, lang)}</span>
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
                {it.variant && <p className="text-xs text-gray-500">{formatVariant(it.variant, lang)}</p>}
                <p className="text-xs text-gray-500">{it.quantity} × {formatPrice(it.unitPrice, lang)}</p>
              </div>
              <span className="text-sm font-semibold text-gray-900">{formatPrice(it.lineTotal, lang)}</span>
            </li>
          ))}
        </ul>

        <p className="mt-4 text-sm text-gray-500">
          {t(lang, "checkout.callNotice", { phone: order.phone ?? "" })}
        </p>

        <div className="mt-7 flex w-full flex-col gap-3 sm:flex-row sm:justify-center">
          <Link
            href={`/order-tracking?order=${encodeURIComponent(order.orderNumber || "")}`}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
          >
            <Package size={16} /> {t(lang, "checkout.track")}
          </Link>
          {!signedIn && (
            <Link
              href={`/signup?redirect=/${lang}`}
              className="inline-flex items-center justify-center gap-2 rounded-full border border-gray-300 px-6 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
            >
              {t(lang, "checkout.createAccount")}
            </Link>
          )}
        </div>

        <Link href={`/${lang}`} className="mt-5 text-sm font-medium text-blue-600 hover:text-blue-700">
          {t(lang, "cart.continue")}
        </Link>
      </div>
    </main>
  );
}

function Field({
  icon, label, value, onChange, onBlur, placeholder, type = "text",
  required, error, autoComplete, hint,
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
  // Optional gentle helper text shown under the field (when there is no error).
  hint?: string;
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
          className={`w-full rounded-lg border bg-surface py-2.5 ${icon ? "pl-10" : "pl-3"} pr-3 text-sm text-gray-900 placeholder:text-gray-400 transition focus:outline-none focus:ring-2 ${
            error
              ? "border-red-400 focus:border-red-500 focus:ring-red-500/20"
              : "border-gray-300 focus:border-blue-600 focus:ring-blue-600/20"
          }`}
        />
      </div>
      {error ? (
        <p className="mt-1 flex items-center gap-1 text-xs text-red-600">
          <AlertCircle size={12} /> {error}
        </p>
      ) : (
        hint && <p className="mt-1 text-xs text-gray-500">{hint}</p>
      )}
    </div>
  );
}
