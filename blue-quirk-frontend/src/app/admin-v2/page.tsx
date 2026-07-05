"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  DollarSign,
  ShoppingBag,
  Package,
  Users,
  TrendingUp,
  AlertTriangle,
} from "lucide-react";
import StatCard from "@/components/admin/ui/StatCard";
import StatusBadge from "@/components/admin/ui/StatusBadge";
import MiniLineChart, {
  type ChartPoint,
} from "@/components/admin/ui/MiniLineChart";
import MiniBarChart, {
  type BarDatum,
} from "@/components/admin/ui/MiniBarChart";
import { TableSkeleton } from "@/components/admin/ui/Skeleton";
import { OrderService, type OrderResponse } from "@/services/order.service";
import { ProductService } from "@/services/product.service";
import { CustomerService } from "@/services/customer.service";
import { Product } from "@/types/product";
import { ORDER_STATUSES, ORDER_STATUS_LABELS } from "@/types/order";
import { formatPrice } from "@/lib/money";

const LOW_STOCK_THRESHOLD = 5;

const STATUS_BAR_COLORS: Record<string, string> = {
  PENDING: "bg-amber-400",
  CONFIRMED: "bg-blue-500",
  PROCESSING: "bg-sky-500",
  PACKED: "bg-indigo-500",
  SHIPPED: "bg-violet-500",
  DELIVERED: "bg-emerald-500",
  CANCELLED: "bg-rose-400",
};

const STATUS_LABELS = ORDER_STATUS_LABELS;

