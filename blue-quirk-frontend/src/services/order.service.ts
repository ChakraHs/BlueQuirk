// Places cash-on-delivery orders against the shop backend (:9090). Goes through
// the shared `api` client, which attaches the Keycloak bearer token WHEN present.
// Checkout is open to guests, so an order can be placed with no token at all; a
// token, when present, links the order to that login account.
import api from "./api";
import type { CartItem } from "@/lib/cart";

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
  subtotal: number;
  shippingFee: number;
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
};
