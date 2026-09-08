"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, Save, AlertCircle, Package } from "lucide-react";
import { CategoryService } from "@/services/category.service";
import { ProductService } from "@/services/product.service";
import type { Category } from "@/types/category";
import type { AdminProduct } from "@/types/product";
import {
  type BundleOffer,
  type BundleRequest,
  type BundlePricingMethod,
  type BundleEligibility,
} from "@/services/bundle.service";

/** Flattens the category tree into a simple {id,name} list (indented children). */
function flatten(categories: Category[], depth = 0): { id: number; name: string }[] {
  const out: { id: number; name: string }[] = [];
  for (const c of categories) {
    out.push({ id: c.id, name: `${"— ".repeat(depth)}${c.name}` });
    if (c.children?.length) out.push(...flatten(c.children, depth + 1));
  }
  return out;
}

const PRICING_LABELS: Record<BundlePricingMethod, string> = {
  FIXED_BUNDLE_PRICE: "Fixed bundle price",
  PERCENTAGE_DISCOUNT: "Percentage discount",
  FIXED_AMOUNT_DISCOUNT: "Fixed amount off",
};

export default function BundleForm({
  initial,
  submitting,
  error,
  onSubmit,
}: {
  initial?: BundleOffer;
  submitting: boolean;
  error: string | null;
  onSubmit: (payload: BundleRequest) => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [active, setActive] = useState(initial?.active ?? true);
  const [minQuantity, setMinQuantity] = useState(initial?.minQuantity ?? 2);
  const [pricingMethod, setPricingMethod] = useState<BundlePricingMethod>(
    initial?.pricingMethod ?? "FIXED_BUNDLE_PRICE"
  );
  const [bundleValue, setBundleValue] = useState<number>(initial?.bundleValue ?? 349);
  const [eligibility, setEligibility] = useState<BundleEligibility>(
    initial?.eligibility ?? "CATEGORY"
  );
  const [categoryIds, setCategoryIds] = useState<number[]>(initial?.eligibleCategoryIds ?? []);
  const [productIds, setProductIds] = useState<number[]>(initial?.eligibleProductIds ?? []);
  const [allowMixing, setAllowMixing] = useState(initial?.allowMixing ?? true);
  const [allowSameProduct, setAllowSameProduct] = useState(initial?.allowSameProduct ?? true);
  const [displayOnProduct, setDisplayOnProduct] = useState(initial?.displayOnProduct ?? true);
  const [displayInCart, setDisplayInCart] = useState(initial?.displayInCart ?? true);
  const [priority, setPriority] = useState(initial?.priority ?? 0);

  const [categories, setCategories] = useState<{ id: number; name: string }[]>([]);
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    CategoryService.getAll()
      .then((cats) => setCategories(flatten(cats as Category[])))
      .catch(() => setCategories([]));
  }, []);

  // Only load the product list when the admin actually needs the product picker.
  useEffect(() => {
    if (eligibility !== "SELECTED_PRODUCTS" || products.length) return;
    ProductService.getAdminAll(0, 500)
      .then((res) => setProducts(res.content))
      .catch(() => setProducts([]));
  }, [eligibility, products.length]);

  const valueLabel = useMemo(() => {
    if (pricingMethod === "PERCENTAGE_DISCOUNT") return "Discount percentage (%)";
    if (pricingMethod === "FIXED_AMOUNT_DISCOUNT") return "Amount off per set (DH)";
    return "Bundle price for the set (DH)";
  }, [pricingMethod]);

  const toggleId = (list: number[], id: number) =>
    list.includes(id) ? list.filter((x) => x !== id) : [...list, id];

  const validate = (): string | null => {
    if (!name.trim()) return "Offer name is required.";
    if (!Number.isInteger(minQuantity) || minQuantity < 2)
      return "Minimum quantity must be a whole number of at least 2.";
    if (!(bundleValue > 0)) return "Bundle price / discount value must be greater than zero.";
    if (pricingMethod === "PERCENTAGE_DISCOUNT" && bundleValue > 100)
      return "Percentage discount cannot exceed 100%.";
    if (eligibility === "CATEGORY" && categoryIds.length === 0)
      return "Select at least one collection (category).";
    if (eligibility === "SELECTED_PRODUCTS" && productIds.length === 0)
      return "Select at least one product.";
    return null;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const err = validate();
    if (err) {
      setLocalError(err);
      return;
    }
    setLocalError(null);
    onSubmit({
      name: name.trim(),
      description: description.trim() || null,
      active,
      minQuantity,
      pricingMethod,
      bundleValue,
      eligibility,
      eligibleCategoryIds: eligibility === "CATEGORY" ? categoryIds : [],
      eligibleProductIds: eligibility === "SELECTED_PRODUCTS" ? productIds : [],
      allowMixing,
      allowSameProduct,
      displayOnProduct,
      displayInCart,
      priority,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-3xl space-y-6">
      {(localError || error) && (
        <div className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-600">
          <AlertCircle size={16} className="mt-0.5 shrink-0" />
          <span>{localError || error}</span>
        </div>
      )}

      <Section title="Offer">
        <Field label="Offer name" required>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Build Your Bloom Set"
            className={inputCls}
          />
        </Field>
        <Field label="Internal note (optional)">
          <input
            value={description ?? ""}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Shown to admins only"
            className={inputCls}
          />
        </Field>
        <Toggle label="Status" hint="Enable or disable this offer" value={active} onChange={setActive} onText="On" offText="Off" />
      </Section>

      <Section title="Trigger & pricing">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Minimum quantity" required>
            <input
              type="number"
              min={2}
              step={1}
              value={minQuantity}
              onChange={(e) => setMinQuantity(Number(e.target.value))}
              className={inputCls}
            />
          </Field>
          <Field label="Pricing method" required>
            <select
              value={pricingMethod}
              onChange={(e) => setPricingMethod(e.target.value as BundlePricingMethod)}
              className={inputCls}
            >
              {(Object.keys(PRICING_LABELS) as BundlePricingMethod[]).map((m) => (
                <option key={m} value={m}>{PRICING_LABELS[m]}</option>
              ))}
            </select>
          </Field>
        </div>
        <Field label={valueLabel} required>
          <input
            type="number"
            min={0}
            step="0.01"
            value={bundleValue}
            onChange={(e) => setBundleValue(Number(e.target.value))}
            className={inputCls}
          />
        </Field>
        <p className="text-xs text-gray-500">
          Applied per completed set of {minQuantity}. Larger carts repeat the offer per
          full set; leftover items are billed normally.
        </p>
      </Section>

      <Section title="Eligible products">
        <Field label="Eligibility" required>
          <select
            value={eligibility}
            onChange={(e) => setEligibility(e.target.value as BundleEligibility)}
            className={inputCls}
          >
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
                    <input
                      type="checkbox"
                      checked={categoryIds.includes(c.id)}
                      onChange={() => setCategoryIds((l) => toggleId(l, c.id))}
                      className="h-4 w-4 rounded border-gray-300"
                    />
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
              <p className="flex items-center gap-2 text-sm text-gray-400">
                <Package size={14} /> Loading products…
              </p>
            ) : (
              <div className="space-y-1.5">
                {products.map((p) => (
                  <label key={p.id} className="flex items-center gap-2 text-sm text-gray-700">
                    <input
                      type="checkbox"
                      checked={productIds.includes(p.id)}
                      onChange={() => setProductIds((l) => toggleId(l, p.id))}
                      className="h-4 w-4 rounded border-gray-300"
                    />
                    {p.name}
                  </label>
                ))}
              </div>
            )}
          </div>
        )}
      </Section>

      <Section title="Mix & match rules">
        <Toggle label="Allow mixing products" hint="Different eligible products can form one set" value={allowMixing} onChange={setAllowMixing} onText="Yes" offText="No" />
        <Toggle label="Allow same product" hint="Two units of the same product can count toward a set" value={allowSameProduct} onChange={setAllowSameProduct} onText="Yes" offText="No" />
      </Section>

      <Section title="Display & priority">
        <Toggle label="Show on product pages" value={displayOnProduct} onChange={setDisplayOnProduct} onText="Yes" offText="No" />
        <Toggle label="Show in cart" value={displayInCart} onChange={setDisplayInCart} onText="Yes" offText="No" />
        <Field label="Priority" hint="Higher wins when several offers could apply">
          <input
            type="number"
            step={1}
            value={priority}
            onChange={(e) => setPriority(Number(e.target.value))}
            className={inputCls}
          />
        </Field>
      </Section>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={submitting}
          className="inline-flex items-center gap-2 rounded-md bg-gray-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-black disabled:opacity-60"
        >
          {submitting ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          {submitting ? "Saving…" : "Save offer"}
        </button>
      </div>
    </form>
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

function Field({
  label, required, hint, children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
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

function Toggle({
  label, hint, value, onChange, onText, offText,
}: {
  label: string;
  hint?: string;
  value: boolean;
  onChange: (v: boolean) => void;
  onText: string;
  offText: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <p className="text-sm font-medium text-gray-700">{label}</p>
        {hint && <p className="text-xs text-gray-400">{hint}</p>}
      </div>
      <button
        type="button"
        onClick={() => onChange(!value)}
        className={`inline-flex h-8 w-28 items-center justify-center rounded-full px-3 text-xs font-semibold transition ${
          value ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-500"
        }`}
      >
        {value ? onText : offText}
      </button>
    </div>
  );
}
