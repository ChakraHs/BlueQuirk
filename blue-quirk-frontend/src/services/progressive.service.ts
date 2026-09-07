// Progressive multi-item discount. Admin read/update (singleton config) + a
// storefront-safe public read of the active campaign. Uses the shared axios client
// (`@/services/api`) for admin calls and a plain fetch for the public read (cacheable,
// no auth). The backend is always the source of truth for the ACTUAL discount — every
// figure here is display-only; the charged amount comes from POST /api/cart/quote and
// from checkout.
import api from "./api";
import { API_BASE_URL } from "@/lib/config";

export type ProgressiveCountingMethod = "UNIQUE_PRODUCTS" | "TOTAL_QUANTITY";
export type ProgressiveEligibility = "ALL_PRODUCTS" | "CATEGORY" | "SELECTED_PRODUCTS";

/** Full admin view of the singleton config (+ analytics + audit). */
export type ProgressiveSettings = {
  enabled: boolean;
  discountPerAdditionalItem: number;
  maxDiscount: number;
  minItems: number;
  countingMethod: ProgressiveCountingMethod;
  eligibility: ProgressiveEligibility;
  eligibleCategoryIds: number[];
  eligibleProductIds: number[];
  combineWithBundle: boolean;
  combineWithCoupons: boolean;
  startsOn: string | null;
  endsOn: string | null;
  displayOnProduct: boolean;
  displayInCart: boolean;
  version: number;
  usageCount: number;
  totalDiscountGiven: number;
  currency: string;
  updatedByEmail: string | null;
  updatedAt: string | null;
};

/** Admin update payload (full desired state — this is a singleton, not a patch). */
export type ProgressiveSettingsRequest = {
  enabled: boolean;
  discountPerAdditionalItem: number;
  maxDiscount: number;
  minItems: number;
  countingMethod: ProgressiveCountingMethod;
  eligibility: ProgressiveEligibility;
  eligibleCategoryIds: number[];
  eligibleProductIds: number[];
  combineWithBundle: boolean;
  combineWithCoupons: boolean;
  startsOn: string | null;
  endsOn: string | null;
  displayOnProduct: boolean;
  displayInCart: boolean;
};

/** Storefront-safe view of the active campaign (display params only). */
export type ProgressivePublicConfig = {
  enabled: boolean;
  discountPerAdditionalItem: number;
  maxDiscount: number;
  minItems: number;
  countingMethod: ProgressiveCountingMethod;
  eligibility: ProgressiveEligibility;
  eligibleCategoryIds: number[];
  eligibleProductIds: number[];
  displayOnProduct: boolean;
  displayInCart: boolean;
  currency: string;
};

export const ProgressiveDiscountService = {
  get: async (): Promise<ProgressiveSettings> => {
    const { data } = await api.get<ProgressiveSettings>("/progressive-discount");
    return data;
  },
  update: async (payload: ProgressiveSettingsRequest): Promise<ProgressiveSettings> => {
    const { data } = await api.put<ProgressiveSettings>("/progressive-discount", payload);
    return data;
  },
};

/** Active progressive-discount config for storefront display. Non-secret. */
export async function fetchProgressiveConfig(): Promise<ProgressivePublicConfig | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/shop/progressive-discount`, { cache: "no-store" });
    if (!res.ok) return null;
    const cfg = (await res.json()) as ProgressivePublicConfig;
    return cfg.enabled ? cfg : null;
  } catch {
    return null;
  }
}
