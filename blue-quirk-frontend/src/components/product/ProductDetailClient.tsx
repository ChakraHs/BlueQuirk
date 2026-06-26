"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Heart, Minus, Plus, RotateCcw, Ruler, ShieldCheck, ShoppingBag, Sparkles, Truck, Zap } from "lucide-react";
import { Product, ProductImage } from "@/types/product";
import { addToCart } from "@/lib/cart";
import { formatPrice } from "@/lib/money";
import { isWishlisted, toggleWishlist, WISHLIST_EVENT } from "@/lib/wishlist";
import { findColorAttribute, imagesForColor } from "@/lib/colorImages";
import { thumbSrc } from "@/lib/productImage";
import { colorSwatch, isLightColor } from "@/lib/colors";
import { useShippingConfig, freeShippingState } from "@/lib/shipping";
import { recommendSize, setPreferredSize } from "@/lib/sizePreference";
import { t } from "@/lib/i18n";
import SizeGuideModal from "@/components/product/SizeGuideModal";
import SizeCalculatorModal from "@/components/product/SizeCalculatorModal";
import ProductGallery from "@/components/product/ProductGallery";

/** The product's SIZE attribute, by type (preferred) or a name match. */
function findSizeAttribute<T extends { name: string; type?: string }>(attributes: T[]): T | undefined {
  return (
    attributes.find((a) => (a.type || "").toUpperCase() === "SIZE") ||
    attributes.find((a) => /taille|size|مقاس/i.test(a.name))
  );
}

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

  // Size guide + size recommendation (applied after mount to avoid SSR mismatch).
  const sizeAttribute = useMemo(() => findSizeAttribute(productAttributes), [productAttributes]);
  const [sizeGuideOpen, setSizeGuideOpen] = useState(false);
  const [sizeCalcOpen, setSizeCalcOpen] = useState(false);
  const [calculatedSize, setCalculatedSize] = useState<string | null>(null);

  // Shipping economics for the product-page banner (backend-driven; no hardcoding).
  const shippingConfig = useShippingConfig();
  const freeShip = freeShippingState(product.price, shippingConfig);

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

  // Tint the image background with the selected colour (product images are often
  // transparent PNGs, so the colour shows through behind the design).
  const selectedColor = colorAttribute?.values.find((v) => v.id === selectedColorId);
  const galleryBg = selectedColor ? colorSwatch(selectedColor.value) : undefined;

  // The gallery owns navigation/zoom; we keep the active image url only as a
  // mirror for the cart line + wishlist thumbnail (ProductGallery reports the
  // thumbnail variant as the active image changes).
  const [activeImage, setActiveImage] = useState(
    galleryImages[0] ? thumbSrc(galleryImages[0]) : FALLBACK_IMAGE
  );
  const [added, setAdded] = useState(false);
  const [wishlisted, setWishlisted] = useState(false);
  const router = useRouter();

  const canBuy = product.status === "PUBLISHED";

  // Recommend (and preselect) the customer's usual size when this product offers
  // it. Runs after mount so the server/client initial render stays identical.
  useEffect(() => {
    if (!sizeAttribute) return;
    const available = sizeAttribute.values.map((v) => v.value);
    const rec = recommendSize({ available });
    if (!rec) return;
    const value = sizeAttribute.values.find((v) => v.value === rec.size);
    if (!value) return;
    setSelectedAttributes((current) => ({
      ...current,
      [String(sizeAttribute.id)]: String(value.id),
    }));
  }, [sizeAttribute]);

  // Apply a size proposed by the height/weight calculator (and remember it).
  const applyCalculatedSize = (size: string) => {
    if (!sizeAttribute) return;
    const value = sizeAttribute.values.find(
      (v) => v.value.toLowerCase() === size.toLowerCase()
    );
    if (!value) return;
    setSelectedAttributes((current) => ({
      ...current,
      [String(sizeAttribute.id)]: String(value.id),
    }));
    setPreferredSize(value.value);
    setCalculatedSize(value.value);
  };

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
        image: galleryImages[0] ? thumbSrc(galleryImages[0]) : FALLBACK_IMAGE,
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

  // Remember the chosen size (even if it was the preselected recommendation) so
  // it can be suggested on the next product.
  const rememberSize = () => {
    if (!sizeAttribute) return;
    const label = selectedAttributeLabels[sizeAttribute.name];
    if (label) setPreferredSize(label);
  };

  const handleAddToCart = () => {
    if (!canBuy) {
      return;
    }
    rememberSize();
    addToCart(buildCartItem());
    setAdded(true);
    window.setTimeout(() => setAdded(false), 2200);
  };

  const handleBuyNow = () => {
    if (!canBuy) {
      return;
    }
    rememberSize();
    addToCart(buildCartItem());
    // The checkout page gates on auth (redirects guests to sign up).
    router.push(`/${lang}/checkout`);
  };

  return (
    <div className="mx-auto grid max-w-7xl gap-10 px-6 py-8 md:grid-cols-[minmax(0,1.05fr)_minmax(360px,0.95fr)] md:px-12 md:py-12">
      <section aria-label="Product images">
        <ProductGallery
          images={galleryImages}
          alt={product.name}
          onActiveChange={setActiveImage}
          bgColor={galleryBg}
        />
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
                {t(lang, "product.inStock")}
              </span>
            )}
          </div>

          <h1 className="text-3xl font-semibold leading-tight md:text-5xl">
            {product.name}
          </h1>

          <p className="text-2xl font-semibold">
            {formatPrice(product.price)}
          </p>

          {/* Shipping info banner — threshold/fee come from the backend config. */}
          {shippingConfig.freeShippingThreshold > 0 && (
            <div className="flex items-start gap-2.5 rounded-lg border border-gray-200 bg-gray-50 px-3.5 py-2.5">
              <Truck className="mt-0.5 size-4 shrink-0 text-blue-600" />
              {freeShip.qualified ? (
                <p className="text-sm text-gray-700">
                  {t(lang, "product.shipQualified")}
                </p>
              ) : (
                <div className="text-sm">
                  <p className="font-medium text-gray-800">
                    {t(lang, "product.shipFreeFrom", {
                      amount: Math.round(shippingConfig.freeShippingThreshold),
                      currency: shippingConfig.currency,
                    })}
                  </p>
                  <p className="text-xs text-gray-500">
                    {t(lang, "product.shipOtherwise", {
                      amount: Math.round(shippingConfig.shippingFee),
                      currency: shippingConfig.currency,
                    })}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {product.description && (
          <div
            className="prose prose-sm max-w-none text-gray-600"
            dangerouslySetInnerHTML={{ __html: product.description }}
          />
        )}

        {!!productAttributes.length && (
          <div className="space-y-5">
            {productAttributes.map((attribute) => {
              const isSize = sizeAttribute?.id === attribute.id;
              const isColor = colorAttribute?.id === attribute.id;
              return (
              <fieldset key={attribute.id} className="space-y-3">
                <legend className="flex w-full items-center justify-between gap-3 text-sm font-semibold text-gray-800">
                  <span className="flex flex-wrap items-center gap-2">
                    {attribute.name}
                    {isSize && (
                      <button
                        type="button"
                        onClick={() => setSizeCalcOpen(true)}
                        className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-600 transition hover:bg-blue-100"
                      >
                        <Sparkles className="size-3" />
                        {t(lang, "product.calcSize")}
                      </button>
                    )}
                    {isSize && calculatedSize && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
                        <Check className="size-3" />
                        {t(lang, "product.recommended", { size: calculatedSize })}
                      </span>
                    )}
                  </span>
                  {isSize && (
                    <button
                      type="button"
                      onClick={() => setSizeGuideOpen(true)}
                      className="inline-flex shrink-0 items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-700"
                    >
                      <Ruler className="size-3.5" />
                      {t(lang, "product.sizeGuide")}
                    </button>
                  )}
                </legend>

                <div className="flex flex-wrap items-center gap-2">
                  {attribute.values.map((value) => {
                    const selected = selectedAttributes[String(attribute.id)] === String(value.id);
                    const select = () => {
                      setSelectedAttributes((current) => ({
                        ...current,
                        [String(attribute.id)]: String(value.id),
                      }));
                      if (isSize) setPreferredSize(value.value);
                    };

                    // Colour values render as round colour bubbles.
                    if (isColor) {
                      const hex = colorSwatch(value.value);
                      const needsBorder = isLightColor(hex);
                      return (
                        <button
                          key={value.id}
                          type="button"
                          onClick={select}
                          title={value.value}
                          aria-label={value.value}
                          aria-pressed={selected}
                          className={`relative flex size-9 items-center justify-center rounded-full transition ${
                            selected
                              ? "ring-2 ring-gray-900 ring-offset-2"
                              : "hover:ring-2 hover:ring-gray-300 hover:ring-offset-2"
                          }`}
                        >
                          <span
                            className={`size-7 rounded-full ${needsBorder ? "border border-gray-300" : ""}`}
                            style={{ backgroundColor: hex }}
                          />
                          {selected && (
                            <Check
                              className={`absolute size-4 ${needsBorder ? "text-gray-800" : "text-white"}`}
                            />
                          )}
                        </button>
                      );
                    }

                    return (
                      <button
                        key={value.id}
                        type="button"
                        onClick={select}
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
                  {isColor && selectedColor && (
                    <span className="ml-1 text-sm text-gray-600">{selectedColor.value}</span>
                  )}
                </div>
              </fieldset>
              );
            })}
          </div>
        )}

        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="grid h-12 w-full grid-cols-3 overflow-hidden rounded-full border border-gray-300 sm:w-36">
              <button
                type="button"
                onClick={() => setQuantity((value) => Math.max(1, value - 1))}
                className="flex items-center justify-center hover:bg-gray-50"
                aria-label={t(lang, "product.decreaseQty")}
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
                aria-label={t(lang, "product.increaseQty")}
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
              {canBuy ? t(lang, "product.addToCart") : t(lang, "product.unavailable")}
            </button>

            <button
              type="button"
              onClick={toggleWishlistItem}
              aria-label={wishlisted ? t(lang, "product.removeFromWishlist") : t(lang, "product.addToWishlist")}
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
            {canBuy ? t(lang, "product.buyNow") : t(lang, "product.unavailable")}
          </button>
        </div>

        {added && (
          <p className="rounded-sm bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
            {t(lang, "product.added")}
          </p>
        )}

        <div className="grid gap-3 border-t border-gray-200 pt-6 text-sm text-gray-600 sm:grid-cols-3">
          <div className="flex items-start gap-2">
            <Truck className="mt-0.5 size-4 text-gray-900" />
            <span>{t(lang, "product.delivery")}</span>
          </div>
          <div className="flex items-start gap-2">
            <ShieldCheck className="mt-0.5 size-4 text-gray-900" />
            <span>{t(lang, "product.secure")}</span>
          </div>
          <div className="flex items-start gap-2">
            <RotateCcw className="mt-0.5 size-4 text-gray-900" />
            <span>{t(lang, "product.returns")}</span>
          </div>
        </div>
      </section>

      <SizeGuideModal
        open={sizeGuideOpen}
        onClose={() => setSizeGuideOpen(false)}
        lang={lang}
      />

      <SizeCalculatorModal
        open={sizeCalcOpen}
        onClose={() => setSizeCalcOpen(false)}
        onApply={applyCalculatedSize}
        availableSizes={sizeAttribute ? sizeAttribute.values.map((v) => v.value) : []}
        lang={lang}
      />
    </div>
  );
}
