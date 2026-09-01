"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { Sparkles, Check, Plus, Loader2, X, Pencil } from "lucide-react";
import { addToCart, type CartItem } from "@/lib/cart";
import { formatPrice } from "@/lib/money";
import { t } from "@/lib/i18n";
import { API_BASE_URL } from "@/lib/config";
import { previewSet } from "@/lib/bundle";
import { findColorAttribute, imagesForColor } from "@/lib/colorImages";
import { colorSwatch, isLightColor } from "@/lib/colors";
import { thumbSrc, displaySrc } from "@/lib/productImage";
import type { PublicBundleOffer } from "@/services/bundle.service";
import type { Product, ProductImage } from "@/types/product";

const FALLBACK_IMAGE = "/placeholder.png";

type Assigned = {
  id: number;
  name: string;
  type?: string;
  values: { id: number; value: string }[];
};

/** Values actually assigned to a product (WooCommerce-style), grouped by attribute. */
function assignedAttributes(p: Product): Assigned[] {
  return (p.attributes ?? [])
    .map((a) => ({ ...a, values: a.values.filter((v) => v.selected) }))
    .filter((a) => a.values.length > 0) as Assigned[];
}

function sizeAttrOf(attrs: Assigned[]): Assigned | undefined {
  return (
    attrs.find((a) => (a.type || "").toUpperCase() === "SIZE") ||
    attrs.find((a) => /taille|size|مقاس/i.test(a.name))
  );
}

/** id-keyed selection (attribute.id → value.id), like the main product page. */
type Selection = Record<string, string>;

function defaultSelection(p: Product): Selection {
  return Object.fromEntries(
    assignedAttributes(p).map((a) => [String(a.id), a.values[0] ? String(a.values[0].id) : ""])
  );
}

/** Resolve a selection into cart-ready labels + the color-aware thumbnail. */
function resolveVariant(p: Product, sel: Selection) {
  const attrs = assignedAttributes(p);
  const attributes: Record<string, string> = {};
  for (const a of attrs) {
    const v = a.values.find((x) => String(x.id) === sel[String(a.id)]);
    attributes[a.name] = v?.value ?? "";
  }
  const colorAttr = findColorAttribute(attrs);
  const colorId = colorAttr ? Number(sel[String(colorAttr.id)]) || null : null;
  const imgs = imagesForColor(p.images ?? [], colorId);
  const image = imgs[0] ? thumbSrc(imgs[0]) : FALLBACK_IMAGE;
  return { attributes, image };
}

type PartnerSelection = {
  product: Product;
  sel: Selection;
  attributes: Record<string, string>;
  image: string;
};

/**
 * "Build your set" module shown on eligible product pages. Mix & match other
 * eligible designs — each partner is configured in a premium variant picker
 * (color swatches + size pills + live image preview) before it joins the set,
 * then added to the cart in one action. Display-only pricing — the authoritative
 * discount is applied by the backend at cart/checkout.
 */
