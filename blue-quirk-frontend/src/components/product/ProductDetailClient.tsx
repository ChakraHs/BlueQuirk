"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Check, ChevronLeft, ChevronRight, Heart, Minus, Plus, RotateCcw, ShieldCheck, ShoppingBag, Truck, Zap } from "lucide-react";
import { Product, ProductImage } from "@/types/product";
import { addToCart } from "@/lib/cart";
import { formatPrice } from "@/lib/money";
import { isWishlisted, toggleWishlist, WISHLIST_EVENT } from "@/lib/wishlist";
import { findColorAttribute, imagesForColor } from "@/lib/colorImages";

const FALLBACK_IMAGE =
  "https://images.ctfassets.net/5hig0ukq7ib0/bUmu6RBCWC5TTscquxd16/041978fd5b8a89923e2bcf646f24c71c/2352468_LocalizationUpdates40offPromo_800x800_1_081824.jpg?fm=jpg&q=85&w=800&fl=progressive";

// The API returns every attribute with each value flagged `selected` for this
// product. Like a real store (WooCommerce-style), a product should only expose
// the values actually assigned to it — so we keep only selected values and drop
// attributes that have none.
type ProductAttribute = NonNullable<Product["attributes"]>[number];

function getProductAttributes(product: Product): ProductAttribute[] {
  return (product.attributes ?? [])
    .map((attribute) => ({
      ...attribute,
      values: attribute.values.filter((value) => value.selected),
    }))
    .filter((attribute) => attribute.values.length > 0);
}

function getInitialSelection(attributes: ProductAttribute[]) {
  return Object.fromEntries(
    attributes.map((attribute) => [
      String(attribute.id),
      attribute.values[0] ? String(attribute.values[0].id) : "",
    ])
  );
}

