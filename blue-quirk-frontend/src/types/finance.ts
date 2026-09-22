// Shapes returned by the admin-only finance & profit APIs (/api/admin/finance)
// and the per-order financials endpoint. All money is MAD (DH). These fields are
// confidential (cost/profit) and only ever fetched from admin endpoints.

export interface FinanceSummary {
  from: string;
  to: string;
  revenue: number;
  cost: number;
  grossProfit: number;
  netProfit: number; // collected − cost − realShippingCost (bottom line)
  marginPercent: number;
  netSales: number;
  operationalRevenue: number;
  discount: number;
  shipping: number; // customer shipping price charged
  realShippingCost: number; // internal logistics cost (never shown to customers)
  packagingCost: number; // per-order packaging + confirmation cost (internal)
  expenses: number; // business expenses in the window (ads/hosting/UGC/…)
  realProfit: number; // netProfit − expenses (true bottom line)
  collected: number;
  orders: number; // DELIVERED orders (realized revenue) — drives AOV
  totalOrders: number; // orders placed in the window, excluding cancelled
  productsSold: number;
  averageOrderValue: number;
}

export interface FinanceOverview {
  today: FinanceSummary;
  month: FinanceSummary;
  year: FinanceSummary;
}

export interface FinanceTimePoint {
  period: string; // "YYYY-MM-DD" or "YYYY-MM"
  orders: number;
  revenue: number; // goods subtotal (pre-shipping)
  collected: number; // order total incl. customer shipping — the amount collected
  cost: number;
  profit: number; // net profit (before business expenses)
  marginPercent: number;
  expenses: number; // business expenses in the bucket
  realProfit: number; // profit − expenses (the real bottom line)
}

export interface Expense {
  id: number;
  amount: number;
  category: string;
  note: string | null;
  expenseDate: string; // YYYY-MM-DD
  createdByEmail: string | null;
}

export interface ProductFinancialRow {
  productId: number | null;
  name: string;
  unitsSold: number;
  revenue: number;
  cost: number;
  profit: number;
  marginPercent: number;
}

export interface OrderFinancials {
  orderId: number;
  orderNumber: string;
  sellingTotal: number;
  costTotal: number;
  discount: number;
  shipping: number;
  finalTotal: number;
  realShippingCost: number; // internal logistics cost (never shown to customer)
  packagingCost: number; // per-order packaging + confirmation cost (internal)
  grossProfit: number; // sellingTotal − costTotal (goods only)
  netProfit: number; // finalTotal − costTotal − realShippingCost − packagingCost (= net contribution)
  marginPercent: number;
  netSales: number;
  operationalRevenue: number;
  totalCosts: number; // costTotal + realShippingCost + packagingCost
  realized: boolean; // true when the order is DELIVERED (contribution is realized)
  cancelled: boolean; // true when CANCELLED (never counts as realized profit)
  items: OrderFinancialsItem[];
}

/**
 * Compact per-order profitability row for the admin order LIST (net-contribution
 * column). Admin-only — confidential cost figures, fetched separately from the
 * order list so public order DTOs never carry costs.
 */
export interface OrderContribution {
  orderId: number;
  status: string;
  productRevenue: number;
  shippingCharged: number;
  discount: number;
  productCost: number;
  deliveryCost: number;
  packagingCost: number;
  netContribution: number; // total − productCost − deliveryCost − packagingCost
  realized: boolean; // DELIVERED — cash collected
  cancelled: boolean; // CANCELLED — never realized profit
}

export interface OrderFinancialsItem {
  productId: number | null;
  name: string;
  sku: string | null;
  sellingPrice: number;
  costPrice: number;
  quantity: number;
  lineTotal: number;
  lineCost: number;
  lineProfit: number;
}
