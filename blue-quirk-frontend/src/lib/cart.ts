"use client";

import { useEffect, useState } from "react";
import { track } from "@/lib/analytics/tracker";
import { trackingService } from "@/lib/tracking/service";

export type CartItem = {
  id: number;
  name: string;
  price: number;
  image: string;
  quantity: number;
  lang: string;
  attributes: Record<string, string>;
};

const KEY = "bluequirk_cart";
export const CART_EVENT = "bluequirk_cart_change";
// Fired (with the added line as `detail`) right after a successful add — drives the
// "added to cart" slide-over. Separate from CART_EVENT (which is any change, incl.
// quantity edits / removals) so the sheet only pops on a real add.
export const CART_ADD_EVENT = "bluequirk_cart_added";

export function readCart(): CartItem[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "[]") as CartItem[];
  } catch {
    return [];
  }
}

function writeCart(items: CartItem[]) {
  localStorage.setItem(KEY, JSON.stringify(items));
  window.dispatchEvent(new Event(CART_EVENT));
}

/** Stable identity for a cart line: same product + lang + variant selection. */
export function cartItemKey(item: Pick<CartItem, "id" | "lang" | "attributes">) {
  return JSON.stringify({ id: item.id, lang: item.lang, attributes: item.attributes });
}

export function addToCart(item: CartItem) {
  const cart = readCart();
  const key = cartItemKey(item);
  const index = cart.findIndex((line) => cartItemKey(line) === key);

  if (index >= 0) {
    cart[index] = { ...cart[index], quantity: cart[index].quantity + item.quantity };
  } else {
    cart.push(item);
  }
  writeCart(cart);
  // Announce the specific line that was just added (for the "added to cart" sheet).
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(CART_ADD_EVENT, { detail: item }));
  }
  // Native business-metrics event (internal pipeline).
  track("add_to_cart", { productId: item.id, value: item.quantity });
  // Marketing/ads AddToCart — fired here, AFTER the cart mutation succeeds, so it
  // reflects a real add (not a product-page view). Central place → no duplicates
  // from UI re-renders. Value = unit price × quantity of the added line.
  trackingService.addToCart({ id: item.id, price: item.price, quantity: item.quantity });
}

export function setQuantity(key: string, quantity: number) {
  const cart = readCart();
  const index = cart.findIndex((line) => cartItemKey(line) === key);
  if (index < 0) return;

  if (quantity <= 0) {
    cart.splice(index, 1);
  } else {
    cart[index] = { ...cart[index], quantity };
  }
  writeCart(cart);
}

export function removeFromCart(key: string) {
  writeCart(readCart().filter((line) => cartItemKey(line) !== key));
}

export function clearCart() {
  writeCart([]);
}

export function cartCount(items: CartItem[]) {
  return items.reduce((sum, item) => sum + item.quantity, 0);
}

export function cartTotal(items: CartItem[]) {
  return items.reduce((sum, item) => sum + item.price * item.quantity, 0);
}

/** Reactive hook that stays in sync across tabs and components. */
export function useCart() {
  const [items, setItems] = useState<CartItem[]>([]);

  useEffect(() => {
    const sync = () => setItems(readCart());
    sync();
    window.addEventListener(CART_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(CART_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  return items;
}
