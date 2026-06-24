// Admin-side order shapes. Mirrors the backend OrderResponse (see
// blue-quirk-backend .../dto/OrderResponse.java) and OrderStatus enum.

export const ORDER_STATUSES = [
  "PENDING",
  "CONFIRMED",
  "PROCESSING",
  "PACKED",
  "SHIPPED",
  "DELIVERED",
  "CANCELLED",
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const PAYMENT_STATUSES = ["UNPAID", "PAID", "REFUNDED"] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

// French labels shared by the storefront (confirmation, tracking) and admin.
export const ORDER_STATUS_LABELS: Record<string, string> = {
  PENDING: "En attente",
  CONFIRMED: "Confirmée",
  PROCESSING: "En préparation",
  PACKED: "Emballée",
  SHIPPED: "Expédiée",
  DELIVERED: "Livrée",
  CANCELLED: "Annulée",
};

export const PAYMENT_STATUS_LABELS: Record<string, string> = {
  UNPAID: "Non payé",
  PAID: "Payé",
  REFUNDED: "Remboursé",
};

// Preset reasons shown when an admin cancels an order. "Autre" lets the admin
// type a free-text reason. The chosen reason is emailed to the customer.
export const CANCELLATION_REASONS = [
  "Rupture de stock",
  "Demande du client",
  "Client injoignable",
  "Adresse invalide",
  "Commande en double",
  "Autre",
] as const;

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
  orderNumber?: string;
  status: OrderStatus;
  paymentStatus?: PaymentStatus;
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
  items: OrderItem[];
}