export default function AdminDashboard() {
  const [orders, setOrders] = useState<OrderResponse[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [productTotal, setProductTotal] = useState(0);
  const [customerCount, setCustomerCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [ordersRes, productsRes, customersRes] = await Promise.allSettled([
        OrderService.getAll(),
        ProductService.getAll(0, 1000),
        CustomerService.getAll(),
      ]);
      if (cancelled) return;

      if (ordersRes.status === "fulfilled") setOrders(ordersRes.value);
      if (productsRes.status === "fulfilled") {
        setProducts(productsRes.value.content as unknown as Product[]);
        setProductTotal(productsRes.value.totalElements);
      }
      if (customersRes.status === "fulfilled") setCustomerCount(customersRes.value.length);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const stats = useMemo(() => {
    const paid = orders.filter((o) => o.status !== "CANCELLED");
    const revenue = paid.reduce((sum, o) => sum + (o.total || 0), 0);
    const avg = paid.length ? revenue / paid.length : 0;

    // Revenue per day for the last 14 days.
    const days = 14;
    const buckets = new Map<string, number>();
    const today = new Date();
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      buckets.set(d.toISOString().slice(0, 10), 0);
    }
    for (const o of paid) {
      const key = (o.orderDate || "").slice(0, 10);
      if (buckets.has(key)) buckets.set(key, (buckets.get(key) || 0) + o.total);
    }
    const revenueSeries: ChartPoint[] = Array.from(buckets.entries()).map(
      ([label, value]) => ({ label, value })
    );

    // Orders by status.
    const statusBars: BarDatum[] = ORDER_STATUSES.map((s) => ({
      label: STATUS_LABELS[s],
      value: orders.filter((o) => o.status === s).length,
      colorClass: STATUS_BAR_COLORS[s],
    }));

    // Top products by quantity sold.
    const sold = new Map<string, { name: string; qty: number; total: number }>();
    for (const o of paid) {
      for (const it of o.items) {
        const key = String(it.productId ?? it.name);
        const cur = sold.get(key) || { name: it.name, qty: 0, total: 0 };
        cur.qty += it.quantity;
        cur.total += it.lineTotal;
        sold.set(key, cur);
      }
    }
    const topProducts = Array.from(sold.values())
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 5);

    const recent = [...orders]
      .sort((a, b) => (b.orderDate || "").localeCompare(a.orderDate || ""))
      .slice(0, 6);

    const lowStock = products
      .filter(
        (p) =>
          typeof p.stockQuantity === "number" &&
          p.stockQuantity <= LOW_STOCK_THRESHOLD
      )
      .sort((a, b) => (a.stockQuantity || 0) - (b.stockQuantity || 0))
      .slice(0, 6);

    return {
      revenue,
      avg,
      revenueSeries,
      statusBars,
      topProducts,
      recent,
      lowStock,
    };
  }, [orders, products]);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">
          Dashboard
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Overview of your BlueQuirk store.
        </p>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Revenue"
          value={formatPrice(stats.revenue)}
          icon={DollarSign}
          accent="green"
          hint="Non-cancelled orders"
        />
        <StatCard
          label="Orders"
          value={orders.length}
          icon={ShoppingBag}
          accent="blue"
          hint={`Average order ${formatPrice(stats.avg)}`}
        />
        <StatCard
          label="Products"
          value={productTotal}
          icon={Package}
          accent="violet"
          hint={`${stats.lowStock.length} low in stock`}
        />
        <StatCard
          label="Customers"
          value={customerCount}
          icon={Users}
          accent="amber"
        />
      </div>

      {/* Charts */}
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm lg:col-span-2">
          <div className="mb-4 flex items-center gap-2">
            <TrendingUp size={18} className="text-blue-600" />
            <h2 className="text-sm font-semibold text-gray-700">
              Revenue (last 14 days)
            </h2>
          </div>
          {loading ? (
            <div className="h-[180px] animate-pulse rounded bg-gray-100" />
          ) : (
            <MiniLineChart data={stats.revenueSeries} />
          )}
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold text-gray-700">
            Orders by status
          </h2>
          {loading ? (
            <div className="h-[180px] animate-pulse rounded bg-gray-100" />
          ) : (
            <MiniBarChart data={stats.statusBars} />
          )}
        </div>
      </div>

      {/* Recent orders + top products */}
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm lg:col-span-2">
          <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
            <h2 className="text-sm font-semibold text-gray-700">
              Recent orders
            </h2>
            <Link
              href="/admin-v2/orders"
              className="text-sm font-medium text-blue-600 hover:text-blue-800"
            >
              View all
            </Link>
          </div>
          {loading ? (
            <div className="p-4">
              <TableSkeleton rows={4} />
            </div>
          ) : stats.recent.length === 0 ? (
            <p className="p-8 text-center text-sm text-gray-400">
              No orders yet.
            </p>
          ) : (
            <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-sm">
              <tbody className="divide-y divide-gray-100">
                {stats.recent.map((o) => (
                  <tr key={o.id} className="hover:bg-gray-50">
                    <td className="px-5 py-3">
                      <Link
                        href={`/admin-v2/orders/${o.id}`}
                        className="font-medium text-gray-800 hover:text-blue-600"
                      >
                        #{o.id}
                      </Link>
                    </td>
                    <td className="px-5 py-3 text-gray-600">{o.customerName}</td>
                    <td className="px-5 py-3">
                      <StatusBadge status={o.status} />
                    </td>
                    <td className="px-5 py-3 text-right font-medium text-gray-800">
                      {formatPrice(o.total)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          )}
        </div>

        <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-100 px-5 py-4">
            <h2 className="text-sm font-semibold text-gray-700">
              Best sellers
            </h2>
          </div>
          {loading ? (
            <div className="space-y-3 p-5">
              <div className="h-4 animate-pulse rounded bg-gray-100" />
              <div className="h-4 animate-pulse rounded bg-gray-100" />
              <div className="h-4 animate-pulse rounded bg-gray-100" />
            </div>
          ) : stats.topProducts.length === 0 ? (
            <p className="p-8 text-center text-sm text-gray-400">
              No sales yet.
            </p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {stats.topProducts.map((p, i) => (
                <li
                  key={p.name + i}
                  className="flex items-center gap-3 px-5 py-3"
                >
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gray-100 text-xs font-semibold text-gray-600">
                    {i + 1}
                  </span>
                  <span className="flex-1 truncate text-sm text-gray-700">
                    {p.name}
                  </span>
                  <span className="text-xs font-semibold text-gray-500">
                    {p.qty} sold
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Low stock */}
      {!loading && stats.lowStock.length > 0 && (
        <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50/50 p-5">
          <div className="mb-3 flex items-center gap-2">
            <AlertTriangle size={18} className="text-amber-600" />
            <h2 className="text-sm font-semibold text-amber-800">
              Low stock
            </h2>
          </div>
          <div className="flex flex-wrap gap-2">
            {stats.lowStock.map((p) => (
              <Link
                key={p.id}
                href={`/admin-v2/products/${p.id}`}
                className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-white px-3 py-1 text-sm text-gray-700 hover:border-amber-300"
              >
                {p.name}
                <span className="font-semibold text-amber-700">
                  {p.stockQuantity}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
