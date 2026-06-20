"use client";

import { useEffect, useState } from "react";

export type WishlistItem = {
  id: number;
  name: string;
  price: number;
  image: string;
  lang: string;
};

const KEY = "bluequirk_wishlist";
export const WISHLIST_EVENT = "bluequirk_wishlist_change";

export function readWishlist(): WishlistItem[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "[]") as WishlistItem[];
  } catch {
    return [];
  }
}

function writeWishlist(items: WishlistItem[]) {
  localStorage.setItem(KEY, JSON.stringify(items));
  window.dispatchEvent(new Event(WISHLIST_EVENT));
}

export function isWishlisted(id: number) {
  return readWishlist().some((item) => item.id === id);
}

export function addToWishlist(item: WishlistItem) {
  const items = readWishlist();
  if (items.some((i) => i.id === item.id)) return;
  items.push(item);
  writeWishlist(items);
}

export function removeFromWishlist(id: number) {
  writeWishlist(readWishlist().filter((item) => item.id !== id));
}

/** Adds if absent, removes if present. Returns the new state (true = now wishlisted). */
export function toggleWishlist(item: WishlistItem): boolean {
  const items = readWishlist();
  if (items.some((i) => i.id === item.id)) {
    writeWishlist(items.filter((i) => i.id !== item.id));
    return false;
  }
  items.push(item);
  writeWishlist(items);
  return true;
}

/** Reactive hook returning the wishlist, in sync across tabs and components. */
export function useWishlist() {
  const [items, setItems] = useState<WishlistItem[]>([]);

  useEffect(() => {
    const sync = () => setItems(readWishlist());
    sync();
    window.addEventListener(WISHLIST_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(WISHLIST_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  return items;
}
