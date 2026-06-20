"use client";

import { useEffect, useState } from "react";

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
