// Places cash-on-delivery orders against the shop backend (:9090). Goes through
// the shared `api` client, which attaches the Keycloak bearer token WHEN present.
// Checkout is open to guests, so an order can be placed with no token at all; a
// token, when present, links the order to that login account.
import api from "./api";
import type { CartItem } from "@/lib/cart";
import type { OrderFinancials } from "@/types/finance";

export type OrderItemPayload = {
  productId: number;
  quantity: number;
  name: string;
  image: string;
  variant: string;
  // Structured variant selection (e.g. { Size: "M", Color: "Black" }) so the exact
  // variant can be forwarded to Todify. Optional / backward-compatible.
  variantAttributes?: Record<string, string>;
};

export type CreateOrderPayload = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  city: string;
  address: string;
  postalCode?: string;
  note?: string;
  // Optional coupon code. The backend re-validates it and recomputes the
  // discount + total from catalog prices — the client total is never trusted.
  couponCode?: string;
  // Storefront language at checkout ("fr" | "ar"). Determines the language of the
  // confirmation and status emails the customer receives. Normalized server-side.
  lang?: string;
  items: OrderItemPayload[];
};

export type OrderResponseItem = {
  productId: number;
  name: string;
  image: string;
  variant: string;
  variantAttributes?: string;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
};

export type OrderResponse = {
  id: number;
  orderNumber?: string;
  status: string;
  paymentStatus?: string;
  paymentMethod: string;
  cancellationReason?: string;
  cancelledAt?: string;
  cancelledBy?: string;
  trackingNumber?: string;
  estimatedDelivery?: string;
  customerId?: number;
  customerName: string;
  firstName?: string;
  lastName?: string;
  phone: string;
  city: string;
  address: string;
  postalCode?: string;
  note?: string;
  email?: string;
  lang?: string;
  subtotal: number;
  shippingFee: number;
  originalTotal: number;
  discountAmount: number;
  discountPercentage: number;
  appliedCouponCode?: string;
  promotionId?: number;
  total: number;
  orderDate: string;
  // --- Todify fulfillment (null for non-Todify orders) ---
  todifyOrderId?: string;
  todifyReferenceCode?: string;
  todifyStatus?: string;
  todifySyncState?: string;
  todifyLastSyncAt?: string;
  todifyErrorMessage?: string;
  todifySyncAttempts?: number;
  items: OrderResponseItem[];
};

export type FulfillmentPayload = {
  paymentStatus?: string;
  trackingNumber?: string;
  estimatedDelivery?: string; // YYYY-MM-DD
};

// Durable order-lifecycle audit entry (cancel / Todify cancel / delete).
export type OrderAuditLog = {
  id: number;
  orderId?: number;
  orderNumber?: string;
  action: string;
  performedBy?: string;
  reason?: string;
  httpStatus?: number;
  detail?: string;
  createdAt: string;
};

// Raw Todify sync log (request/response/error) for one order.
export type TodifySyncLog = {
  id: number;
  type: string;
  event?: string;
  direction?: string;
  orderId?: number;
  httpStatus?: number;
  requestBody?: string;
  responseBody?: string;
  errorMessage?: string;
  createdAt: string;
};

/** Convert cart lines into the order payload, flattening variant attributes. */
export function cartToOrderItems(items: CartItem[]): OrderItemPayload[] {
  return items.map((i) => {
    const variantAttributes = Object.fromEntries(
      Object.entries(i.attributes).filter(([, v]) => v)
    );
    return {
      productId: i.id,
      quantity: i.quantity,
      name: i.name,
      image: i.image,
      variant: Object.entries(variantAttributes)
        .map(([k, v]) => `${k}: ${v}`)
        .join(" · "),
      // Structured selection forwarded to Todify when present.
      variantAttributes:
        Object.keys(variantAttributes).length > 0 ? variantAttributes : undefined,
    };
  });
}

export const OrderService = {
  create: async (payload: CreateOrderPayload): Promise<OrderResponse> => {
    const { data } = await api.post<OrderResponse>("/orders", payload);
    return data;
  },

  /** Public order tracking by reference (BQ-YYYY-NNNNNN). Returns null if unknown. */
  track: async (orderNumber: string): Promise<OrderResponse | null> => {
    try {
      const { data } = await api.get<OrderResponse>(
        `/orders/track/${encodeURIComponent(orderNumber.trim())}`
      );
      return data;
    } catch (err: unknown) {
      if ((err as { response?: { status?: number } })?.response?.status === 404) {
        return null;
      }
      throw err;
    }
  },

  // --- Admin operations ---

  getAll: async (): Promise<OrderResponse[]> => {
    const { data } = await api.get<OrderResponse[]>("/orders");
    return data;
  },

  getById: async (id: number): Promise<OrderResponse> => {
    const { data } = await api.get<OrderResponse>(`/orders/${id}`);
    return data;
  },

  /** Admin-only cost/profit/margin breakdown for one order (confidential). */
  getFinancials: async (id: number): Promise<OrderFinancials> => {
    const { data } = await api.get<OrderFinancials>(`/orders/${id}/financials`);
    return data;
  },

  updateStatus: async (
    id: number,
    status: string,
    reason?: string
  ): Promise<OrderResponse> => {
    const { data } = await api.patch<OrderResponse>(`/orders/${id}/status`, {
      status,
      reason,
    });
    return data;
  },

  updateFulfillment: async (
    id: number,
    payload: FulfillmentPayload
  ): Promise<OrderResponse> => {
    const { data } = await api.patch<OrderResponse>(
      `/orders/${id}/fulfillment`,
      payload
    );
    return data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/orders/${id}`);
  },

  /** Retry the Todify cancellation for a cancelled order. Returns the updated order. */
  retryTodifyCancel: async (id: number): Promise<OrderResponse> => {
    const { data } = await api.post<OrderResponse>(
      `/admin/todify/orders/${id}/cancel`
    );
    return data;
  },

  /** Full lifecycle audit trail for one order (admin). */
  getAudit: async (id: number): Promise<OrderAuditLog[]> => {
    const { data } = await api.get<OrderAuditLog[]>(`/orders/${id}/audit`);
    return data;
  },

  /** Raw Todify synchronization logs for one order (admin). */
  getTodifyLogs: async (id: number): Promise<TodifySyncLog[]> => {
    const { data } = await api.get<TodifySyncLog[]>(`/orders/${id}/todify/logs`);
    return data;
  },
};
