"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FaBox, FaChartBar, FaUsers } from "react-icons/fa";

const menu = [
  {
    name: "Dashboard",
    href: "/admin-v2",
    icon: FaChartBar,
  },
  {
    name: "Products",
    href: "/admin-v2/products",
    icon: FaBox,
  },
  {
    name: "Users",
    href: "/admin-v2/users",
    icon: FaUsers,
  },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 h-screen bg-gray-900 text-gray-200 flex flex-col">
      
      {/* Logo */}
      <div className="px-6 py-5 border-b border-gray-800">
        <h1 className="text-lg font-semibold text-white tracking-wide">
          BlueQuirk Admin
        </h1>
        <p className="text-xs text-gray-400">v2 Dashboard</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {menu.map((item) => {
          const isActive = pathname === item.href;

          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-2.5 rounded-md text-sm font-medium transition
                ${
                  isActive
                    ? "bg-gray-800 text-white"
                    : "text-gray-400 hover:bg-gray-800 hover:text-white"
                }
              `}
            >
              <item.icon className="text-base" />
              {item.name}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-4 py-4 border-t border-gray-800 text-xs text-gray-500">
        © {new Date().getFullYear()} BlueQuirk
      </div>
    </aside>
  );
}