export default function ProductDetailClient({
  product,
  lang,
}: {
  product: Product;
  lang: string;
}) {
  const allImages: ProductImage[] = useMemo(
    () => (product.images?.length ? product.images : [{ id: -1, url: FALLBACK_IMAGE }]),
    [product.images]
  );
  const productAttributes = useMemo(() => getProductAttributes(product), [product]);
  const [quantity, setQuantity] = useState(1);
  const [selectedAttributes, setSelectedAttributes] = useState(() => getInitialSelection(productAttributes));

  // Color-aware gallery: when a color is selected, show that color's images
  // first then generic ones (falling back to generics when the color has none).
  const colorAttribute = useMemo(() => findColorAttribute(productAttributes), [productAttributes]);
  const selectedColorId = colorAttribute
    ? Number(selectedAttributes[String(colorAttribute.id)]) || null
    : null;
  const galleryImages = useMemo(
    () => (colorAttribute ? imagesForColor(allImages, selectedColorId) : allImages),
    [colorAttribute, allImages, selectedColorId]
  );

  const [activeImage, setActiveImage] = useState(galleryImages[0]?.url ?? FALLBACK_IMAGE);
  const touchStartX = useRef<number | null>(null);

  // When the color (and thus the gallery) changes, jump to the first matching image.
  useEffect(() => {
    setActiveImage(galleryImages[0]?.url ?? FALLBACK_IMAGE);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedColorId]);

  // Browse the (color-filtered) gallery with arrows / swipe, wrapping around.
  const activeIndex = Math.max(0, galleryImages.findIndex((img) => img.url === activeImage));
  const stepImage = (dir: number) => {
    if (galleryImages.length < 2) return;
    const next = (activeIndex + dir + galleryImages.length) % galleryImages.length;
    setActiveImage(galleryImages[next].url);
  };
  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(dx) > 40) stepImage(dx < 0 ? 1 : -1);
    touchStartX.current = null;
  };
  const [added, setAdded] = useState(false);
  const [wishlisted, setWishlisted] = useState(false);
  const router = useRouter();

  const canBuy = product.status === "PUBLISHED";

  useEffect(() => {
    const sync = () => setWishlisted(isWishlisted(product.id));
    sync();
    window.addEventListener(WISHLIST_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(WISHLIST_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, [product.id]);

  const toggleWishlistItem = () => {
    setWishlisted(
      toggleWishlist({
        id: product.id,
        name: product.name,
        price: product.price,
        image: galleryImages[0]?.url ?? FALLBACK_IMAGE,
        lang,
      })
    );
  };

  const selectedAttributeLabels = useMemo(() => {
    return Object.fromEntries(
      productAttributes.map((attribute) => {
        const selectedId = selectedAttributes[String(attribute.id)];
        const selectedValue = attribute.values.find((value) => String(value.id) === selectedId);
        return [attribute.name, selectedValue?.value ?? ""];
      })
    );
  }, [productAttributes, selectedAttributes]);

  const buildCartItem = () => ({
    id: product.id,
    name: product.name,
    price: product.price,
    image: activeImage,
    quantity,
    lang,
    attributes: selectedAttributeLabels,
  });

  const handleAddToCart = () => {
    if (!canBuy) {
      return;
    }
    addToCart(buildCartItem());
    setAdded(true);
    window.setTimeout(() => setAdded(false), 2200);
  };

  const handleBuyNow = () => {
    if (!canBuy) {
      return;
    }
    addToCart(buildCartItem());
    // The checkout page gates on auth (redirects guests to sign up).
    router.push(`/${lang}/checkout`);
  };

  return (
    <div className="mx-auto grid max-w-7xl gap-10 px-6 py-8 md:grid-cols-[minmax(0,1.05fr)_minmax(360px,0.95fr)] md:px-12 md:py-12">
      <section aria-label="Product images" className="space-y-4">
        <div
          className="group relative aspect-square overflow-hidden rounded-2xl bg-gray-100"
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
        >
          <Image
            key={activeImage}
            src={activeImage}
            alt={product.name}
            fill
            priority
            sizes="(max-width: 768px) 100vw, 55vw"
            className="object-cover animate-[fadeIn_0.25s_ease]"
          />

          {galleryImages.length > 1 && (
            <>
              <button
                type="button"
                onClick={() => stepImage(-1)}
                aria-label="Image précédente"
                className="absolute left-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-gray-800 shadow-md backdrop-blur transition hover:bg-white md:opacity-0 md:group-hover:opacity-100"
              >
                <ChevronLeft size={20} />
              </button>
              <button
                type="button"
                onClick={() => stepImage(1)}
                aria-label="Image suivante"
                className="absolute right-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-gray-800 shadow-md backdrop-blur transition hover:bg-white md:opacity-0 md:group-hover:opacity-100"
              >
                <ChevronRight size={20} />
              </button>

              <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5">
                {galleryImages.map((img, i) => (
                  <button
                    key={img.id ?? img.url}
                    type="button"
                    onClick={() => setActiveImage(img.url)}
                    aria-label={`Image ${i + 1}`}
                    className={`h-2 rounded-full transition-all ${
                      i === activeIndex ? "w-5 bg-gray-900" : "w-2 bg-gray-900/40 hover:bg-gray-900/60"
                    }`}
                  />
                ))}
              </div>
            </>
          )}
        </div>

        {galleryImages.length > 1 && (
          <div className="grid grid-cols-5 gap-3">
            {galleryImages.map((image) => (
              <button
                key={image.id ?? image.url}
                type="button"
                onClick={() => setActiveImage(image.url)}
                className={`relative aspect-square overflow-hidden rounded-xl border-2 bg-gray-100 transition ${
                  activeImage === image.url ? "border-blue-600" : "border-transparent hover:border-gray-300"
                }`}
                aria-label="Select product image"
              >
                <Image src={image.url} alt="" fill sizes="96px" className="object-cover" />
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
            {formatPrice(product.price)}
          </p>
        </div>

        {product.description && (
          <div
            className="prose prose-sm max-w-none text-gray-600"
            dangerouslySetInnerHTML={{ __html: product.description }}
          />
        )}

        {!!productAttributes.length && (
          <div className="space-y-5">
            {productAttributes.map((attribute) => (
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
                        className={`min-h-10 rounded-full border px-4 text-sm font-medium transition ${
                          selected
                            ? "border-blue-600 bg-blue-600 text-white"
                            : "border-gray-300 bg-white text-gray-700 hover:border-blue-400"
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

        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="grid h-12 w-full grid-cols-3 overflow-hidden rounded-full border border-gray-300 sm:w-36">
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
              onClick={handleAddToCart}
              disabled={!canBuy}
              className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-full border border-blue-600 bg-white px-5 text-sm font-semibold text-blue-600 transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:border-gray-300 disabled:text-gray-400"
            >
              <ShoppingBag className="size-4" />
              {canBuy ? "Add to cart" : "Unavailable"}
            </button>

            <button
              type="button"
              onClick={toggleWishlistItem}
              aria-label={wishlisted ? "Remove from wishlist" : "Add to wishlist"}
              aria-pressed={wishlisted}
              className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full border transition ${
                wishlisted
                  ? "border-blue-600 bg-blue-50 text-blue-600"
                  : "border-gray-300 text-gray-600 hover:border-blue-400 hover:text-blue-600"
              }`}
            >
              <Heart className={`size-5 ${wishlisted ? "fill-blue-600" : ""}`} />
            </button>
          </div>

          {/* Buy Now — adds to cart and jumps straight to the COD checkout. */}
          <button
            type="button"
            onClick={handleBuyNow}
            disabled={!canBuy}
            className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-blue-600 px-5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-300"
          >
            <Zap className="size-4" />
            {canBuy ? "Acheter maintenant" : "Indisponible"}
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
