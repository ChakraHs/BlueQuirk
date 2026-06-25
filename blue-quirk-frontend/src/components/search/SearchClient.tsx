"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search, SlidersHorizontal, X, ChevronDown, Check } from "lucide-react";
import ProductCard from "@/components/ProductCard";
import { ProductService } from "@/services/product.service";
import { Product } from "@/types/product";
import { formatPrice } from "@/lib/money";

/* ----------------------------- i18n labels ------------------------------ */

const DICT = {
  fr: {
    home: "Accueil",
    search: "Recherche",
    resultsFor: "Résultats pour",
    allProducts: "Tous les produits",
    product: "produit",
    products: "produits",
    found: "trouvé",
    foundP: "trouvés",
    filters: "Filtres",
    refine: "Affiner la recherche",
    keyword: "Mot-clé",
    keywordPh: "Rechercher un produit…",
    categories: "Catégories",
    size: "Taille",
    color: "Couleur",
    price: "Prix",
    min: "Min",
    max: "Max",
    availability: "Disponibilité",
    inStock: "En stock uniquement",
    clearAll: "Tout effacer",
    apply: "Voir les résultats",
    sortBy: "Trier par",
    relevance: "Pertinence",
    priceAsc: "Prix croissant",
    priceDesc: "Prix décroissant",
    nameAsc: "Nom (A-Z)",
    noResults: "Aucun produit ne correspond à votre recherche",
    noResultsHint: "Essayez un autre mot-clé ou réinitialisez les filtres.",
    backHome: "Retour à l’accueil",
    reset: "Réinitialiser",
  },
  ar: {
    home: "الرئيسية",
    search: "بحث",
    resultsFor: "نتائج البحث عن",
    allProducts: "كل المنتجات",
    product: "منتج",
    products: "منتجات",
    found: "تم العثور",
    foundP: "تم العثور",
    filters: "تصفية",
    refine: "تحسين البحث",
    keyword: "كلمة مفتاحية",
    keywordPh: "ابحث عن منتج…",
    categories: "الفئات",
    size: "المقاس",
    color: "اللون",
    price: "السعر",
    min: "الأدنى",
    max: "الأقصى",
    availability: "التوفر",
    inStock: "المتوفر فقط",
    clearAll: "مسح الكل",
    apply: "عرض النتائج",
    sortBy: "ترتيب حسب",
    relevance: "الأكثر صلة",
    priceAsc: "السعر تصاعدي",
    priceDesc: "السعر تنازلي",
    nameAsc: "الاسم (أ-ي)",
    noResults: "لا يوجد منتج يطابق بحثك",
    noResultsHint: "جرّب كلمة مفتاحية أخرى أو أعد ضبط الفلاتر.",
    backHome: "العودة إلى الرئيسية",
    reset: "إعادة ضبط",
  },
} as const;

type Lang = keyof typeof DICT;

/* --------------------------- helpers / mapping --------------------------- */

type SortKey = "relevance" | "price-asc" | "price-desc" | "name-asc";

// Canonical ordering for clothing sizes; unknown values sort after, alphabetically.
const SIZE_ORDER = ["XXS", "XS", "S", "M", "L", "XL", "XXL", "XXXL", "2XL", "3XL", "4XL"];

// A small map of common colour names (fr/en) → swatch hex. Falls back to a dot
// derived from the label so unknown colours still render a neutral chip.
const COLOR_HEX: Record<string, string> = {
  noir: "#111827", black: "#111827",
  blanc: "#f9fafb", white: "#f9fafb",
  gris: "#9ca3af", gray: "#9ca3af", grey: "#9ca3af",
  "heather grey": "#b0b3b8", "heather gray": "#b0b3b8",
  rouge: "#ef4444", red: "#ef4444",
  bleu: "#3b82f6", blue: "#3b82f6",
  "royal blue": "#1d4ed8",
  marine: "#1e3a8a", navy: "#1e3a8a",
  vert: "#22c55e", green: "#22c55e",
  "forest green": "#166534",
  jaune: "#eab308", yellow: "#eab308",
  mustard: "#d4a017",
  orange: "#f97316",
  rose: "#ec4899", pink: "#ec4899",
  violet: "#8b5cf6", purple: "#8b5cf6",
  marron: "#92400e", brown: "#92400e",
  maroon: "#7f1d1d",
  beige: "#e7d8c1",
};

