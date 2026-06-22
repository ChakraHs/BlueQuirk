// Admin-side order shapes. Mirrors the backend OrderResponse (see
// blue-quirk-backend .../dto/OrderResponse.java) and OrderStatus enum.

export const ORDER_STATUSES = [
  "PENDING",
  "CONFIRMED",
  "SHIPPED",
  "DELIVERED",
  "CANCELLED",
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

export interface OrderItem {
  productId: number;
  name: string;
  image: string;
  variant: string;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
}

export interface Order {
  id: number;
  status: OrderStatus;
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
  items: OrderItem[];
}
