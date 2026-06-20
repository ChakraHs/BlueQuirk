"use client";

import Link from "next/link";

export default function AdminDashboardPage() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Admin Dashboard</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Products */}
        <Link
          href="/bq-admin/products"
          className="block border rounded-xl p-6 shadow hover:shadow-md transition"
        >
          <h2 className="text-lg font-semibold mb-2">Products</h2>
          <p className="text-gray-600">Manage all products in the store</p>
        </Link>

        {/* Orders */}
        <Link
          href="/bq-admin/orders"
          className="block border rounded-xl p-6 shadow hover:shadow-md transition"
        >
          <h2 className="text-lg font-semibold mb-2">Orders</h2>
          <p className="text-gray-600">View and process customer orders</p>
        </Link>

        {/* Users */}
        <Link
          href="/bq-admin/users"
          className="block border rounded-xl p-6 shadow hover:shadow-md transition"
        >
          <h2 className="text-lg font-semibold mb-2">Users</h2>
          <p className="text-gray-600">Manage users and permissions</p>
        </Link>

        {/* Images */}
        <Link
          href="/bq-admin/images"
          className="block border rounded-xl p-6 shadow hover:shadow-md transition"
        >
          <h2 className="text-lg font-semibold mb-2">Images</h2>
          <p className="text-gray-600">Manage product and catalog images</p>
        </Link>

        {/* Attributes */}
        <Link
          href="/bq-admin/attributes"
          className="block border rounded-xl p-6 shadow hover:shadow-md transition"
        >
          <h2 className="text-lg font-semibold mb-2">Attributes</h2>
          <p className="text-gray-600">Set product attributes & variations</p>
        </Link>
      </div>
    </div>
  );
}
