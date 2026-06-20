// src/bq-admin/components/AdminLayout.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ReactNode } from "react";

type Props = {
  children: ReactNode;
};

export default function AdminLayout({ children }: Props) {
  const pathname = usePathname();

  const navLinks = [
    { name: "Dashboard", href: "/bq-admin" },
    { name: "Products", href: "/bq-admin/products" },
    { name: "Orders", href: "/bq-admin/orders" },
    { name: "Users", href: "/bq-admin/users" },
    { name: "Attributes", href: "/bq-admin/attributes" },
    { name: "Uploads", href: "/bq-admin/uploads" },
  ];

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <aside className="w-64 bg-gray-900 text-white flex flex-col">
        <div className="p-6 text-2xl font-bold border-b border-gray-800">BlueQuirk Admin</div>
        <nav className="flex-1 p-4 space-y-2">
          {navLinks.map((link) => {
            const active = pathname === link.href || pathname.startsWith(link.href + "/");
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`block px-4 py-2 rounded hover:bg-gray-700 ${
                  active ? "bg-blue-600" : ""
                }`}
              >
                {link.name}
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Top Navbar */}
        <header className="bg-white shadow-md flex justify-end items-center p-4 gap-4 border-b">
          <button className="px-3 py-1 rounded bg-gray-200 hover:bg-gray-300">Refresh</button>
          <button className="px-3 py-1 rounded bg-gray-200 hover:bg-gray-300">Profile</button>
          <button className="px-3 py-1 rounded bg-red-500 text-white hover:bg-red-600">
            Logout
          </button>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-6 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