// Resolve a colour label to a swatch hex: explicit map, a raw "#rrggbb" value,
// or a neutral fallback dot.
function colorSwatch(value: string): string {
  const key = value.trim().toLowerCase();
  if (COLOR_HEX[key]) return COLOR_HEX[key];
  if (/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(key)) return key;
  return "#d1d5db";
}

function stripHtml(html?: string): string {
  return html ? html.replace(/<[^>]*>/g, " ") : "";
}

function selectedValuesByType(p: Product, type: string): string[] {
  return (p.attributes ?? [])
    .filter((a) => (a.type ?? "").toUpperCase() === type)
    .flatMap((a) => a.values.filter((v) => v.selected).map((v) => v.value));
}

function isInStock(p: Product): boolean {
  if (p.status === "ARCHIVED") return false;
  if (typeof p.stockQuantity === "number") return p.stockQuantity > 0;
  return true;
}

function sortSizes(a: string, b: string): number {
  const ia = SIZE_ORDER.indexOf(a.toUpperCase());
  const ib = SIZE_ORDER.indexOf(b.toUpperCase());
  if (ia !== -1 && ib !== -1) return ia - ib;
  if (ia !== -1) return -1;
  if (ib !== -1) return 1;
  const na = Number(a), nb = Number(b);
  if (!Number.isNaN(na) && !Number.isNaN(nb)) return na - nb;
  return a.localeCompare(b);
}

/* ------------------------------- component ------------------------------- */

