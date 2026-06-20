"use client";

import { use } from "react";
import Image from "next/image";
import Link from "next/link";
import { Heart, Trash2, ShoppingBag } from "lucide-react";
import { useWishlist, removeFromWishlist } from "@/lib/wishlist";
import { addToCart } from "@/lib/cart";

export default function WishlistPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = use(params);
  const items = useWishlist();

  if (items.length === 0) {
    return (
      <main className="mx-auto max-w-7xl px-6 py-16">
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 py-20 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-gray-100 text-gray-400">
            <Heart size={26} />
          </span>
          <h1 className="mt-5 text-lg font-semibold text-gray-900">
            Your wishlist is empty
          </h1>
          <p className="mt-1 max-w-sm text-sm text-gray-500">
            Tap the heart on any product to save it here for later.
          </p>
          <Link
            href={`/${lang}`}
            className="mt-6 rounded-full bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
          >
            Discover products
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-7xl px-6 py-10">
      <h1 className="mb-1 text-2xl font-bold tracking-tight text-gray-900 md:text-3xl">
        Your wishlist
      </h1>
      <p className="mb-8 text-sm text-gray-500">
        {items.length} {items.length === 1 ? "item" : "items"} saved
      </p>

      <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:gap-x-6 lg:grid-cols-4">
        {items.map((item) => (
          <div key={item.id} className="group">
            <Link href={`/${lang}/product/${item.id}`} className="block">
              <div className="relative aspect-square overflow-hidden rounded-xl bg-gray-100">
                <Image
                  src={item.image}
                  alt={item.name}
                  fill
                  sizes="(max-width: 768px) 50vw, 25vw"
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                />
              </div>
              <h3 className="mt-3 line-clamp-1 px-1 text-sm font-semibold text-gray-900">
                {item.name}
              </h3>
              <p className="px-1 text-sm font-bold text-gray-900">
                ${item.price}
              </p>
            </Link>

            <div className="mt-3 flex items-center gap-2 px-1">
              <button
                type="button"
                onClick={() =>
                  addToCart({
                    id: item.id,
                    name: item.name,
                    price: item.price,
                    image: item.image,
                    quantity: 1,
                    lang: item.lang,
                    attributes: {},
                  })
                }
                className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-full bg-blue-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-blue-700"
              >
                <ShoppingBag className="size-3.5" />
                Add to cart
              </button>
              <button
                type="button"
                onClick={() => removeFromWishlist(item.id)}
                aria-label="Remove from wishlist"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-gray-300 text-gray-500 transition hover:border-red-300 hover:text-red-600"
              >
                <Trash2 className="size-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
