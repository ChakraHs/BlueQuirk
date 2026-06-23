// Admin customer directory from the shop backend (:9090). Customers are
// email-keyed and exist independently of login accounts — guests included — so
// this, not the Keycloak user list, is the source of truth for the dashboard.
import api from "./api";
import type { OrderResponse } from "./order.service";

export type Customer = {
  id: number;
  email: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  city?: string;
  guest: boolean;
  totalOrders: number;
  totalSpent: number;
  firstOrderDate?: string | null;
  lastOrderDate?: string | null;
  createdAt?: string | null;
};

export type CustomerDetail = {
  customer: Customer;
  address?: string | null;
  postalCode?: string | null;
  orders: OrderResponse[];
};

export function customerName(c: Pick<Customer, "firstName" | "lastName" | "email">): string {
  const name = `${c.firstName ?? ""} ${c.lastName ?? ""}`.trim();
  return name || c.email;
}

export const CustomerService = {
  getAll: async (): Promise<Customer[]> => {
    const { data } = await api.get<Customer[]>("/customers");
    return data;
  },

  getById: async (id: number): Promise<CustomerDetail> => {
    const { data } = await api.get<CustomerDetail>(`/customers/${id}`);
    return data;
  },
};
