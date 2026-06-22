// Places cash-on-delivery orders against the shop backend (:9090). Goes through
// the shared `api` client, which attaches the Keycloak bearer token — the
// backend requires an authenticated user to create an order.
import api from "./api";
import type { CartItem } from "@/lib/cart";

export type OrderItemPayload = {
  productId: number;
  quantity: number;
  name: string;
  image: string;
  variant: string;
};

export type CreateOrderPayload = {
  customerName: string;
  phone: string;
  city: string;
  address: string;
  note?: string;
  items: OrderItemPayload[];
};

export type OrderResponseItem = {
  productId: number;
  name: string;
  image: string;
  variant: string;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
};

export type OrderResponse = {
  id: number;
  status: string;
  paymentMethod: string;
  customerName: string;
  phone: string;
  city: string;
  address: string;
  note?: string;
  email?: string;
  subtotal: number;
  shippingFee: number;
  total: number;
  orderDate: string;
  items: OrderResponseItem[];
};

/** Convert cart lines into the order payload, flattening variant attributes. */
export function cartToOrderItems(items: CartItem[]): OrderItemPayload[] {
  return items.map((i) => ({
    productId: i.id,
    quantity: i.quantity,
    name: i.name,
    image: i.image,
    variant: Object.entries(i.attributes)
      .filter(([, v]) => v)
      .map(([k, v]) => `${k}: ${v}`)
      .join(" · "),
  }));
}

export const OrderService = {
  create: async (payload: CreateOrderPayload): Promise<OrderResponse> => {
    const { data } = await api.post<OrderResponse>("/orders", payload);
    return data;
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

  updateStatus: async (id: number, status: string): Promise<OrderResponse> => {
    const { data } = await api.patch<OrderResponse>(`/orders/${id}/status`, {
      status,
    });
    return data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/orders/${id}`);
  },
};
