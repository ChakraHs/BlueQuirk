// Admin expenses ledger API (/api/admin/expenses). Admin-only; uses the shared
// authenticated axios client.
import api from "@/services/api";
import type { Expense } from "@/types/finance";

export type ExpenseInput = {
  amount?: number;
  category?: string;
  note?: string | null;
  expenseDate?: string; // YYYY-MM-DD
};

export const ExpenseService = {
  async list(from?: string, to?: string): Promise<Expense[]> {
    const params: Record<string, string> = {};
    if (from) params.from = from;
    if (to) params.to = to;
    const { data } = await api.get<Expense[]>("/admin/expenses", { params });
    return data;
  },

  async create(input: ExpenseInput): Promise<Expense> {
    const { data } = await api.post<Expense>("/admin/expenses", input);
    return data;
  },

  async update(id: number, input: ExpenseInput): Promise<Expense> {
    const { data } = await api.put<Expense>(`/admin/expenses/${id}`, input);
    return data;
  },

  async remove(id: number): Promise<void> {
    await api.delete(`/admin/expenses/${id}`);
  },
};
