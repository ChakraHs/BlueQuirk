"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Product } from "@/types/product";
import { formatPrice } from "@/lib/money";
import WishlistButton from "./WishlistButton";

const FALLBACK_IMAGE =
  "https://images.ctfassets.net/5hig0ukq7ib0/bUmu6RBCWC5TTscquxd16/041978fd5b8a89923e2bcf646f24c71c/2352468_LocalizationUpdates40offPromo_800x800_1_081824.jpg?fm=jpg&q=85&w=800&fl=progressive";

export default function ProductCard({
  product,
  lang = "fr",
}: {
  product: Product;
  lang?: string;
}) {
  const images =
    product.images?.length ? product.images.map((i) => i.url) : [FALLBACK_IMAGE];
  const hasMultiple = images.length > 1;

  const [index, setIndex] = useState(0);
  const touchStartX = useRef<number | null>(null);

  const isOutOfStock = product.status === "ARCHIVED";
  const category = product.categories?.[0]?.name;

  // Arrows/dots live inside the card's <Link>, so stop them from navigating.
  const go = (dir: number) => (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIndex((i) => (i + dir + images.length) % images.length);
  };

  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null || !hasMultiple) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(dx) > 40) {
      setIndex((i) => (i + (dx < 0 ? 1 : -1) + images.length) % images.length);
    }
    touchStartX.current = null;
  };

  return (
    <Link href={`/${lang}/product/${product.id}`} className="group block">
      {/* IMAGE / carousel */}
      <div
        className="relative aspect-square overflow-hidden rounded-xl bg-gray-100"
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        {/* sliding track — fixed height container prevents any layout shift */}
        <div
          className="flex h-full w-full transition-transform duration-300 ease-out"
          style={{ transform: `translateX(-${index * 100}%)` }}
        >
          {images.map((src, i) => (
            <div key={i} className="relative h-full w-full shrink-0">
              <Image
                src={src}
                alt={product.name}
                fill
                sizes="(max-width: 768px) 50vw, 25vw"
                className="object-cover transition-transform duration-500 group-hover:scale-105"
              />
            </div>
          ))}
        </div>

        {isOutOfStock && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/50">
            <span className="text-sm font-semibold tracking-wider text-white">
              OUT OF STOCK
            </span>
          </div>
        )}

        {/* prev / next arrows — only when there are multiple images */}
        {hasMultiple && (
          <>
            <button
              type="button"
              onClick={go(-1)}
              aria-label="Image précédente"
              className="absolute left-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-gray-800 shadow-sm backdrop-blur transition hover:bg-white md:opacity-0 md:group-hover:opacity-100"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              type="button"
              onClick={go(1)}
              aria-label="Image suivante"
              className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-gray-800 shadow-sm backdrop-blur transition hover:bg-white md:opacity-0 md:group-hover:opacity-100"
            >
              <ChevronRight size={18} />
            </button>

            {/* dots */}
            <div className="absolute bottom-2 left-1/2 flex -translate-x-1/2 gap-1.5">
              {images.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setIndex(i);
                  }}
                  aria-label={`Image ${i + 1}`}
                  className={`h-1.5 rounded-full transition-all ${
                    i === index ? "w-4 bg-white" : "w-1.5 bg-white/60 hover:bg-white/80"
                  }`}
                />
              ))}
            </div>
          </>
        )}

        {/* wishlist toggle */}
        <WishlistButton
          item={{ id: product.id, name: product.name, price: product.price, image: images[0], lang }}
          className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-gray-700 shadow-sm backdrop-blur transition hover:text-blue-600"
        />
      </div>

      {/* INFO */}
      <div className="px-1 pt-3">
        <h3 className="line-clamp-1 text-sm font-semibold text-gray-900">
          {product.name}
        </h3>

        {category && (
          <p className="mt-0.5 line-clamp-1 text-xs text-gray-500">{category}</p>
        )}

        <p className="mt-1.5 text-sm font-bold text-gray-900">
          {formatPrice(product.price)}
        </p>
      </div>
    </Link>
  );
}
