"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Check, Gift, ShoppingBag, X } from "lucide-react";
import { CART_ADD_EVENT, useCart, cartTotal, cartCount, type CartItem } from "@/lib/cart";
import { useCartQuote } from "@/lib/bundle";
import { useProgressiveConfig, progressiveState } from "@/lib/progressive";
import { ProductService } from "@/services/product.service";
import type { Product } from "@/types/product";
import { thumbSrc } from "@/lib/productImage";
import { formatPrice } from "@/lib/money";
import { t } from "@/lib/i18n";

const FALLBACK_IMAGE =
  "https://images.ctfassets.net/5hig0ukq7ib0/bUmu6RBCWC5TTscquxd16/041978fd5b8a89923e2bcf646f24c71c/2352468_LocalizationUpdates40offPromo_800x800_1_081824.jpg?fm=jpg&q=85&w=400&fl=progressive";

/**
 * Redbubble-style "added to cart" slide-over. Opens (from the bottom on mobile,
 * centered on desktop, ~85vh) whenever a line is added to the cart, showing the
 * just-added product, an automatic-discount nudge, the cart subtotal/total, a strip
 * of similar products, and a sticky Checkout button. Closing (X / backdrop / Esc)
 * simply continues shopping. Mounted once in the [lang] layout, so it works from any
 * add-to-cart surface (product page, wishlist, bundle builder).
 */
