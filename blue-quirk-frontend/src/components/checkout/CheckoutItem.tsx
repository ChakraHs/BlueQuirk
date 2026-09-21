"use client";

import { useState } from "react";
import Image from "next/image";
import { Check, Minus, Pencil, Plus, Trash2 } from "lucide-react";
import {
  cartItemKey,
  setQuantity,
  removeFromCart,
  updateItemAttributes,
  type CartItem,
} from "@/lib/cart";
import type { Product, ProductAttribute } from "@/types/product";
import { findColorAttribute, findSizeAttribute, imagesForColor } from "@/lib/colorImages";
import { colorLabel, colorSwatch, isLightColor } from "@/lib/colors";
import { formatPrice } from "@/lib/money";
import { thumbSrc } from "@/lib/productImage";
import { t } from "@/lib/i18n";

/** Values the product actually offers for an attribute (selected-first). */
function optionsOf(attr?: ProductAttribute) {
  if (!attr) return [];
  const selected = attr.values.filter((v) => v.selected);
  return selected.length ? selected : attr.values;
}

/**
 * One line of the checkout order summary. Shows the product's image, name,
 * colour, size, quantity and price — and lets the shopper edit the size/colour
 * inline, adjust the quantity, or remove the line. Every mutation writes straight
 * to the cart, so the page totals and discounts re-price immediately.
 *
 * `product` carries the full attribute set (available sizes/colours) and is
 * fetched by the checkout page. Until it arrives the colour/size render as plain
 * (non-editable) chips, so no information is ever hidden.
 */
