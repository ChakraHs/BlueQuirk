"use client";

import { use } from "react";
import Image from "next/image";
import Link from "next/link";
import { Minus, Plus, Trash2, ShoppingBag, Truck } from "lucide-react";
import {
  useCart,
  cartItemKey,
  cartTotal,
  setQuantity,
  removeFromCart,
  clearCart,
} from "@/lib/cart";
import { formatPrice } from "@/lib/money";
import { useShippingConfig, computeShipping } from "@/lib/shipping";
import FreeShippingBar from "@/components/storefront/FreeShippingBar";
import { t } from "@/lib/i18n";

export default function CartPage({
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

  if (items.length === 0) {
    return (
      <main className="mx-auto max-w-7xl px-6 py-16">
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 py-20 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-gray-100 text-gray-400">
            <ShoppingBag size={26} />
          </span>
          <h1 className="mt-5 text-lg font-semibold text-gray-900">
            {t(lang, "cart.empty")}
          </h1>
          <p className="mt-1 max-w-sm text-sm text-gray-500">
            {t(lang, "cart.emptyHint")}
          </p>
          <Link
            href={`/${lang}`}
            className="mt-6 rounded-full bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
          >
            {t(lang, "cart.startShopping")}
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-7xl px-6 py-10">
      <h1 className="mb-8 text-2xl font-bold tracking-tight text-gray-900 md:text-3xl">
        {t(lang, "cart.title")}
      </h1>

      <div className="grid gap-10 lg:grid-cols-[1fr_360px]">
        {/* Items */}
        <div className="divide-y divide-gray-100 rounded-2xl border border-gray-200">
          {items.map((item) => {
            const key = cartItemKey(item);
            const attrs = Object.entries(item.attributes).filter(([, v]) => v);
            return (
              <div key={key} className="flex gap-4 p-4 sm:p-5">
                <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-gray-100">
                  <Image
                    src={item.image}
                    alt={item.name}
                    fill
                    sizes="96px"
                    className="object-cover"
                  />
                </div>

                <div className="flex flex-1 flex-col">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <Link
                        href={`/${lang}/product/${item.id}`}
                        className="text-sm font-semibold text-gray-900 hover:text-blue-600"
                      >
                        {item.name}
                      </Link>
                      {attrs.length > 0 && (
                        <p className="mt-0.5 text-xs text-gray-500">
                          {attrs.map(([k, v]) => `${k}: ${v}`).join(" · ")}
                        </p>
                      )}
                    </div>
                    <p className="text-sm font-bold text-gray-900">
                      {formatPrice(item.price * item.quantity)}
                    </p>
                  </div>

                  <div className="mt-auto flex items-center justify-between pt-3">
                    <div className="flex h-9 items-center overflow-hidden rounded-full border border-gray-300">
                      <button
                        type="button"
                        onClick={() => setQuantity(key, item.quantity - 1)}
                        className="flex h-full w-9 items-center justify-center hover:bg-gray-50"
                        aria-label={t(lang, "product.decreaseQty")}
                      >
                        <Minus className="size-4" />
                      </button>
                      <span className="w-9 text-center text-sm font-semibold">
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => setQuantity(key, item.quantity + 1)}
                        className="flex h-full w-9 items-center justify-center hover:bg-gray-50"
                        aria-label={t(lang, "product.increaseQty")}
                      >
                        <Plus className="size-4" />
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => removeFromCart(key)}
                      className="flex items-center gap-1.5 text-sm font-medium text-gray-500 transition hover:text-red-600"
                    >
                      <Trash2 className="size-4" />
                      {t(lang, "cart.remove")}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Summary */}
        <aside className="h-fit rounded-2xl border border-gray-200 p-6">
          <FreeShippingBar subtotal={total} lang={lang} className="mb-5" />

          <h2 className="text-lg font-bold text-gray-900">{t(lang, "checkout.orderSummary")}</h2>

          <dl className="mt-5 space-y-3 text-sm">
            <div className="flex justify-between text-gray-600">
              <dt>{t(lang, "cart.subtotal")}</dt>
              <dd className="font-medium text-gray-900">{formatPrice(total)}</dd>
            </div>
            <div className="flex justify-between text-gray-600">
              <dt>{t(lang, "cart.shipping")}</dt>
              <dd className={`font-medium ${shipping === 0 ? "text-emerald-600" : "text-gray-900"}`}>
                {shipping === 0 ? t(lang, "cart.free") : formatPrice(shipping)}
              </dd>
            </div>
          </dl>

          <div className="mt-5 flex justify-between border-t border-gray-200 pt-5">
            <span className="text-base font-bold text-gray-900">{t(lang, "cart.total")}</span>
            <span className="text-base font-bold text-gray-900">
              {formatPrice(grandTotal)}
            </span>
          </div>

          <Link
            href={`/${lang}/checkout`}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-full bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
          >
            <Truck className="size-4" />
            {t(lang, "cart.orderCod")}
          </Link>

          <div className="mt-4 flex items-center justify-between text-sm">
            <Link
              href={`/${lang}`}
              className="font-medium text-blue-600 hover:text-blue-700"
            >
              {t(lang, "cart.continue")}
            </Link>
            <button
              type="button"
              onClick={clearCart}
              className="font-medium text-gray-400 hover:text-red-600"
            >
              {t(lang, "cart.clear")}
            </button>
          </div>
        </aside>
      </div>
    </main>
  );
}