export default function BundleBuilder({
  product,
  offer,
  lang,
  buildCurrentItem,
}: {
  product: Product;
  offer: PublicBundleOffer;
  lang: string;
  buildCurrentItem: () => CartItem;
}) {
  const need = Math.max(1, offer.minQuantity - 1); // additional items to complete a set
  const preview = useMemo(() => previewSet(offer, product.price), [offer, product.price]);

  const [open, setOpen] = useState(false);
  const [partners, setPartners] = useState<Product[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<PartnerSelection[]>([]);
  const [added, setAdded] = useState(false);

  // The product currently being configured in the variant picker modal.
  const [picking, setPicking] = useState<Product | null>(null);

  useEffect(() => {
    if (!open || partners !== null) return;
    setLoading(true);
    loadEligible(offer, product, lang)
      .then((list) => setPartners(list))
      .catch(() => setPartners([]))
      .finally(() => setLoading(false));
  }, [open, partners, offer, product, lang]);

  const chosenOf = (id: number) => selected.find((s) => s.product.id === id);

  const confirmVariant = (p: Product, sel: Selection) => {
    const { attributes, image } = resolveVariant(p, sel);
    const entry: PartnerSelection = { product: p, sel, attributes, image };
    setAdded(false);
    setSelected((cur) => {
      const existing = cur.findIndex((s) => s.product.id === p.id);
      if (existing >= 0) {
        const next = [...cur];
        next[existing] = entry;
        return next;
      }
      if (cur.length >= need) return [...cur.slice(1), entry]; // keep at the required size
      return [...cur, entry];
    });
    setPicking(null);
  };

  const removePartner = (id: number) => setSelected((cur) => cur.filter((s) => s.product.id !== id));

  const complete = selected.length >= need;

  const addSet = () => {
    addToCart(buildCurrentItem()); // current product with its selected variant
    for (const s of selected) {
      addToCart({
        id: s.product.id,
        name: s.product.name,
        price: s.product.price,
        image: s.image,
        quantity: 1,
        lang,
        attributes: s.attributes,
      });
    }
    setAdded(true);
    setSelected([]);
    window.setTimeout(() => setAdded(false), 2600);
  };

  return (
    <div className="rounded-2xl border border-primary/20 bg-primary/[0.03] p-5">
      <div className="flex items-center gap-2">
        <Sparkles className="size-4 text-primary" />
        <h2 className="text-sm font-bold uppercase tracking-wide text-gray-900">
          {t(lang, "bundle.buildTitle")}
        </h2>
      </div>

      {/* Pricing ladder: 1 item vs a complete set. */}
      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        <div className="rounded-xl border border-gray-200 bg-surface px-4 py-3">
          <p className="text-xs font-medium text-gray-500">{t(lang, "bundle.single")}</p>
          <p className="mt-0.5 text-lg font-bold text-gray-900">{formatPrice(product.price)}</p>
        </div>
        <div className="rounded-xl border border-primary/40 bg-primary/[0.06] px-4 py-3">
          <p className="text-xs font-medium text-primary">
            {t(lang, "bundle.setOf", { count: preview.quantity })}
          </p>
          <div className="mt-0.5 flex items-baseline gap-2">
            <p className="text-lg font-bold text-gray-900">{formatPrice(preview.setPrice)}</p>
            {preview.save > 0 && (
              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                {t(lang, "bundle.save", { amount: formatPrice(preview.save) })}
              </span>
            )}
          </div>
        </div>
      </div>

      {offer.allowMixing && (
        <p className="mt-3 text-xs text-gray-500">{t(lang, "bundle.mixNote")}</p>
      )}

      {/* Chosen partners — rich thumbnail + variant summary, editable. */}
      {selected.length > 0 && (
        <div className="mt-4 space-y-2">
          {selected.map((s) => {
            const attrs = Object.entries(s.attributes).filter(([, v]) => v);
            return (
              <div key={s.product.id} className="flex items-center gap-3 rounded-xl border border-gray-200 bg-surface p-2.5">
                <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-gray-100">
                  <Image src={s.image} alt={s.product.name} fill sizes="56px" className="object-cover" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-gray-900">{s.product.name}</p>
                  {attrs.length > 0 && (
                    <p className="mt-0.5 truncate text-xs text-gray-500">
                      {attrs.map(([k, v]) => `${k}: ${v}`).join(" · ")}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setPicking(s.product)}
                  className="rounded-md p-1.5 text-gray-400 transition hover:bg-gray-100 hover:text-primary"
                  aria-label={t(lang, "bundle.edit")}
                  title={t(lang, "bundle.edit")}
                >
                  <Pencil className="size-4" />
                </button>
                <button
                  type="button"
                  onClick={() => removePartner(s.product.id)}
                  className="rounded-md p-1.5 text-gray-400 transition hover:bg-gray-100 hover:text-rose-600"
                  aria-label={t(lang, "bundle.close")}
                >
                  <X className="size-4" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Choose another design */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-primary/40 bg-surface px-4 py-2 text-sm font-semibold text-primary transition hover:bg-primary/5"
      >
        <Plus className="size-4" />
        {t(lang, "bundle.chooseAnother")}
      </button>

      {open && (
        <div className="mt-3 rounded-xl border border-gray-200 bg-surface p-3">
          {loading ? (
            <p className="flex items-center gap-2 py-6 text-sm text-gray-400">
              <Loader2 className="size-4 animate-spin" /> …
            </p>
          ) : !partners || partners.length === 0 ? (
            <p className="py-6 text-center text-sm text-gray-400">—</p>
          ) : (
            <div className="grid max-h-72 grid-cols-2 gap-2 overflow-y-auto sm:grid-cols-3">
              {partners.map((p) => {
                const chosen = chosenOf(p.id);
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setPicking(p)}
                    className={`group relative overflow-hidden rounded-xl border p-1.5 text-left transition ${
                      chosen ? "border-primary ring-2 ring-primary/30" : "border-gray-200 hover:border-primary/40"
                    }`}
                  >
                    <div className="relative aspect-square overflow-hidden rounded-lg bg-gray-100">
                      <Image
                        src={chosen ? chosen.image : firstImage(p)}
                        alt={p.name}
                        fill
                        sizes="120px"
                        className="object-cover"
                      />
                      {chosen ? (
                        <span className="absolute right-1 top-1 flex size-5 items-center justify-center rounded-full bg-primary text-white">
                          <Check className="size-3" />
                        </span>
                      ) : (
                        <span className="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition group-hover:bg-black/20 group-hover:opacity-100">
                          <span className="rounded-full bg-white/90 px-2 py-1 text-xs font-semibold text-gray-900">
                            {t(lang, "bundle.pickVariant")}
                          </span>
                        </span>
                      )}
                    </div>
                    <p className="mt-1 truncate text-xs font-medium text-gray-800">{p.name}</p>
                    <p className="text-xs text-gray-500">{formatPrice(p.price)}</p>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Add set / hint */}
      <div className="mt-4">
        {complete ? (
          <button
            type="button"
            onClick={addSet}
            className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-full bg-primary px-5 text-sm font-semibold text-white transition hover:bg-primary-hover"
          >
            <Check className="size-4" />
            {t(lang, "bundle.addSet")} · {formatPrice(preview.setPrice)}
          </button>
        ) : (
          <p className="text-xs font-medium text-gray-500">
            {t(lang, "bundle.pickToComplete", { count: need - selected.length })}
          </p>
        )}
        {added && (
          <p className="mt-2 rounded-lg bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700">
            {t(lang, "bundle.added")}
          </p>
        )}
      </div>

      {picking && (
        <VariantPicker
          product={picking}
          lang={lang}
          initialSel={chosenOf(picking.id)?.sel}
          onCancel={() => setPicking(null)}
          onConfirm={(sel) => confirmVariant(picking, sel)}
        />
      )}
    </div>
  );
}

/**
 * Premium variant picker for a partner product: a color-aware image preview,
 * colour swatches and size/option pills — mirroring the main product page — so
 * the customer sees exactly what they're adding before it joins the set.
 */
function VariantPicker({
  product,
  lang,
  initialSel,
  onConfirm,
  onCancel,
}: {
  product: Product;
  lang: string;
  initialSel?: Selection;
  onConfirm: (sel: Selection) => void;
  onCancel: () => void;
}) {
  const attrs = useMemo(() => assignedAttributes(product), [product]);
  const sizeAttr = useMemo(() => sizeAttrOf(attrs), [attrs]);
  const colorAttr = useMemo(() => findColorAttribute(attrs), [attrs]);
  const [sel, setSel] = useState<Selection>(initialSel ?? defaultSelection(product));

  const selectedColorId = colorAttr ? Number(sel[String(colorAttr.id)]) || null : null;
  const gallery: ProductImage[] = useMemo(
    () => imagesForColor(product.images ?? [], selectedColorId),
    [product.images, selectedColorId]
  );
  const heroSrc = gallery[0] ? displaySrc(gallery[0]) : FALLBACK_IMAGE;

  const pick = (attrId: number, valueId: number) =>
    setSel((cur) => ({ ...cur, [String(attrId)]: String(valueId) }));

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4"
      onClick={onCancel}
      role="dialog"
      aria-modal="true"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md overflow-hidden rounded-t-2xl bg-surface shadow-xl sm:rounded-2xl"
      >
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3">
          <h3 className="text-sm font-bold text-gray-900">{t(lang, "bundle.pickVariant")}</h3>
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
            aria-label={t(lang, "bundle.close")}
          >
            <X className="size-5" />
          </button>
        </div>

        <div className="max-h-[70vh] overflow-y-auto px-5 py-4">
          <div className="flex gap-4">
            <div className="relative h-28 w-28 shrink-0 overflow-hidden rounded-xl bg-gray-100">
              <Image src={heroSrc} alt={product.name} fill sizes="112px" className="object-cover" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-base font-semibold text-gray-900">{product.name}</p>
              <p className="mt-0.5 text-sm font-bold text-gray-900">{formatPrice(product.price)}</p>
            </div>
          </div>

          <div className="mt-4 space-y-4">
            {attrs.map((a) => {
              const isColor = colorAttr?.id === a.id;
              const isSize = sizeAttr?.id === a.id;
              const current = sel[String(a.id)];
              return (
                <div key={a.id}>
                  <p className="mb-2 text-sm font-semibold text-gray-800">{a.name}</p>
                  <div className="flex flex-wrap items-center gap-2">
                    {a.values.map((v) => {
                      const active = current === String(v.id);
                      if (isColor) {
                        const hex = colorSwatch(v.value);
                        const needsBorder = isLightColor(hex);
                        return (
                          <button
                            key={v.id}
                            type="button"
                            onClick={() => pick(a.id, v.id)}
                            title={v.value}
                            aria-label={v.value}
                            aria-pressed={active}
                            className={`relative flex size-9 items-center justify-center rounded-full transition ${
                              active ? "ring-2 ring-gray-900 ring-offset-2" : "hover:ring-2 hover:ring-gray-300 hover:ring-offset-2"
                            }`}
                          >
                            <span
                              className={`size-7 rounded-full ${needsBorder ? "border border-gray-300" : ""}`}
                              style={{ backgroundColor: hex }}
                            />
                            {active && (
                              <Check className={`absolute size-4 ${needsBorder ? "text-gray-800" : "text-white"}`} />
                            )}
                          </button>
                        );
                      }
                      return (
                        <button
                          key={v.id}
                          type="button"
                          onClick={() => pick(a.id, v.id)}
                          className={`min-h-9 rounded-full border px-4 text-sm font-medium transition ${
                            active
                              ? "border-primary bg-primary text-white"
                              : "border-gray-300 bg-surface text-gray-700 hover:border-primary/50"
                          } ${isSize ? "min-w-11 text-center" : ""}`}
                        >
                          {v.value}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
            {attrs.length === 0 && (
              <p className="text-sm text-gray-400">—</p>
            )}
          </div>
        </div>

        <div className="flex gap-3 border-t border-gray-100 px-5 py-3">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 rounded-full border border-gray-300 px-4 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
          >
            {t(lang, "bundle.close")}
          </button>
          <button
            type="button"
            onClick={() => onConfirm(sel)}
            className="flex-[2] inline-flex items-center justify-center gap-2 rounded-full bg-primary px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-hover"
          >
            <Check className="size-4" />
            {t(lang, "bundle.addToSet")}
          </button>
        </div>
      </div>
    </div>
  );
}

function firstImage(p: Product): string {
  const img = p.images?.[0];
  return img?.thumbnailUrl || img?.url || FALLBACK_IMAGE;
}

/** Loads eligible partner products for the offer, excluding the current product. */
async function loadEligible(
  offer: PublicBundleOffer,
  current: Product,
  lang: string
): Promise<Product[]> {
  const exclude = (list: Product[]) => list.filter((p) => p.id !== current.id);

  if (offer.eligibility === "CATEGORY") {
    const catId =
      (current.categories ?? []).map((c) => c.id).find((id) => offer.eligibleCategoryIds.includes(id)) ??
      offer.eligibleCategoryIds[0];
    if (catId == null) return [];
    const res = await fetch(
      `${API_BASE_URL}/products/category/${catId}?lang=${encodeURIComponent(lang)}&status=PUBLISHED`,
      { cache: "no-store" }
    );
    if (!res.ok) return [];
    return exclude((await res.json()) as Product[]);
  }

  if (offer.eligibility === "SELECTED_PRODUCTS") {
    const ids = offer.eligibleProductIds.filter((id) => id !== current.id);
    const results = await Promise.all(
      ids.map((id) =>
        fetch(`${API_BASE_URL}/products/${id}?lang=${encodeURIComponent(lang)}`, { cache: "no-store" })
          .then((r) => (r.ok ? (r.json() as Promise<Product>) : null))
          .catch(() => null)
      )
    );
    return results.filter((p): p is Product => !!p && p.status === "PUBLISHED");
  }

  // ALL_PRODUCTS: a page of published products.
  const res = await fetch(
    `${API_BASE_URL}/products?page=0&size=24&lang=${encodeURIComponent(lang)}&status=PUBLISHED`,
    { cache: "no-store" }
  );
  if (!res.ok) return [];
  const data = await res.json();
  const content = (data.content ?? data) as Product[];
  return exclude(content);
}
