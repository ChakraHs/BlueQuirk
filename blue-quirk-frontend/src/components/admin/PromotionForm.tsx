"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, RefreshCw, Sparkles, Search, Lock } from "lucide-react";
import {
  type PromotionDetail, type PromotionRequest, type DiscountType,
  type CustomerEligibility,
} from "@/services/promotion.service";
import { CustomerService, customerName, type Customer } from "@/services/customer.service";

type Props = {
  initial?: PromotionDetail;
  submitting: boolean;
  error?: string | null;
  onSubmit: (payload: PromotionRequest) => void;
};

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function randomCode(len = 8): string {
  let s = "";
  for (let i = 0; i < len; i++) s += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  return s;
}

/** ISO_LOCAL_DATE_TIME (or ISO) → value for <input type="datetime-local"> (YYYY-MM-DDTHH:mm). */
function toLocalInput(iso?: string | null): string {
  if (!iso) return "";
  return iso.slice(0, 16);
}

export default function PromotionForm({ initial, submitting, error, onSubmit }: Props) {
  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [code, setCode] = useState(initial?.code ?? "");
  const [active, setActive] = useState(initial?.active ?? true);

  const [discountType, setDiscountType] = useState<DiscountType>(initial?.discountType ?? "PERCENTAGE");
  const [discountValue, setDiscountValue] = useState<string>(
    initial ? String(initial.discountValue) : ""
  );

  const [startDate, setStartDate] = useState(toLocalInput(initial?.startDate));
  const [endDate, setEndDate] = useState(toLocalInput(initial?.endDate));

  const [unlimitedUsage, setUnlimitedUsage] = useState(initial?.unlimitedUsage ?? true);
  const [maxGlobalUsage, setMaxGlobalUsage] = useState(
    initial?.maxGlobalUsage != null ? String(initial.maxGlobalUsage) : ""
  );
  const [maxUsagePerCustomer, setMaxUsagePerCustomer] = useState(
    initial?.maxUsagePerCustomer != null ? String(initial.maxUsagePerCustomer) : ""
  );

  const [minOrderAmount, setMinOrderAmount] = useState(
    initial?.minOrderAmount != null ? String(initial.minOrderAmount) : ""
  );
  const [maxDiscountAmount, setMaxDiscountAmount] = useState(
    initial?.maxDiscountAmount != null ? String(initial.maxDiscountAmount) : ""
  );

  const [eligibility, setEligibility] = useState<CustomerEligibility>(
    initial?.customerEligibility ?? "ALL_CUSTOMERS"
  );
  const [eligibleIds, setEligibleIds] = useState<Set<number>>(
    new Set(initial?.eligibleCustomerIds ?? [])
  );

  const [localError, setLocalError] = useState<string | null>(null);

  // Customer picker (loaded lazily when "selected customers" is chosen).
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customerQuery, setCustomerQuery] = useState("");
  useEffect(() => {
    if (eligibility === "SELECTED_CUSTOMERS" && customers.length === 0) {
      CustomerService.getAll().then(setCustomers).catch(() => {});
    }
  }, [eligibility, customers.length]);

  const filteredCustomers = useMemo(() => {
    const q = customerQuery.trim().toLowerCase();
    const list = q
      ? customers.filter((c) => customerName(c).toLowerCase().includes(q) || c.email.toLowerCase().includes(q))
      : customers;
    return list.slice(0, 50);
  }, [customers, customerQuery]);

  const validate = (): string | null => {
    if (!name.trim()) return "Promotion name is required.";
    const value = Number(discountValue);
    if (!discountValue || Number.isNaN(value) || value <= 0) return "Discount value must be greater than zero.";
    if (discountType === "PERCENTAGE" && value > 100) return "Percentage discount cannot exceed 100%.";
    if (startDate && endDate && new Date(endDate) < new Date(startDate)) return "End date must be after the start date.";
    if (!unlimitedUsage && maxGlobalUsage && Number(maxGlobalUsage) <= 0) return "Maximum global usage must be greater than zero.";
    if (eligibility === "SELECTED_CUSTOMERS" && eligibleIds.size === 0) return "Select at least one customer.";
    return null;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const err = validate();
    setLocalError(err);
    if (err) return;

    const num = (s: string): number | null => (s.trim() === "" ? null : Number(s));

    const payload: PromotionRequest = {
      name: name.trim(),
      description: description.trim() || null,
      code: code.trim() || null,
      active,
      discountType,
      discountValue: Number(discountValue),
      startDate: startDate || null,
      endDate: endDate || null,
      unlimitedUsage,
      maxGlobalUsage: unlimitedUsage ? null : num(maxGlobalUsage),
      maxUsagePerCustomer: num(maxUsagePerCustomer),
      minOrderAmount: num(minOrderAmount),
      maxDiscountAmount: num(maxDiscountAmount),
      customerEligibility: eligibility,
      eligibleCustomerIds: eligibility === "SELECTED_CUSTOMERS" ? [...eligibleIds] : [],
    };
    onSubmit(payload);
  };

  const toggleCustomer = (id: number) =>
    setEligibleIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <form onSubmit={handleSubmit} className="max-w-4xl space-y-6">
      {(localError || error) && (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-600">
          {localError || error}
        </div>
      )}

      {/* General */}
      <Section title="General" subtitle="Name, code and status.">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Promotion name" required>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Summer sale" className={inputCls} />
          </Field>
          <Field label="Coupon code" hint="Leave blank to auto-generate.">
            <div className="flex gap-2">
              <input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="AUTO" className={`${inputCls} font-mono`} />
              <button type="button" onClick={() => setCode(randomCode())} title="Generate" className="inline-flex shrink-0 items-center gap-1 rounded-md border border-gray-300 px-3 text-sm font-medium text-gray-700 hover:bg-gray-50">
                <RefreshCw size={14} /> Generate
              </button>
            </div>
          </Field>
        </div>
        <Field label="Internal description" hint="Only shown to admins.">
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} placeholder="Notes about this campaign…" className={inputCls} />
        </Field>
        <ToggleRow label="Active" description="Disabled coupons cannot be redeemed." checked={active} onChange={setActive} />
      </Section>

      {/* Discount */}
      <Section title="Discount" subtitle="How much is taken off.">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Discount type" required>
            <select value={discountType} onChange={(e) => setDiscountType(e.target.value as DiscountType)} className={inputCls}>
              <option value="PERCENTAGE">Percentage (%)</option>
              <option value="FIXED_AMOUNT">Fixed amount (DH)</option>
            </select>
          </Field>
          <Field label={discountType === "PERCENTAGE" ? "Percentage" : "Amount (DH)"} required>
            <input type="number" step="0.01" min="0" value={discountValue} onChange={(e) => setDiscountValue(e.target.value)} placeholder={discountType === "PERCENTAGE" ? "20" : "50"} className={inputCls} />
          </Field>
        </div>
        <div className="rounded-md bg-indigo-50 px-3 py-2 text-xs text-indigo-700">
          <Sparkles size={13} className="mr-1 inline" />
          More discount types (free shipping, buy X get Y) are supported by the engine and coming to this form.
        </div>
      </Section>

      {/* Validity */}
      <Section title="Validity" subtitle="Optional start and end dates.">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Start date" hint="Blank = active immediately.">
            <input type="datetime-local" value={startDate} onChange={(e) => setStartDate(e.target.value)} className={inputCls} />
          </Field>
          <Field label="End date" hint="Blank = never expires.">
            <input type="datetime-local" value={endDate} onChange={(e) => setEndDate(e.target.value)} className={inputCls} />
          </Field>
        </div>
      </Section>

      {/* Usage */}
      <Section title="Usage limits" subtitle="Cap how often the coupon can be used.">
        <ToggleRow label="Unlimited global usage" description="No cap on total redemptions." checked={unlimitedUsage} onChange={setUnlimitedUsage} />
        <div className="grid gap-4 sm:grid-cols-2">
          {!unlimitedUsage && (
            <Field label="Maximum global usage">
              <input type="number" min="1" value={maxGlobalUsage} onChange={(e) => setMaxGlobalUsage(e.target.value)} placeholder="100" className={inputCls} />
            </Field>
          )}
          <Field label="Maximum usage per customer" hint="Blank = unlimited per customer.">
            <input type="number" min="1" value={maxUsagePerCustomer} onChange={(e) => setMaxUsagePerCustomer(e.target.value)} placeholder="1" className={inputCls} />
          </Field>
        </div>
      </Section>

      {/* Conditions */}
      <Section title="Conditions" subtitle="When the coupon applies.">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Minimum order amount (DH)" hint="Order subtotal must reach this.">
            <input type="number" step="0.01" min="0" value={minOrderAmount} onChange={(e) => setMinOrderAmount(e.target.value)} placeholder="0" className={inputCls} />
          </Field>
          {discountType === "PERCENTAGE" && (
            <Field label="Maximum discount amount (DH)" hint="Caps a percentage discount.">
              <input type="number" step="0.01" min="0" value={maxDiscountAmount} onChange={(e) => setMaxDiscountAmount(e.target.value)} placeholder="No cap" className={inputCls} />
            </Field>
          )}
        </div>
      </Section>

      {/* Customer restrictions */}
      <Section title="Customer restrictions" subtitle="Who can redeem this coupon.">
        <div className="grid gap-2 sm:grid-cols-3">
          {([
            ["ALL_CUSTOMERS", "All customers"],
            ["FIRST_ORDER_ONLY", "First order only"],
            ["SELECTED_CUSTOMERS", "Selected customers"],
          ] as [CustomerEligibility, string][]).map(([val, label]) => (
            <label key={val} className={`flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm ${eligibility === val ? "border-blue-500 bg-blue-50 text-blue-700" : "border-gray-300 text-gray-700 hover:bg-gray-50"}`}>
              <input type="radio" name="eligibility" checked={eligibility === val} onChange={() => setEligibility(val)} className="h-4 w-4" />
              {label}
            </label>
          ))}
        </div>

        {eligibility === "SELECTED_CUSTOMERS" && (
          <div className="mt-3 rounded-lg border border-gray-200 p-3">
            <div className="relative mb-2">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input value={customerQuery} onChange={(e) => setCustomerQuery(e.target.value)} placeholder="Search customers…" className={`${inputCls} pl-8`} />
            </div>
            <p className="mb-2 text-xs text-gray-500">{eligibleIds.size} selected</p>
            <div className="max-h-52 space-y-1 overflow-y-auto">
              {filteredCustomers.map((c) => (
                <label key={c.id} className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-gray-50">
                  <input type="checkbox" checked={eligibleIds.has(c.id)} onChange={() => toggleCustomer(c.id)} className="h-4 w-4 rounded border-gray-300" />
                  <span className="font-medium text-gray-800">{customerName(c)}</span>
                  <span className="text-xs text-gray-400">{c.email}</span>
                </label>
              ))}
              {filteredCustomers.length === 0 && <p className="px-2 py-4 text-center text-xs text-gray-400">No customers found.</p>}
            </div>
          </div>
        )}
      </Section>

      {/* Future-ready placeholders */}
      <Section title="Advanced targeting" subtitle="Reserved for upcoming promotion types.">
        <div className="grid gap-2 sm:grid-cols-2">
          {["Category restriction", "Product restriction", "Brand restriction", "Free shipping", "Buy X get Y"].map((f) => (
            <div key={f} className="flex items-center justify-between rounded-md border border-dashed border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-400">
              <span>{f}</span>
              <span className="inline-flex items-center gap-1 rounded-full bg-gray-200 px-2 py-0.5 text-[11px] font-medium text-gray-500"><Lock size={10} /> Soon</span>
            </div>
          ))}
        </div>
      </Section>

      <div className="flex items-center gap-3 pt-2">
        <button type="submit" disabled={submitting} className="inline-flex items-center gap-2 rounded-md bg-gray-900 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-black disabled:opacity-60">
          {submitting && <Loader2 size={16} className="animate-spin" />}
          {initial ? "Save changes" : "Create promotion"}
        </button>
      </div>
    </form>
  );
}

const inputCls =
  "w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500";

function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="mb-4">
        <h2 className="text-base font-semibold text-gray-900">{title}</h2>
        {subtitle && <p className="text-xs text-gray-500">{subtitle}</p>}
      </div>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

function Field({ label, hint, required, children }: { label: string; hint?: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-gray-700">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
      {hint && <p className="mt-1 text-xs text-gray-400">{hint}</p>}
    </div>
  );
}

function ToggleRow({ label, description, checked, onChange }: { label: string; description?: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-4 rounded-md border border-gray-200 px-3 py-2.5">
      <span>
        <span className="block text-sm font-medium text-gray-800">{label}</span>
        {description && <span className="block text-xs text-gray-400">{description}</span>}
      </span>
      <span className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition ${checked ? "bg-emerald-500" : "bg-gray-300"}`}>
        <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="sr-only" />
        <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${checked ? "translate-x-5" : "translate-x-0.5"}`} />
      </span>
    </label>
  );
}
