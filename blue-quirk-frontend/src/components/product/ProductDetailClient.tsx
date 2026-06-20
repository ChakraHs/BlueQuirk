"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { Check, Minus, Plus, RotateCcw, ShieldCheck, ShoppingBag, Truck } from "lucide-react";
import { Product } from "@/types/product";

const FALLBACK_IMAGE =
  "https://images.ctfassets.net/5hig0ukq7ib0/bUmu6RBCWC5TTscquxd16/041978fd5b8a89923e2bcf646f24c71c/2352468_LocalizationUpdates40offPromo_800x800_1_081824.jpg?fm=jpg&q=85&w=800&fl=progressive";

type CartItem = {
  id: number;
  name: string;
  price: number;
  image: string;
  quantity: number;
  lang: string;
  attributes: Record<string, string>;
};

function getInitialSelection(product: Product) {
  return Object.fromEntries(
    (product.attributes ?? []).map((attribute) => {
      const selectedValue = attribute.values.find((value) => value.selected) ?? attribute.values[0];
      return [String(attribute.id), selectedValue ? String(selectedValue.id) : ""];
    })
  );
}

function readCart(): CartItem[] {
  try {
    return JSON.parse(localStorage.getItem("bluequirk_cart") ?? "[]") as CartItem[];
  } catch {
    return [];
  }
}

