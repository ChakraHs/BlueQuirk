"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Product } from "@/types/product";
import { formatPrice } from "@/lib/money";
import { thumbSrc } from "@/lib/productImage";
import { t } from "@/lib/i18n";
import { colorSwatch, isLightColor } from "@/lib/colors";
import { pickDisplayCategory } from "@/lib/productCategory";
import { useProductCategoryContext } from "./CategoryTreeProvider";
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
  // Cards only ever need the lightweight thumbnail variant — never the display
  // or original — so listings stay fast and cheap on bandwidth.
  const images =
    product.images?.length ? product.images.map(thumbSrc) : [FALLBACK_IMAGE];
  const hasMultiple = images.length > 1;

  const [index, setIndex] = useState(0);
  const touchStartX = useRef<number | null>(null);

  const isOutOfStock = product.status === "ARCHIVED";
  // Show the category most relevant to the page being browsed (e.g. "Men
  // T-Shirts" on the Men page, "Women T-Shirts" on the Women page) instead of
  // whichever category happens to be first. See lib/productCategory.
  const categoryContext = useProductCategoryContext();
  const category = pickDisplayCategory(product.categories, categoryContext)?.name;

  // Colours actually assigned to this product (COLOR attribute, selected values),
  // shown as swatch dots — a familiar pro-storefront cue.
  const colors = (product.attributes ?? [])
    .filter((a) => (a.type || "").toUpperCase() === "COLOR")
    .flatMap((a) => a.values)
    .filter((v) => v.selected)
    .map((v) => v.value);

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
    <Link
      href={`/${lang}/product/${product.id}`}
      className="group block overflow-hidden rounded-2xl bg-surface transition-all duration-300 hover:-translate-y-1"
    >
      {/* IMAGE / carousel — the printed artwork is the hero, so it takes the
          lion's share of the card. A single fixed neutral background is used for
          every product (never tied to the shirt colour) for a consistent catalog;
          the image is zoomed slightly so the tee fills the frame — the source
          padding already gives us room to crop into. */}
      <div
        className="relative aspect-[4/5] overflow-hidden rounded-2xl bg-gray-100 shadow-sm transition-shadow duration-300 group-hover:shadow-xl"
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
                className="scale-[1.15] object-contain transition-transform duration-500 ease-out group-hover:scale-[1.2]"
              />
            </div>
          ))}
        </div>

        {isOutOfStock && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/50">
            <span className="rounded-full bg-surface/95 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-gray-800">
              {t(lang, "product.outOfStock")}
            </span>
          </div>
        )}

        {/* prev / next arrows — deliberately understated: small, translucent and
            desktop-hover only. On mobile the shopper swipes instead. */}
        {hasMultiple && (
          <>
            <button
              type="button"
              onClick={go(-1)}
              aria-label="Image précédente"
              className="absolute left-2 top-1/2 hidden h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full bg-surface/70 text-gray-700 opacity-0 shadow-sm backdrop-blur transition hover:bg-surface md:flex md:group-hover:opacity-100"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              type="button"
              onClick={go(1)}
              aria-label="Image suivante"
              className="absolute right-2 top-1/2 hidden h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full bg-surface/70 text-gray-700 opacity-0 shadow-sm backdrop-blur transition hover:bg-surface md:flex md:group-hover:opacity-100"
            >
              <ChevronRight size={16} />
            </button>
          </>
        )}

        {/* wishlist toggle — floats in the top-right corner */}
        <WishlistButton
          item={{ id: product.id, name: product.name, price: product.price, image: images[0], lang }}
          className="absolute right-2.5 top-2.5 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-surface/90 text-gray-700 shadow-sm backdrop-blur transition hover:text-blue-600"
        />
      </div>

      {/* INFO — compact, 8px rhythm, strong price-first hierarchy */}
      <div className="px-1 pt-2 pb-1">
        {/* image pagination dots */}
        {hasMultiple && (
          <div className="mb-2 flex justify-center gap-1">
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
                  i === index ? "w-3.5 bg-gray-800" : "w-1.5 bg-gray-300 hover:bg-gray-400"
                }`}
              />
            ))}
          </div>
        )}

        {/* brand */}
        {category && (
          <p className="line-clamp-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-gray-400">
            {category}
          </p>
        )}

        {/* title — single line, ellipsis */}
        <h3 className="mt-0.5 truncate text-[13px] font-medium text-gray-500 transition-colors group-hover:text-gray-800">
          {product.name}
        </h3>

        {/* price — the most prominent element */}
        <p className="mt-1 text-base font-bold text-gray-900">
          {formatPrice(product.price)}
        </p>

        {/* color selector */}
        {colors.length > 0 && (
          <div className="mt-2 flex items-center gap-1.5">
            {colors.slice(0, 4).map((c, i) => {
              const hex = colorSwatch(c);
              return (
                <span
                  key={i}
                  title={c}
                  style={{ backgroundColor: hex }}
                  className={`h-3.5 w-3.5 rounded-full ${
                    isLightColor(hex) ? "ring-1 ring-inset ring-gray-300" : ""
                  }`}
                />
              );
            })}
            {colors.length > 4 && (
              <span className="text-[11px] font-medium text-gray-400">
                +{colors.length - 4}
              </span>
            )}
          </div>
        )}
      </div>
    </Link>
  );
}
