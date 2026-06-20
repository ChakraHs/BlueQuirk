// src/bq-admin/components/AdminNavbar.tsx
import Link from "next/link";

export default function AdminNavbar() {
  return (
    <nav className="bg-gray-800 text-white p-4 flex justify-between items-center">
      <Link href="/bq-admin">
        <span className="text-2xl font-bold text-yellow-400">BlueQuirk Admin</span>
      </Link>
      <div className="flex space-x-6">
        <Link href="/bq-admin/products" className="hover:text-yellow-300">Products</Link>
        <Link href="/bq-admin/orders" className="hover:text-yellow-300">Orders</Link>
        <Link href="/bq-admin/users" className="hover:text-yellow-300">Users</Link>
        <Link href="/bq-admin/logout" className="hover:text-yellow-300">Logout</Link>
      </div>
    </nav>
  );
}