export default function SearchClient({
  lang,
  initialQuery,
}: {
  lang: string;
  initialQuery: string;
}) {
  const l: Lang = lang === "ar" ? "ar" : "fr";
  const t = DICT[l];
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();

  const [all, setAll] = useState<Product[] | null>(null);
  const [error, setError] = useState(false);

  // ---- filter state (initialised from the URL) ----
  const [query, setQuery] = useState(sp.get("q") ?? initialQuery ?? "");
  const [cats, setCats] = useState<Set<number>>(() => parseNums(sp.get("cat")));
  const [sizes, setSizes] = useState<Set<string>>(() => parseStrs(sp.get("size")));
  const [colors, setColors] = useState<Set<string>>(() => parseStrs(sp.get("color")));
  const [minPrice, setMinPrice] = useState<string>(sp.get("min") ?? "");
  const [maxPrice, setMaxPrice] = useState<string>(sp.get("max") ?? "");
  const [inStock, setInStock] = useState<boolean>(sp.get("stock") === "1");
  const [sort, setSort] = useState<SortKey>((sp.get("sort") as SortKey) || "relevance");
  const [drawerOpen, setDrawerOpen] = useState(false);

  // ---- fetch the catalog once ----
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await ProductService.getAll(0, 300, lang);
        if (alive) setAll(res.content ?? []);
      } catch {
        if (alive) setError(true);
      }
    })();
    return () => {
      alive = false;
    };
  }, [lang]);

  // ---- keep the URL in sync (shareable links / browser history) ----
  const firstSync = useRef(true);
  useEffect(() => {
    if (firstSync.current) {
      firstSync.current = false;
      return;
    }
    const params = new URLSearchParams();
    if (query.trim()) params.set("q", query.trim());
    if (cats.size) params.set("cat", [...cats].join(","));
    if (sizes.size) params.set("size", [...sizes].join(","));
    if (colors.size) params.set("color", [...colors].join(","));
    if (minPrice) params.set("min", minPrice);
    if (maxPrice) params.set("max", maxPrice);
    if (inStock) params.set("stock", "1");
    if (sort !== "relevance") params.set("sort", sort);
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }, [query, cats, sizes, colors, minPrice, maxPrice, inStock, sort, pathname, router]);

  /* --------------------------- derived facets --------------------------- */

  const facets = useMemo(() => {
    const products = all ?? [];
    const catMap = new Map<number, { name: string; count: number }>();
    const sizeMap = new Map<string, number>();
    const colorMap = new Map<string, number>();
    let lo = Infinity;
    let hi = 0;

    for (const p of products) {
      for (const c of p.categories ?? []) {
        const cur = catMap.get(c.id);
        catMap.set(c.id, { name: c.name, count: (cur?.count ?? 0) + 1 });
      }
      for (const s of selectedValuesByType(p, "SIZE"))
        sizeMap.set(s, (sizeMap.get(s) ?? 0) + 1);
      for (const c of selectedValuesByType(p, "COLOR"))
        colorMap.set(c, (colorMap.get(c) ?? 0) + 1);
      if (typeof p.price === "number") {
        lo = Math.min(lo, p.price);
        hi = Math.max(hi, p.price);
      }
    }

    return {
      categories: [...catMap.entries()]
        .map(([id, v]) => ({ id, name: v.name, count: v.count }))
        .sort((a, b) => a.name.localeCompare(b.name)),
      sizes: [...sizeMap.entries()]
        .map(([value, count]) => ({ value, count }))
        .sort((a, b) => sortSizes(a.value, b.value)),
      colors: [...colorMap.entries()]
        .map(([value, count]) => ({ value, count }))
        .sort((a, b) => a.value.localeCompare(b.value)),
      priceLo: Number.isFinite(lo) ? Math.floor(lo) : 0,
      priceHi: hi > 0 ? Math.ceil(hi) : 0,
    };
  }, [all]);

  /* ---------------------------- filtering ------------------------------ */

  const results = useMemo(() => {
    const products = all ?? [];
    const q = query.trim().toLowerCase();
    const min = minPrice ? Number(minPrice) : null;
    const max = maxPrice ? Number(maxPrice) : null;

    let out = products.filter((p) => {
      if (q) {
        const hay = `${p.name ?? ""} ${stripHtml(p.description)} ${(p.categories ?? [])
          .map((c) => c.name)
          .join(" ")}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (cats.size && !(p.categories ?? []).some((c) => cats.has(c.id))) return false;
      if (sizes.size) {
        const ps = selectedValuesByType(p, "SIZE");
        if (!ps.some((s) => sizes.has(s))) return false;
      }
      if (colors.size) {
        const pc = selectedValuesByType(p, "COLOR");
        if (!pc.some((c) => colors.has(c))) return false;
      }
      if (min !== null && p.price < min) return false;
      if (max !== null && p.price > max) return false;
      if (inStock && !isInStock(p)) return false;
      return true;
    });

    if (sort === "price-asc") out = [...out].sort((a, b) => a.price - b.price);
    else if (sort === "price-desc") out = [...out].sort((a, b) => b.price - a.price);
    else if (sort === "name-asc")
      out = [...out].sort((a, b) => (a.name ?? "").localeCompare(b.name ?? ""));
    else if (q)
      // relevance: name matches first, then prefix matches bubble up
      out = [...out].sort((a, b) => relevance(b, q) - relevance(a, q));

    return out;
  }, [all, query, cats, sizes, colors, minPrice, maxPrice, inStock, sort]);

  /* ------------------------------ actions ------------------------------ */

  const toggleNum = (set: Set<number>, setter: (s: Set<number>) => void, v: number) => {
    const next = new Set(set);
    if (next.has(v)) next.delete(v);
    else next.add(v);
    setter(next);
  };
  const toggleStr = (set: Set<string>, setter: (s: Set<string>) => void, v: string) => {
    const next = new Set(set);
    if (next.has(v)) next.delete(v);
    else next.add(v);
    setter(next);
  };

  const activeCount =
    cats.size + sizes.size + colors.size + (minPrice ? 1 : 0) + (maxPrice ? 1 : 0) + (inStock ? 1 : 0);

  const clearAll = () => {
    setCats(new Set());
    setSizes(new Set());
    setColors(new Set());
    setMinPrice("");
    setMaxPrice("");
    setInStock(false);
  };

  const loading = all === null && !error;

  /* ------------------------------- render ------------------------------ */

  const sidebar = (
    <div className="space-y-7">
      {/* keyword refine */}
      <FacetSection title={t.keyword}>
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t.keywordPh}
            className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          />
        </div>
      </FacetSection>

      {facets.categories.length > 0 && (
        <FacetSection title={t.categories}>
          <ul className="space-y-1.5">
            {facets.categories.map((c) => (
              <li key={c.id}>
                <CheckRow
                  checked={cats.has(c.id)}
                  onChange={() => toggleNum(cats, setCats, c.id)}
                  label={c.name}
                  count={c.count}
                />
              </li>
            ))}
          </ul>
        </FacetSection>
      )}

      {facets.sizes.length > 0 && (
        <FacetSection title={t.size}>
          <div className="flex flex-wrap gap-2">
            {facets.sizes.map((s) => {
              const on = sizes.has(s.value);
              return (
                <button
                  key={s.value}
                  type="button"
                  onClick={() => toggleStr(sizes, setSizes, s.value)}
                  className={`min-w-[2.5rem] rounded-md border px-2.5 py-1.5 text-xs font-semibold transition ${
                    on
                      ? "border-gray-900 bg-gray-900 text-white"
                      : "border-gray-200 bg-white text-gray-700 hover:border-gray-400"
                  }`}
                >
                  {s.value}
                </button>
              );
            })}
          </div>
        </FacetSection>
      )}

      {facets.colors.length > 0 && (
        <FacetSection title={t.color}>
          <div className="flex flex-wrap gap-2">
            {facets.colors.map((c) => {
              const on = colors.has(c.value);
              const hex = colorSwatch(c.value);
              return (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => toggleStr(colors, setColors, c.value)}
                  title={c.value}
                  className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-xs font-medium transition ${
                    on
                      ? "border-gray-900 bg-gray-900 text-white"
                      : "border-gray-200 bg-white text-gray-700 hover:border-gray-400"
                  }`}
                >
                  <span
                    className="h-3.5 w-3.5 rounded-full ring-1 ring-black/10"
                    style={{ backgroundColor: hex }}
                  />
                  {c.value}
                </button>
              );
            })}
          </div>
        </FacetSection>
      )}

      {facets.priceHi > 0 && (
        <FacetSection title={`${t.price} (DH)`}>
          <div className="flex items-center gap-2">
            <input
              type="number"
              inputMode="numeric"
              value={minPrice}
              min={0}
              onChange={(e) => setMinPrice(e.target.value)}
              placeholder={`${t.min} ${facets.priceLo}`}
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
            <span className="text-gray-400">—</span>
            <input
              type="number"
              inputMode="numeric"
              value={maxPrice}
              min={0}
              onChange={(e) => setMaxPrice(e.target.value)}
              placeholder={`${t.max} ${facets.priceHi}`}
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </FacetSection>
      )}

      <FacetSection title={t.availability}>
        <CheckRow
          checked={inStock}
          onChange={() => setInStock((v) => !v)}
          label={t.inStock}
        />
      </FacetSection>
    </div>
  );

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:py-10" dir={l === "ar" ? "rtl" : "ltr"}>
      {/* breadcrumb + heading */}
      <div className="mb-6">
        <p className="text-sm text-gray-500">
          <Link href={`/${lang}`} className="hover:text-gray-900">
            {t.home}
          </Link>{" "}
          / {t.search}
        </p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-gray-900 md:text-3xl">
          {query.trim() ? (
            <>
              {t.resultsFor} <span className="text-blue-600">“{query.trim()}”</span>
            </>
          ) : (
            t.allProducts
          )}
        </h1>
      </div>

      {/* toolbar */}
      <div className="mb-5 flex items-center justify-between gap-3 border-b border-gray-100 pb-4">
        <p className="text-sm text-gray-500">
          {loading
            ? "…"
            : `${results.length} ${
                results.length === 1 ? t.product : t.products
              } ${results.length === 1 ? t.found : t.foundP}`}
        </p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 lg:hidden"
          >
            <SlidersHorizontal size={15} />
            {t.filters}
            {activeCount > 0 && (
              <span className="rounded-full bg-blue-600 px-1.5 text-xs text-white">{activeCount}</span>
            )}
          </button>
          <div className="relative">
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortKey)}
              className="appearance-none rounded-lg border border-gray-200 bg-white py-2 pl-3 pr-8 text-sm font-medium text-gray-700 outline-none focus:border-blue-500"
            >
              <option value="relevance">{t.relevance}</option>
              <option value="price-asc">{t.priceAsc}</option>
              <option value="price-desc">{t.priceDesc}</option>
              <option value="name-asc">{t.nameAsc}</option>
            </select>
            <ChevronDown
              size={15}
              className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400"
            />
          </div>
        </div>
      </div>

      {/* active filter chips */}
      {activeCount > 0 && (
        <div className="mb-5 flex flex-wrap items-center gap-2">
          {[...cats].map((id) => {
            const c = facets.categories.find((x) => x.id === id);
            return (
              <Chip key={`c${id}`} onClear={() => toggleNum(cats, setCats, id)}>
                {c?.name ?? id}
              </Chip>
            );
          })}
          {[...sizes].map((s) => (
            <Chip key={`s${s}`} onClear={() => toggleStr(sizes, setSizes, s)}>
              {t.size}: {s}
            </Chip>
          ))}
          {[...colors].map((c) => (
            <Chip key={`col${c}`} onClear={() => toggleStr(colors, setColors, c)}>
              {t.color}: {c}
            </Chip>
          ))}
          {(minPrice || maxPrice) && (
            <Chip
              onClear={() => {
                setMinPrice("");
                setMaxPrice("");
              }}
            >
              {formatPrice(Number(minPrice || facets.priceLo))} —{" "}
              {formatPrice(Number(maxPrice || facets.priceHi))}
            </Chip>
          )}
          {inStock && <Chip onClear={() => setInStock(false)}>{t.inStock}</Chip>}
          <button
            type="button"
            onClick={clearAll}
            className="ml-1 text-xs font-semibold text-blue-600 hover:text-blue-700"
          >
            {t.clearAll}
          </button>
        </div>
      )}

      <div className="flex gap-8">
        {/* desktop sidebar */}
        <aside className="hidden w-64 shrink-0 lg:block">
          <div className="sticky top-24">{sidebar}</div>
        </aside>

        {/* results */}
        <div className="min-w-0 flex-1">
          {error ? (
            <EmptyState
              title={t.noResults}
              hint={t.noResultsHint}
              cta={t.backHome}
              href={`/${lang}`}
            />
          ) : loading ? (
            <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:gap-x-6 lg:grid-cols-3 xl:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="aspect-square rounded-xl bg-gray-100" />
                  <div className="mt-3 h-3 w-3/4 rounded bg-gray-100" />
                  <div className="mt-2 h-3 w-1/3 rounded bg-gray-100" />
                </div>
              ))}
            </div>
          ) : results.length === 0 ? (
            <div className="py-6">
              <EmptyState
                title={t.noResults}
                hint={t.noResultsHint}
                cta={activeCount > 0 ? t.reset : t.backHome}
                onCta={activeCount > 0 ? clearAll : undefined}
                href={activeCount > 0 ? undefined : `/${lang}`}
              />
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:gap-x-6 lg:grid-cols-3 xl:grid-cols-4">
              {results.map((p) => (
                <ProductCard key={p.id} product={p} lang={lang} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* mobile filter drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setDrawerOpen(false)}
          />
          <div
            className={`absolute top-0 h-full w-[85%] max-w-sm overflow-y-auto bg-white p-5 shadow-xl ${
              l === "ar" ? "left-0" : "right-0"
            }`}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-semibold text-gray-900">{t.refine}</h2>
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                className="rounded-full p-1.5 text-gray-500 hover:bg-gray-100"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>
            {sidebar}
            <div className="mt-6 flex gap-2">
              {activeCount > 0 && (
                <button
                  type="button"
                  onClick={clearAll}
                  className="flex-1 rounded-lg border border-gray-200 py-2.5 text-sm font-medium text-gray-700"
                >
                  {t.clearAll}
                </button>
              )}
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                className="flex-1 rounded-lg bg-blue-600 py-2.5 text-sm font-semibold text-white"
              >
                {t.apply} ({results.length})
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

/* ----------------------------- sub-components ---------------------------- */

function FacetSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-500">
        {title}
      </h3>
      {children}
    </div>
  );
}

function CheckRow({
  checked,
  onChange,
  label,
  count,
}: {
  checked: boolean;
  onChange: () => void;
  label: string;
  count?: number;
}) {
  return (
    <button
      type="button"
      onClick={onChange}
      className="flex w-full items-center gap-2.5 text-left text-sm text-gray-700 hover:text-gray-900"
    >
      <span
        className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border transition ${
          checked ? "border-gray-900 bg-gray-900 text-white" : "border-gray-300 bg-white"
        }`}
      >
        {checked && <Check size={12} strokeWidth={3} />}
      </span>
      <span className="flex-1 truncate">{label}</span>
      {typeof count === "number" && <span className="text-xs text-gray-400">{count}</span>}
    </button>
  );
}

function Chip({ children, onClear }: { children: React.ReactNode; onClear: () => void }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 py-1 pl-3 pr-1.5 text-xs font-medium text-gray-700">
      {children}
      <button
        type="button"
        onClick={onClear}
        className="flex h-4 w-4 items-center justify-center rounded-full text-gray-500 hover:bg-gray-300 hover:text-gray-800"
        aria-label="Remove filter"
      >
        <X size={11} />
      </button>
    </span>
  );
}

function EmptyState({
  title,
  hint,
  cta,
  href,
  onCta,
}: {
  title: string;
  hint: string;
  cta: string;
  href?: string;
  onCta?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 py-20 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-gray-100 text-gray-400">
        <Search size={26} />
      </span>
      <h2 className="mt-5 text-lg font-semibold text-gray-900">{title}</h2>
      <p className="mt-1 max-w-sm text-sm text-gray-500">{hint}</p>
      {onCta ? (
        <button
          type="button"
          onClick={onCta}
          className="mt-6 rounded-full bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
        >
          {cta}
        </button>
      ) : href ? (
        <Link
          href={href}
          className="mt-6 rounded-full bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
        >
          {cta}
        </Link>
      ) : null}
    </div>
  );
}

/* ------------------------------- utilities ------------------------------- */

function parseNums(csv: string | null): Set<number> {
  if (!csv) return new Set();
  return new Set(csv.split(",").map(Number).filter((n) => !Number.isNaN(n)));
}
function parseStrs(csv: string | null): Set<string> {
  if (!csv) return new Set();
  return new Set(csv.split(",").filter(Boolean));
}
function relevance(p: Product, q: string): number {
  const name = (p.name ?? "").toLowerCase();
  if (name === q) return 3;
  if (name.startsWith(q)) return 2;
  if (name.includes(q)) return 1;
  return 0;
}
