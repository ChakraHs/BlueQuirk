"use client";

// Quick-add: put a product straight into the cart from an upsell surface (the
// "you may also like" strip in the added-to-cart sheet, the checkout order-bump)
// WITHOUT a trip to the product page. It picks the product's default variant —
// the first value the product actually exposes for each attribute, mirroring how
// the product page pre-selects its initial selection — so the cart line always
// carries a concrete size/colour.
import { addToCart, type CartItem } from "@/lib/cart";
import { thumbSrc } from "@/lib/productImage";
import type { Product } from "@/types/product";

const FALLBACK_IMAGE =
  "https://images.ctfassets.net/5hig0ukq7ib0/bUmu6RBCWC5TTscquxd16/041978fd5b8a89923e2bcf646f24c71c/2352468_LocalizationUpdates40offPromo_800x800_1_081824.jpg?fm=jpg&q=85&w=400&fl=progressive";

/** First value the product exposes for each attribute (selected-first). */
function defaultAttributes(product: Product): Record<string, string> {
  const out: Record<string, string> = {};
  for (const attribute of product.attributes ?? []) {
    const chosen =
      attribute.values.find((v) => v.selected) ?? attribute.values[0];
    if (chosen) out[attribute.name] = chosen.value;
  }
  return out;
}

/** Add a product to the cart with its default variant. Reuses addToCart, so the
 *  added-to-cart sheet, totals, and Meta AddToCart all fire exactly as usual. */
export function quickAddProduct(product: Product, lang: string, quantity = 1) {
  const image = product.images?.[0] ? thumbSrc(product.images[0]) : FALLBACK_IMAGE;
  const item: CartItem = {
    id: product.id,
    name: product.name,
    price: product.price,
    image,
    quantity,
    lang,
    attributes: defaultAttributes(product),
  };
  addToCart(item);
}
