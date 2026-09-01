// Bundle / quantity-discount offers. Admin CRUD + storefront reads (active offers
// + authoritative cart pricing). Uses the shared axios client (`@/services/api`) —
// one base URL, one token convention. The backend is always the source of truth
// for the actual discount; storefront reads here are display-only.
import api from "./api";
import { API_BASE_URL } from "@/lib/config";

export type BundlePricingMethod =
  | "FIXED_BUNDLE_PRICE"
  | "PERCENTAGE_DISCOUNT"
  | "FIXED_AMOUNT_DISCOUNT";

export type BundleEligibility = "ALL_PRODUCTS" | "CATEGORY" | "SELECTED_PRODUCTS";

/** Full admin view of a bundle offer. */
export type BundleOffer = {
  id: number;
  name: string;
  description: string | null;
  active: boolean;
  minQuantity: number;
  pricingMethod: BundlePricingMethod;
  bundleValue: number;
  pricingLabel: string;
  eligibility: BundleEligibility;
  eligibleCategoryIds: number[];
  eligibleProductIds: number[];
  allowMixing: boolean;
  allowSameProduct: boolean;
  displayOnProduct: boolean;
  displayInCart: boolean;
  priority: number;
  usageCount: number;
  totalDiscountGiven: number;
  createdByEmail: string | null;
  updatedByEmail: string | null;
  createdAt: string | null;
  updatedAt: string | null;
};

/** Create/update payload. */
export type BundleRequest = {
  name: string;
  description?: string | null;
  active?: boolean;
  minQuantity: number;
  pricingMethod: BundlePricingMethod;
  bundleValue: number;
  eligibility: BundleEligibility;
  eligibleCategoryIds?: number[];
  eligibleProductIds?: number[];
  allowMixing?: boolean;
  allowSameProduct?: boolean;
  displayOnProduct?: boolean;
  displayInCart?: boolean;
  priority?: number;
};

/** Storefront-safe view of an active offer (display parameters only). */
export type PublicBundleOffer = {
  id: number;
  name: string;
  minQuantity: number;
  pricingMethod: BundlePricingMethod;
  bundleValue: number;
  eligibility: BundleEligibility;
  eligibleCategoryIds: number[];
  eligibleProductIds: number[];
  allowMixing: boolean;
  allowSameProduct: boolean;
  displayOnProduct: boolean;
  displayInCart: boolean;
};

/** Authoritative server-side cart pricing (subtotal + bundle + optional coupon). */
export type CartQuote = {
  currency: string;
  subtotal: number;
  shippingFee: number;
  bundleApplied: boolean;
  bundleOfferId: number | null;
  bundleLabel: string | null;
  bundleDiscount: number;
  bundleUnits: number;
  couponCode: string | null;
  couponValid: boolean;
  couponMessage: string | null;
  couponDiscount: number;
  upsellAvailable: boolean;
  upsellLabel: string | null;
  upsellMinQuantity: number;
  upsellUnitsNeeded: number;
  upsellSetPrice: number;
  totalDiscount: number;
  total: number;
};

export const BundleService = {
  list: async (): Promise<BundleOffer[]> => {
    const { data } = await api.get<BundleOffer[]>("/bundles");
    return data;
  },
  get: async (id: number): Promise<BundleOffer> => {
    const { data } = await api.get<BundleOffer>(`/bundles/${id}`);
    return data;
  },
  create: async (payload: BundleRequest): Promise<BundleOffer> => {
    const { data } = await api.post<BundleOffer>("/bundles", payload);
    return data;
  },
  update: async (id: number, payload: BundleRequest): Promise<BundleOffer> => {
    const { data } = await api.put<BundleOffer>(`/bundles/${id}`, payload);
    return data;
  },
  setActive: async (id: number, active: boolean): Promise<BundleOffer> => {
    const { data } = await api.patch<BundleOffer>(`/bundles/${id}/status`, { active });
    return data;
  },
  remove: async (id: number): Promise<void> => {
    await api.delete(`/bundles/${id}`);
  },
};

/** Active offers for storefront display (product page + cart). Non-secret. */
export async function fetchActiveBundles(): Promise<PublicBundleOffer[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/shop/bundles/active`, { cache: "no-store" });
    if (!res.ok) return [];
    return (await res.json()) as PublicBundleOffer[];
  } catch {
    return [];
  }
}

/** Authoritative price for a cart (server-computed bundle + optional coupon). */
export async function fetchCartQuote(
  items: { productId: number; quantity: number }[],
  opts: { couponCode?: string; email?: string } = {}
): Promise<CartQuote> {
  const { data } = await api.post<CartQuote>("/cart/quote", {
    items,
    couponCode: opts.couponCode,
    email: opts.email,
  });
  return data;
}