export default function ProductDetailClient({
  product,
  lang,
}: {
  product: Product;
  lang: string;
}) {
  const images = product.images?.length ? product.images.map((image) => image.url) : [FALLBACK_IMAGE];
  const [activeImage, setActiveImage] = useState(images[0]);
  const [quantity, setQuantity] = useState(1);
  const [selectedAttributes, setSelectedAttributes] = useState(() => getInitialSelection(product));
  const [added, setAdded] = useState(false);

  const canBuy = product.status === "PUBLISHED";

  const selectedAttributeLabels = useMemo(() => {
    return Object.fromEntries(
      (product.attributes ?? []).map((attribute) => {
        const selectedId = selectedAttributes[String(attribute.id)];
        const selectedValue = attribute.values.find((value) => String(value.id) === selectedId);
        return [attribute.name, selectedValue?.value ?? ""];
      })
    );
  }, [product.attributes, selectedAttributes]);

  const addToCart = () => {
    if (!canBuy) {
      return;
    }

    const cart = readCart();
    const cartItem: CartItem = {
      id: product.id,
      name: product.name,
      price: product.price,
      image: activeImage,
      quantity,
      lang,
      attributes: selectedAttributeLabels,
    };
    const cartKey = JSON.stringify({
      id: cartItem.id,
      lang: cartItem.lang,
      attributes: cartItem.attributes,
    });
    const existingIndex = cart.findIndex((item) => {
      const itemKey = JSON.stringify({
        id: item.id,
        lang: item.lang,
        attributes: item.attributes,
      });
      return itemKey === cartKey;
    });

    if (existingIndex >= 0) {
      cart[existingIndex] = {
        ...cart[existingIndex],
        quantity: cart[existingIndex].quantity + quantity,
      };
    } else {
      cart.push(cartItem);
    }

    localStorage.setItem("bluequirk_cart", JSON.stringify(cart));
    setAdded(true);
    window.setTimeout(() => setAdded(false), 2200);
  };

  return (
    <div className="mx-auto grid max-w-7xl gap-10 px-6 py-8 md:grid-cols-[minmax(0,1.05fr)_minmax(360px,0.95fr)] md:px-12 md:py-12">
      <section aria-label="Product images" className="space-y-4">
        <div className="relative aspect-[4/5] overflow-hidden rounded-sm bg-gray-100">
          <Image
            src={activeImage}
            alt={product.name}
            fill
            priority
            sizes="(max-width: 768px) 100vw, 55vw"
            className="object-cover"
          />
        </div>

        {images.length > 1 && (
          <div className="grid grid-cols-5 gap-3">
            {images.map((image) => (
              <button
                key={image}
                type="button"
                onClick={() => setActiveImage(image)}
                className={`relative aspect-square overflow-hidden rounded-sm border bg-gray-100 ${
                  activeImage === image ? "border-gray-950" : "border-gray-200"
                }`}
                aria-label="Select product image"
              >
                <Image src={image} alt="" fill sizes="96px" className="object-cover" />
              </button>
            ))}
          </div>
        )}
      </section>

      <section className="flex flex-col gap-7 text-gray-900">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium uppercase tracking-wide text-gray-600">
              {product.status}
            </span>
            {canBuy && (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
                <Check className="size-3" />
                In stock
              </span>
            )}
          </div>

          <h1 className="text-3xl font-semibold leading-tight md:text-5xl">
            {product.name}
          </h1>

          <p className="text-2xl font-semibold">
            ${product.price.toFixed(2)}
          </p>
        </div>

        {product.description && (
          <div
            className="prose prose-sm max-w-none text-gray-600"
            dangerouslySetInnerHTML={{ __html: product.description }}
          />
        )}

        {!!product.attributes?.length && (
          <div className="space-y-5">
            {product.attributes.map((attribute) => (
              <fieldset key={attribute.id} className="space-y-3">
                <legend className="text-sm font-semibold text-gray-800">
                  {attribute.name}
                </legend>

                <div className="flex flex-wrap gap-2">
                  {attribute.values.map((value) => {
                    const selected = selectedAttributes[String(attribute.id)] === String(value.id);

                    return (
                      <button
                        key={value.id}
                        type="button"
                        onClick={() =>
                          setSelectedAttributes((current) => ({
                            ...current,
                            [String(attribute.id)]: String(value.id),
                          }))
                        }
                        className={`min-h-10 rounded-sm border px-4 text-sm font-medium transition ${
                          selected
                            ? "border-gray-950 bg-gray-950 text-white"
                            : "border-gray-300 bg-white text-gray-700 hover:border-gray-700"
                        }`}
                      >
                        {value.value}
                      </button>
                    );
                  })}
                </div>
              </fieldset>
            ))}
          </div>
        )}

        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="grid h-12 w-full grid-cols-3 overflow-hidden rounded-sm border border-gray-300 sm:w-36">
            <button
              type="button"
              onClick={() => setQuantity((value) => Math.max(1, value - 1))}
              className="flex items-center justify-center hover:bg-gray-50"
              aria-label="Decrease quantity"
            >
              <Minus className="size-4" />
            </button>
            <div className="flex items-center justify-center text-sm font-semibold">
              {quantity}
            </div>
            <button
              type="button"
              onClick={() => setQuantity((value) => value + 1)}
              className="flex items-center justify-center hover:bg-gray-50"
              aria-label="Increase quantity"
            >
              <Plus className="size-4" />
            </button>
          </div>

          <button
            type="button"
            onClick={addToCart}
            disabled={!canBuy}
            className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-sm bg-gray-950 px-5 text-sm font-semibold text-white transition hover:bg-black disabled:cursor-not-allowed disabled:bg-gray-300"
          >
            <ShoppingBag className="size-4" />
            {canBuy ? "Add to cart" : "Unavailable"}
          </button>
        </div>

        {added && (
          <p className="rounded-sm bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
            Added to cart.
          </p>
        )}

        <div className="grid gap-3 border-t border-gray-200 pt-6 text-sm text-gray-600 sm:grid-cols-3">
          <div className="flex items-start gap-2">
            <Truck className="mt-0.5 size-4 text-gray-900" />
            <span>Morocco-wide delivery</span>
          </div>
          <div className="flex items-start gap-2">
            <ShieldCheck className="mt-0.5 size-4 text-gray-900" />
            <span>Secure checkout</span>
          </div>
          <div className="flex items-start gap-2">
            <RotateCcw className="mt-0.5 size-4 text-gray-900" />
            <span>Easy returns</span>
          </div>
        </div>
      </section>
    </div>
  );
}
