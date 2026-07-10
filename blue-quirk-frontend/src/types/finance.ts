// Shapes returned by the admin-only finance & profit APIs (/api/admin/finance)
// and the per-order financials endpoint. All money is MAD (DH). These fields are
// confidential (cost/profit) and only ever fetched from admin endpoints.

export interface FinanceSummary {
  from: string;
  to: string;
  revenue: number;
  cost: number;
  grossProfit: number;
  marginPercent: number;
  netSales: number;
  operationalRevenue: number;
  discount: number;
  shipping: number;
  collected: number;
  orders: number;
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
  revenue: number;
  cost: number;
  profit: number;
  marginPercent: number;
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
  grossProfit: number;
  marginPercent: number;
  netSales: number;
  operationalRevenue: number;
  items: OrderFinancialsItem[];
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
