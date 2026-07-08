// Admin Promotion & Coupon management + storefront coupon validation. Uses the
// shared axios client (`@/services/api`) — one base URL, one token convention.
import api from "./api";

export type DiscountType = "PERCENTAGE" | "FIXED_AMOUNT" | "FREE_SHIPPING" | "BUY_X_GET_Y";
export type CustomerEligibility = "ALL_CUSTOMERS" | "SELECTED_CUSTOMERS" | "FIRST_ORDER_ONLY";
export type PromotionScope = "ENTIRE_ORDER" | "CATEGORY" | "PRODUCT" | "BRAND";
export type PromotionStatus =
  | "DISABLED"
  | "SCHEDULED"
  | "ACTIVE"
  | "EXPIRED"
  | "EXHAUSTED";

/** Lean row for the admin list. */
export type PromotionSummary = {
  id: number;
  name: string;
  code: string;
  discountType: DiscountType;
  discountValue: number;
  discountLabel: string;
  active: boolean;
  status: PromotionStatus;
  usageCount: number;
  maxGlobalUsage: number | null;
  maxUsagePerCustomer: number | null;
  startDate: string | null;
  endDate: string | null;
  minOrderAmount: number | null;
  totalDiscountGiven: number;
  totalRevenueGenerated: number;
  createdByEmail: string | null;
  createdAt: string | null;
};

/** Full promotion detail for the edit screen. */
export type PromotionDetail = PromotionSummary & {
  description: string | null;
  unlimitedUsage: boolean;
  remainingUsage: number | null;
  maxDiscountAmount: number | null;
  customerEligibility: CustomerEligibility;
  eligibleCustomerIds: number[];
  freeShipping: boolean;
  scope: PromotionScope;
  restrictedCategoryIds: number[];
  restrictedProductIds: number[];
  restrictedBrandIds: number[];
  totalRevenueGenerated: number;
  lastUsedAt: string | null;
  createdBy: number | null;
  updatedBy: number | null;
  updatedByEmail: string | null;
  updatedAt: string | null;
};

/** Create/update payload. */
export type PromotionRequest = {
  name: string;
  description?: string | null;
  code?: string | null;
  active?: boolean;
  discountType: DiscountType;
  discountValue: number;
  startDate?: string | null;
  endDate?: string | null;
  unlimitedUsage?: boolean;
  maxGlobalUsage?: number | null;
  maxUsagePerCustomer?: number | null;
  minOrderAmount?: number | null;
  maxDiscountAmount?: number | null;
  customerEligibility?: CustomerEligibility;
  eligibleCustomerIds?: number[];
  freeShipping?: boolean;
  scope?: PromotionScope;
  restrictedCategoryIds?: number[];
  restrictedProductIds?: number[];
  restrictedBrandIds?: number[];
};

export type PromotionStats = {
  totalPromotions: number;
  activePromotions: number;
  totalRedemptions: number;
  totalDiscountGiven: number;
  totalRevenueGenerated: number;
  averageDiscount: number;
  topPromotions: {
    id: number;
    code: string;
    name: string;
    usageCount: number;
    totalDiscountGiven: number;
    totalRevenueGenerated: number;
  }[];
};

export type PromotionPage = {
  content: PromotionSummary[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
};

export type ListParams = {
  page?: number;
  size?: number;
  search?: string;
  status?: string;
  type?: DiscountType | "";
  sortBy?: string;
  sortDir?: "asc" | "desc";
};

// --- Storefront coupon validation ---
export type CouponValidation = {
  valid: boolean;
  code: string | null;
  message: string | null;
  discountType: DiscountType | null;
  subtotal: number;
  shippingFee: number;
  discountAmount: number;
  total: number;
  promotionId: number | null;
};

export const PromotionService = {
  list: async (params: ListParams = {}): Promise<PromotionPage> => {
    const { data } = await api.get<PromotionPage>("/promotions", { params });
    return data;
  },

  get: async (id: number): Promise<PromotionDetail> => {
    const { data } = await api.get<PromotionDetail>(`/promotions/${id}`);
    return data;
  },

  stats: async (): Promise<PromotionStats> => {
    const { data } = await api.get<PromotionStats>("/promotions/stats");
    return data;
  },

  create: async (payload: PromotionRequest): Promise<PromotionDetail> => {
    const { data } = await api.post<PromotionDetail>("/promotions", payload);
    return data;
  },

  update: async (id: number, payload: PromotionRequest): Promise<PromotionDetail> => {
    const { data } = await api.put<PromotionDetail>(`/promotions/${id}`, payload);
    return data;
  },

  setActive: async (id: number, active: boolean): Promise<PromotionDetail> => {
    const { data } = await api.patch<PromotionDetail>(`/promotions/${id}/status`, { active });
    return data;
  },

  duplicate: async (id: number): Promise<PromotionDetail> => {
    const { data } = await api.post<PromotionDetail>(`/promotions/${id}/duplicate`, {});
    return data;
  },

  remove: async (id: number): Promise<void> => {
    await api.delete(`/promotions/${id}`);
  },

  bulkSetActive: async (ids: number[], active: boolean): Promise<void> => {
    await api.post("/promotions/bulk/status", { ids, active });
  },

  bulkDelete: async (ids: number[]): Promise<void> => {
    await api.post("/promotions/bulk/delete", { ids });
  },
};

/** Public coupon preview against the current cart (server reprices + validates). */
export async function validateCoupon(
  code: string,
  items: { productId: number; quantity: number }[],
  email?: string
): Promise<CouponValidation> {
  const { data } = await api.post<CouponValidation>("/coupons/validate", {
    code,
    email,
    items,
  });
  return data;
}
