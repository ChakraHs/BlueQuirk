"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, Save, AlertCircle, Package, Gift, CheckCircle2 } from "lucide-react";
import PageHeader from "@/components/admin/ui/PageHeader";
import { CategoryService } from "@/services/category.service";
import { ProductService } from "@/services/product.service";
import type { Category } from "@/types/category";
import type { AdminProduct } from "@/types/product";
import {
  ProgressiveDiscountService,
  type ProgressiveSettings,
  type ProgressiveCountingMethod,
  type ProgressiveEligibility,
} from "@/services/progressive.service";
import { formatPrice } from "@/lib/money";

/** Flattens the category tree into a simple {id,name} list (indented children). */
function flatten(categories: Category[], depth = 0): { id: number; name: string }[] {
  const out: { id: number; name: string }[] = [];
  for (const c of categories) {
    out.push({ id: c.id, name: `${"— ".repeat(depth)}${c.name}` });
    if (c.children?.length) out.push(...flatten(c.children, depth + 1));
  }
  return out;
}

export default function ProgressiveDiscountPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [meta, setMeta] = useState<Pick<
    ProgressiveSettings,
    "version" | "usageCount" | "totalDiscountGiven" | "currency" | "updatedByEmail" | "updatedAt"
  > | null>(null);

  // --- Form state ---
  const [enabled, setEnabled] = useState(false);
  const [perItem, setPerItem] = useState(20);
  const [maxDiscount, setMaxDiscount] = useState(0);
  const [minItems, setMinItems] = useState(2);
  const [countingMethod, setCountingMethod] = useState<ProgressiveCountingMethod>("UNIQUE_PRODUCTS");
  const [eligibility, setEligibility] = useState<ProgressiveEligibility>("ALL_PRODUCTS");
  const [categoryIds, setCategoryIds] = useState<number[]>([]);
  const [productIds, setProductIds] = useState<number[]>([]);
  const [combineWithBundle, setCombineWithBundle] = useState(true);
  const [combineWithCoupons, setCombineWithCoupons] = useState(false);
  const [startsOn, setStartsOn] = useState("");
  const [endsOn, setEndsOn] = useState("");
  const [displayOnProduct, setDisplayOnProduct] = useState(true);
  const [displayInCart, setDisplayInCart] = useState(true);

  const [categories, setCategories] = useState<{ id: number; name: string }[]>([]);
  const [products, setProducts] = useState<AdminProduct[]>([]);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const s = await ProgressiveDiscountService.get();
      setEnabled(s.enabled);
      setPerItem(s.discountPerAdditionalItem);
      setMaxDiscount(s.maxDiscount);
      setMinItems(s.minItems);
      setCountingMethod(s.countingMethod);
      setEligibility(s.eligibility);
      setCategoryIds(s.eligibleCategoryIds ?? []);
      setProductIds(s.eligibleProductIds ?? []);
      setCombineWithBundle(s.combineWithBundle);
      setCombineWithCoupons(s.combineWithCoupons);
      setStartsOn(s.startsOn ?? "");
      setEndsOn(s.endsOn ?? "");
      setDisplayOnProduct(s.displayOnProduct);
      setDisplayInCart(s.displayInCart);
      setMeta(s);
      setError(null);
    } catch {
      setError("Failed to load the progressive-discount settings.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    CategoryService.getAll()
      .then((cats) => setCategories(flatten(cats as Category[])))
      .catch(() => setCategories([]));
  }, []);

  useEffect(() => {
    if (eligibility !== "SELECTED_PRODUCTS" || products.length) return;
    ProductService.getAdminAll(0, 500)
      .then((res) => setProducts(res.content))
      .catch(() => setProducts([]));
  }, [eligibility, products.length]);

  const toggleId = (list: number[], id: number) =>
    list.includes(id) ? list.filter((x) => x !== id) : [...list, id];

  const currency = meta?.currency ?? "DH";

  // Live preview of the reward ladder (mirrors the backend engine, display-only).
  const ladder = useMemo(() => {
    const rows: { items: number; discount: number }[] = [];
    for (let items = 1; items <= 6; items++) {
      let d = Math.max(0, items - Math.max(1, minItems) + 1) * perItem;
      // Below the gate → 0; first qualifying step is (minItems-1)*perItem style handled
      // uniformly by the engine as (count-1)*perItem, so recompute the simple way:
      d = items < minItems ? 0 : Math.max(0, items - 1) * perItem;
      if (maxDiscount > 0) d = Math.min(d, maxDiscount);
      rows.push({ items, discount: d });
    }
    return rows;
  }, [perItem, minItems, maxDiscount]);

  const validate = (): string | null => {
    if (!(perItem > 0)) return "Discount per additional item must be greater than zero.";
    if (!Number.isInteger(minItems) || minItems < 1)
      return "Minimum items must be a whole number of at least 1.";
    if (maxDiscount < 0) return "Maximum discount cannot be negative.";
    if (eligibility === "CATEGORY" && categoryIds.length === 0)
      return "Select at least one collection (category).";
    if (eligibility === "SELECTED_PRODUCTS" && productIds.length === 0)
      return "Select at least one product.";
    if (startsOn && endsOn && startsOn > endsOn)
      return "Campaign start date must be on or before the end date.";
    return null;
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const err = validate();
    if (err) { setError(err); setSaved(false); return; }
    setSaving(true);
    setError(null);
    try {
      const updated = await ProgressiveDiscountService.update({
        enabled,
        discountPerAdditionalItem: perItem,
        maxDiscount,
        minItems,
        countingMethod,
        eligibility,
        eligibleCategoryIds: eligibility === "CATEGORY" ? categoryIds : [],
        eligibleProductIds: eligibility === "SELECTED_PRODUCTS" ? productIds : [],
        combineWithBundle,
        combineWithCoupons,
        startsOn: startsOn || null,
        endsOn: endsOn || null,
        displayOnProduct,
        displayInCart,
      });
      setMeta(updated);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch {
      setError("Failed to save. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Progressive Discount"
        subtitle="Reward customers for building a bigger order — the more eligible items they add, the more they save."
      />

      {loading ? (
        <div className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white p-8 text-sm text-gray-500">
          <Loader2 size={16} className="animate-spin" /> Loading settings…
        </div>
      ) : (
        <form onSubmit={handleSave} className="max-w-3xl space-y-6">
          {error && (
            <div className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-600">
              <AlertCircle size={16} className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}
          {saved && (
            <div className="flex items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
              <CheckCircle2 size={16} /> Saved. New orders use this configuration; past orders keep their recorded discount.
            </div>
          )}

          <Section title="Campaign">
            <Toggle
              label="Enable progressive discount"
              hint="When off, the discount never applies nor displays anywhere."
              value={enabled}
              onChange={setEnabled}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Campaign start (optional)" hint="Leave blank to start immediately.">
                <input type="date" value={startsOn} onChange={(e) => setStartsOn(e.target.value)} className={inputCls} />
              </Field>
              <Field label="Campaign end (optional)" hint="Leave blank to run indefinitely.">
                <input type="date" value={endsOn} onChange={(e) => setEndsOn(e.target.value)} className={inputCls} />
              </Field>
            </div>
          </Section>

          <Section title="Reward">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={`Discount per additional item (${currency})`} required>
                <input type="number" min={0} step="0.01" value={perItem}
                  onChange={(e) => setPerItem(Number(e.target.value))} className={inputCls} />
              </Field>
              <Field label={`Maximum discount (${currency})`} hint="0 = no cap.">
                <input type="number" min={0} step="0.01" value={maxDiscount}
                  onChange={(e) => setMaxDiscount(Number(e.target.value))} className={inputCls} />
              </Field>
            </div>
            <Field label="Minimum items to activate" required hint="Below this, no discount is unlocked. Default 2 (a single item earns nothing).">
              <input type="number" min={1} step={1} value={minItems}
                onChange={(e) => setMinItems(Number(e.target.value))} className={inputCls} />
            </Field>

            {/* Live reward-ladder preview */}
            <div className="rounded-lg border border-primary/20 bg-primary/[0.03] p-4">
              <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-gray-500">
                <Gift size={13} className="text-primary" /> Reward preview
              </p>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
                {ladder.map((r) => (
                  <div key={r.items} className="rounded-md bg-white px-2 py-1.5 text-center shadow-sm ring-1 ring-gray-100">
                    <p className="text-[11px] text-gray-500">{r.items} {r.items === 1 ? "item" : "items"}</p>
                    <p className={`text-sm font-bold ${r.discount > 0 ? "text-emerald-600" : "text-gray-300"}`}>
                      {r.discount > 0 ? `−${formatPrice(r.discount)}` : "—"}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </Section>

          <Section title="Counting">
            <Field label="How to count items" required>
              <div className="space-y-2">
                <Radio
                  name="counting" checked={countingMethod === "UNIQUE_PRODUCTS"}
                  onChange={() => setCountingMethod("UNIQUE_PRODUCTS")}
                  title="Unique products"
                  desc="Each eligible product line counts once (Hoodie + Shirt + Shirt = 3 items)."
                />
                <Radio
                  name="counting" checked={countingMethod === "TOTAL_QUANTITY"}
                  onChange={() => setCountingMethod("TOTAL_QUANTITY")}
                  title="Total quantities"
                  desc="Each eligible unit counts (Hoodie×2 + Shirt×1 = 3 items)."
                />
              </div>
            </Field>
          </Section>

          <Section title="Eligible products">
            <Field label="Applies to" required>
              <select value={eligibility} onChange={(e) => setEligibility(e.target.value as ProgressiveEligibility)} className={inputCls}>
                <option value="ALL_PRODUCTS">All products</option>
                <option value="CATEGORY">Collection (category)</option>
                <option value="SELECTED_PRODUCTS">Selected products</option>
              </select>
            </Field>

            {eligibility === "CATEGORY" && (
              <div className="max-h-56 overflow-y-auto rounded-md border border-gray-200 p-3">
                {categories.length === 0 ? (
                  <p className="text-sm text-gray-400">No collections found.</p>
                ) : (
                  <div className="grid gap-1.5 sm:grid-cols-2">
                    {categories.map((c) => (
                      <label key={c.id} className="flex items-center gap-2 text-sm text-gray-700">
                        <input type="checkbox" checked={categoryIds.includes(c.id)}
                          onChange={() => setCategoryIds((l) => toggleId(l, c.id))}
                          className="h-4 w-4 rounded border-gray-300" />
                        {c.name}
                      </label>
                    ))}
                  </div>
                )}
              </div>
            )}

            {eligibility === "SELECTED_PRODUCTS" && (
              <div className="max-h-64 overflow-y-auto rounded-md border border-gray-200 p-3">
                {products.length === 0 ? (
                  <p className="flex items-center gap-2 text-sm text-gray-400"><Package size={14} /> Loading products…</p>
                ) : (
                  <div className="space-y-1.5">
                    {products.map((p) => (
                      <label key={p.id} className="flex items-center gap-2 text-sm text-gray-700">
                        <input type="checkbox" checked={productIds.includes(p.id)}
                          onChange={() => setProductIds((l) => toggleId(l, p.id))}
                          className="h-4 w-4 rounded border-gray-300" />
                        {p.name}
                      </label>
                    ))}
                  </div>
                )}
              </div>
            )}
          </Section>

          <Section title="Stacking with other discounts">
            <Toggle
              label="Combine with quantity bundles"
              hint="Off: the progressive discount is skipped on carts that already got a bundle discount."
              value={combineWithBundle} onChange={setCombineWithBundle}
            />
            <Toggle
              label="Combine with coupons"
              hint="Off: when a valid coupon is applied, the progressive discount steps aside (no double discount)."
              value={combineWithCoupons} onChange={setCombineWithCoupons}
            />
            <p className="text-xs text-gray-400">
              Order of discounts: bundle → progressive → coupon → shipping.
            </p>
          </Section>

          <Section title="Where to show it">
            <Toggle label="Show on product pages" value={displayOnProduct} onChange={setDisplayOnProduct} />
            <Toggle label="Show in cart & checkout" value={displayInCart} onChange={setDisplayInCart} />
          </Section>

          {meta && (
            <p className="text-xs text-gray-400">
              Rule version {meta.version} · used on {meta.usageCount} order(s) · {formatPrice(meta.totalDiscountGiven)} given
              {meta.updatedByEmail ? ` · last edited by ${meta.updatedByEmail}` : ""}
            </p>
          )}

          <div className="flex items-center gap-3">
            <button type="submit" disabled={saving}
              className="inline-flex items-center gap-2 rounded-md bg-gray-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-black disabled:opacity-60">
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              {saving ? "Saving…" : "Save settings"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

const inputCls =
  "w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-500">{title}</h3>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

function Field({ label, required, hint, children }: {
  label: string; required?: boolean; hint?: string; children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-gray-700">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
      {hint && <p className="mt-1 text-xs text-gray-400">{hint}</p>}
    </div>
  );
}

function Toggle({ label, hint, value, onChange }: {
  label: string; hint?: string; value: boolean; onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <p className="text-sm font-medium text-gray-700">{label}</p>
        {hint && <p className="text-xs text-gray-400">{hint}</p>}
      </div>
      <button type="button" onClick={() => onChange(!value)}
        className={`inline-flex h-8 w-20 shrink-0 items-center justify-center rounded-full px-3 text-xs font-semibold transition ${
          value ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-500"
        }`}>
        {value ? "On" : "Off"}
      </button>
    </div>
  );
}

function Radio({ name, checked, onChange, title, desc }: {
  name: string; checked: boolean; onChange: () => void; title: string; desc: string;
}) {
  return (
    <label className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition ${
      checked ? "border-primary/40 bg-primary/[0.04]" : "border-gray-200 hover:border-gray-300"
    }`}>
      <input type="radio" name={name} checked={checked} onChange={onChange} className="mt-0.5 h-4 w-4" />
      <span>
        <span className="block text-sm font-medium text-gray-800">{title}</span>
        <span className="block text-xs text-gray-500">{desc}</span>
      </span>
    </label>
  );
}