export default function CartAddedSheet({ lang }: { lang: string }) {
  const [open, setOpen] = useState(false);
  const [justAdded, setJustAdded] = useState<CartItem | null>(null);
  const items = useCart();

  const quoteItems = useMemo(() => items.map((i) => ({ id: i.id, quantity: i.quantity })), [items]);
  const { quote } = useCartQuote(quoteItems);
  const config = useProgressiveConfig();

  const [similar, setSimilar] = useState<Product[]>([]);
  const fetchedSimilar = useRef(false);

  // Open on every real add, remembering which line was added.
  useEffect(() => {
    const onAdd = (e: Event) => {
      setJustAdded((e as CustomEvent<CartItem>).detail ?? null);
      setOpen(true);
    };
    window.addEventListener(CART_ADD_EVENT, onAdd);
    return () => window.removeEventListener(CART_ADD_EVENT, onAdd);
  }, []);

  // Lock body scroll + close on Esc while open.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open]);

  // Fetch "you may also like" once, the first time the sheet opens.
  useEffect(() => {
    if (!open || fetchedSimilar.current) return;
    fetchedSimilar.current = true;
    ProductService.getTrending(10, lang)
      .catch(() =>
        ProductService.getAll(0, 10, lang, "PUBLISHED")
          .then((r) => r.content)
          .catch(() => [])
      )
      .then((list) => setSimilar(Array.isArray(list) ? list : []));
  }, [open, lang]);

  if (!open) return null;

  const subtotal = quote?.subtotal ?? cartTotal(items);
  const discount = quote?.totalDiscount ?? 0;
  const total = quote?.total ?? subtotal;
  const count = cartCount(items);

  // Automatic multi-item discount nudge (reuses the centralized progressive logic).
  const st = progressiveState(quote);
  let discountMsg: string | null = null;
  if (st?.applied && st.discount > 0) {
    discountMsg = t(lang, "progressive.currentUnlocked", { amount: formatPrice(st.discount, lang) });
    if (st.nextDiscount > st.discount) {
      discountMsg += " · " + t(lang, "progressive.addOneMore", { amount: formatPrice(st.nextDiscount, lang) });
    }
  } else if (st && st.nextDiscount > 0) {
    discountMsg = t(lang, "progressive.addOneMore", { amount: formatPrice(st.nextDiscount, lang) });
  } else if (config && config.discountPerAdditionalItem > 0) {
    discountMsg = t(lang, "progressive.addOneMore", {
      amount: formatPrice(config.discountPerAdditionalItem, lang),
    });
  }

  const similarProducts = similar.filter((p) => !items.some((i) => i.id === p.id)).slice(0, 6);
  const variantLabel = justAdded
    ? Object.entries(justAdded.attributes ?? {})
        .filter(([, v]) => v)
        .map(([k, v]) => `${k}: ${v}`)
        .join(" · ")
    : "";

  const close = () => setOpen(false);

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end justify-center"
      role="dialog"
      aria-modal="true"
      aria-label={t(lang, "cartsheet.added")}
    >
      <div className="absolute inset-0 bg-black/50 backdrop-blur-[1px]" onClick={close} />

      {/* Full-width bottom sheet: spans the whole width and rises 80% of the viewport
          height from the bottom edge (top corners rounded). */}
      <div className="relative flex h-[80vh] w-full flex-col overflow-hidden rounded-t-3xl bg-surface shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3.5">
          <span className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-700">
            <span className="flex size-5 items-center justify-center rounded-full bg-emerald-100">
              <Check className="size-3.5" />
            </span>
            {t(lang, "cartsheet.added")}
          </span>
          <button
            onClick={close}
            aria-label={t(lang, "reviews.close")}
            className="rounded-full p-1.5 text-gray-500 transition hover:bg-gray-100 hover:text-gray-900"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {/* Just-added product */}
          {justAdded && (
            <div className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-gray-50/60 p-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={justAdded.image || FALLBACK_IMAGE}
                alt=""
                className="size-16 shrink-0 rounded-xl border border-gray-100 bg-white object-cover"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-gray-900">{justAdded.name}</p>
                {variantLabel && <p className="truncate text-xs text-gray-500">{variantLabel}</p>}
                <p className="mt-0.5 text-xs text-gray-500">
                  {justAdded.quantity} × {formatPrice(justAdded.price, lang)}
                </p>
              </div>
            </div>
          )}

          {count > (justAdded?.quantity ?? 0) && (
            <p className="mt-2 text-xs text-gray-400">{t(lang, "cartsheet.inCart", { n: count })}</p>
          )}

          {/* Automatic-discount nudge */}
          {discountMsg && (
            <div className="mt-3 flex items-center gap-2 rounded-xl border border-primary/25 bg-primary/[0.05] px-3.5 py-2.5 text-xs font-semibold text-gray-800">
              <Gift className="size-4 shrink-0 text-primary" />
              <span>{discountMsg}</span>
            </div>
          )}

          {/* Totals */}
          <div className="mt-4 space-y-1.5 border-t border-gray-100 pt-4 text-sm">
            <div className="flex justify-between text-gray-500">
              <span>{t(lang, "cart.subtotal")}</span>
              <span>{formatPrice(subtotal, lang)}</span>
            </div>
            {discount > 0 && (
              <div className="flex justify-between font-medium text-emerald-600">
                <span>{t(lang, "checkout.discount")}</span>
                <span>−{formatPrice(discount, lang)}</span>
              </div>
            )}
            <div className="flex justify-between pt-0.5 text-base font-bold text-gray-900">
              <span>{t(lang, "cart.total")}</span>
              <span>{formatPrice(total, lang)}</span>
            </div>
          </div>

          {/* Similar products */}
          {similarProducts.length > 0 && (
            <div className="mt-6">
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">
                {t(lang, "product.relatedTitle")}
              </h3>
              <div className="grid grid-cols-3 gap-3">
                {similarProducts.map((p) => {
                  const img = p.images?.[0] ? thumbSrc(p.images[0]) : FALLBACK_IMAGE;
                  return (
                    <Link
                      key={p.id}
                      href={`/${lang}/product/${p.id}`}
                      onClick={close}
                      className="group block"
                    >
                      <div className="aspect-square overflow-hidden rounded-xl border border-gray-200 bg-gray-100">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={img}
                          alt={p.name}
                          loading="lazy"
                          className="size-full object-contain transition duration-300 group-hover:scale-105"
                        />
                      </div>
                      <p className="mt-1 truncate text-[11px] font-medium text-gray-600 group-hover:text-gray-900">
                        {p.name}
                      </p>
                      <p className="text-[11px] font-semibold text-gray-900">
                        {formatPrice(p.price, lang)}
                      </p>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Sticky footer */}
        <div
          className="space-y-2 border-t border-gray-100 p-4"
          style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}
        >
          <Link
            href={`/${lang}/checkout`}
            onClick={close}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-primary px-5 text-sm font-semibold text-white shadow-[0_8px_20px_-6px_rgba(220,38,38,0.5)] transition hover:bg-primary-hover"
          >
            <ShoppingBag className="size-4" />
            {t(lang, "cart.checkout")} · {formatPrice(total, lang)}
          </Link>
          <button
            onClick={close}
            className="w-full rounded-full py-2 text-sm font-medium text-gray-500 transition hover:text-gray-900"
          >
            {t(lang, "cart.continue")}
          </button>
        </div>
      </div>
    </div>
  );
}