export default function CheckoutItem({
  item,
  product,
  lang,
}: {
  item: CartItem;
  product?: Product;
  lang: string;
}) {
  const key = cartItemKey(item);
  const [editing, setEditing] = useState<null | "color" | "size">(null);

  const colorAttr = findColorAttribute(product?.attributes);
  const sizeAttr = findSizeAttribute(product?.attributes);
  const colorValues = optionsOf(colorAttr);
  const sizeValues = optionsOf(sizeAttr);

  const currentColor = colorAttr ? item.attributes[colorAttr.name] : undefined;
  const currentSize = sizeAttr ? item.attributes[sizeAttr.name] : undefined;

  // Any remaining variant attributes (neither colour nor size) stay read-only.
  const staticAttrs = Object.entries(item.attributes).filter(
    ([name, value]) => value && name !== colorAttr?.name && name !== sizeAttr?.name
  );

  const chooseColor = (value: string, valueId: number) => {
    if (!colorAttr) return;
    // Swap the thumbnail to the chosen colour's image when the product has one.
    const img = imagesForColor(product?.images ?? [], valueId)[0];
    updateItemAttributes(
      key,
      { ...item.attributes, [colorAttr.name]: value },
      img ? thumbSrc(img) : undefined
    );
    setEditing(null);
  };

  const chooseSize = (value: string) => {
    if (!sizeAttr) return;
    updateItemAttributes(key, { ...item.attributes, [sizeAttr.name]: value });
    setEditing(null);
  };

  const canEditColor = colorAttr && currentColor && colorValues.length > 1;
  const canEditSize = sizeAttr && currentSize && sizeValues.length > 1;

  return (
    <li className="rounded-xl border border-gray-200 p-3">
      <div className="flex gap-3">
        <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-gray-100">
          <Image src={item.image} alt={item.name} fill sizes="64px" className="object-cover" />
          <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-blue-600 px-1 text-[11px] font-bold text-white">
            {item.quantity}
          </span>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <span className="line-clamp-2 text-sm font-semibold text-gray-900">{item.name}</span>
            <span className="shrink-0 text-sm font-bold text-gray-900">
              {formatPrice(item.price * item.quantity, lang)}
            </span>
          </div>

          {/* Variant chips — colour + size are tap-to-edit; others are read-only. */}
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            {currentColor && (
              <button
                type="button"
                onClick={canEditColor ? () => setEditing((e) => (e === "color" ? null : "color")) : undefined}
                aria-label={`${t(lang, "search.color")}: ${colorLabel(currentColor, lang)}`}
                aria-pressed={editing === "color"}
                disabled={!canEditColor}
                className={`inline-flex items-center gap-1.5 rounded-full border py-1 pl-1.5 pr-2 text-xs font-medium text-gray-700 transition ${
                  editing === "color" ? "border-gray-400 bg-gray-100" : "border-gray-200 bg-gray-50"
                } ${canEditColor ? "hover:border-gray-300" : "cursor-default"}`}
              >
                <span
                  className="size-3.5 shrink-0 rounded-full border border-black/10"
                  style={{ backgroundColor: colorSwatch(currentColor) }}
                />
                {colorLabel(currentColor, lang)}
                {canEditColor && <Pencil className="size-3 text-gray-400" />}
              </button>
            )}
            {currentSize && (
              <button
                type="button"
                onClick={canEditSize ? () => setEditing((e) => (e === "size" ? null : "size")) : undefined}
                aria-label={`${t(lang, "search.size")}: ${currentSize}`}
                aria-pressed={editing === "size"}
                disabled={!canEditSize}
                className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium text-gray-700 transition ${
                  editing === "size" ? "border-gray-400 bg-gray-100" : "border-gray-200 bg-gray-50"
                } ${canEditSize ? "hover:border-gray-300" : "cursor-default"}`}
              >
                {t(lang, "search.size")}: {currentSize}
                {canEditSize && <Pencil className="size-3 text-gray-400" />}
              </button>
            )}
            {staticAttrs.map(([name, value]) => (
              <span
                key={name}
                className="rounded-full bg-gray-50 px-2.5 py-1 text-xs text-gray-500"
              >
                {colorLabel(value, lang)}
              </span>
            ))}
          </div>

          {/* Inline colour editor */}
          {editing === "color" && (
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              {colorValues.map((v) => {
                const selected = v.value === currentColor;
                const hex = colorSwatch(v.value);
                return (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => chooseColor(v.value, v.id)}
                    title={colorLabel(v.value, lang)}
                    aria-label={colorLabel(v.value, lang)}
                    aria-pressed={selected}
                    className={`relative flex size-7 items-center justify-center rounded-full transition ${
                      selected
                        ? "ring-2 ring-gray-900 ring-offset-1"
                        : "hover:ring-2 hover:ring-gray-300 hover:ring-offset-1"
                    }`}
                  >
                    <span
                      className={`size-5 rounded-full ${isLightColor(hex) ? "border border-gray-300" : ""}`}
                      style={{ backgroundColor: hex }}
                    />
                    {selected && (
                      <Check className={`absolute size-3 ${isLightColor(hex) ? "text-gray-800" : "text-white"}`} />
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {/* Inline size editor */}
          {editing === "size" && (
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              {sizeValues.map((v) => {
                const selected = v.value === currentSize;
                return (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => chooseSize(v.value)}
                    className={`min-h-7 rounded-full border px-3 text-xs font-medium transition ${
                      selected
                        ? "border-blue-600 bg-blue-600 text-white"
                        : "border-gray-300 bg-surface text-gray-700 hover:border-blue-400"
                    }`}
                  >
                    {v.value}
                  </button>
                );
              })}
            </div>
          )}

          {/* Quantity stepper + remove. The line price already shows at the top,
              so no unit price is repeated here. */}
          <div className="mt-2.5 flex items-center justify-between">
            <div className="inline-flex h-8 items-center overflow-hidden rounded-full border border-gray-300 bg-surface">
              <button
                type="button"
                onClick={() => setQuantity(key, item.quantity - 1)}
                disabled={item.quantity <= 1}
                aria-label={t(lang, "product.decreaseQty")}
                className="flex h-full w-8 items-center justify-center text-gray-600 transition hover:bg-gray-100 disabled:opacity-40"
              >
                <Minus className="size-3.5" />
              </button>
              <span className="w-7 text-center text-sm font-semibold tabular-nums">{item.quantity}</span>
              <button
                type="button"
                onClick={() => setQuantity(key, item.quantity + 1)}
                aria-label={t(lang, "product.increaseQty")}
                className="flex h-full w-8 items-center justify-center text-gray-600 transition hover:bg-gray-100"
              >
                <Plus className="size-3.5" />
              </button>
            </div>
            <button
              type="button"
              onClick={() => removeFromCart(key)}
              aria-label={t(lang, "cart.remove")}
              className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium text-gray-400 transition hover:bg-rose-50 hover:text-rose-600"
            >
              <Trash2 className="size-3.5" />
              {t(lang, "cart.remove")}
            </button>
          </div>
        </div>
      </div>
    </li>
  );
}
