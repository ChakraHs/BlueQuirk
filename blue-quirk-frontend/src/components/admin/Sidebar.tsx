"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  X,
  LayoutDashboard,
  ShoppingBag,
  Package,
  Tags,
  SlidersHorizontal,
  Users,
  Store,
  Shirt,
  Truck,
  Webhook,
  ScrollText,
  Settings,
  BarChart3,
  Mail,
  BadgePercent,
  KeyRound,
  type LucideIcon,
} from "lucide-react";

type Item = { name: string; href: string; icon: LucideIcon };
type Group = { heading: string; items: Item[] };

const groups: Group[] = [
  {
    heading: "Overview",
    items: [
      { name: "Dashboard", href: "/admin-v2", icon: LayoutDashboard },
      { name: "Analytics", href: "/admin-v2/analytics", icon: BarChart3 },
    ],
  },
  {
    heading: "Sales",
    items: [{ name: "Orders", href: "/admin-v2/orders", icon: ShoppingBag }],
  },
  {
    heading: "Catalog",
    items: [
      { name: "Products", href: "/admin-v2/products", icon: Package },
      { name: "Categories", href: "/admin-v2/categories", icon: Tags },
      { name: "Attributes", href: "/admin-v2/attributes", icon: SlidersHorizontal },
    ],
  },
  {
    heading: "Customers",
    items: [{ name: "Customers", href: "/admin-v2/users", icon: Users }],
  },
  {
    heading: "Marketing",
    items: [{ name: "Promotions", href: "/admin-v2/promotions", icon: BadgePercent }],
  },
  {
    heading: "Todify",
    items: [
      { name: "Templates", href: "/admin-v2/todify/templates", icon: Shirt },
      { name: "Todify Orders", href: "/admin-v2/todify/orders", icon: Truck },
      { name: "Webhooks", href: "/admin-v2/todify/webhooks", icon: Webhook },
      { name: "Logs", href: "/admin-v2/todify/logs", icon: ScrollText },
      { name: "Settings", href: "/admin-v2/todify/settings", icon: Settings },
    ],
  },
  {
    heading: "Configuration",
    items: [
      { name: "Email templates", href: "/admin-v2/emails", icon: Mail },
      { name: "Integrations & keys", href: "/admin-v2/integrations", icon: KeyRound },
      { name: "Settings", href: "/admin-v2/settings", icon: Settings },
    ],
  },
];

export default function Sidebar({
  open = false,
  onClose,
}: {
  open?: boolean;
  onClose?: () => void;
}) {
  const pathname = usePathname();

  const isActive = (href: string) =>
    href === "/admin-v2"
      ? pathname === "/admin-v2"
      : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <>
      {/* Backdrop (mobile only) — tap to close the drawer. */}
      <div
        onClick={onClose}
        className={`fixed inset-0 z-40 bg-black/50 transition-opacity md:hidden ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        aria-hidden
      />

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex h-screen w-64 shrink-0 flex-col border-r border-gray-800 bg-gray-900 text-gray-200 transition-transform duration-200 md:sticky md:top-0 md:z-auto md:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Logo */}
        <div className="flex items-center justify-between px-6 py-5">
          <div>
            <h1 className="text-lg font-bold tracking-tight text-white">
              Blue<span className="text-blue-400">Quirk</span>
            </h1>
            <p className="text-xs text-gray-500">Admin panel</p>
          </div>
          {/* Close button (mobile only) */}
          <button
            onClick={onClose}
            aria-label="Close menu"
            className="flex h-9 w-9 items-center justify-center rounded-md text-gray-400 hover:bg-gray-800 hover:text-white md:hidden"
          >
            <X size={20} />
          </button>
        </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-6 overflow-y-auto px-3 pb-4">
        {groups.map((group) => (
          <div key={group.heading}>
            <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-gray-600">
              {group.heading}
            </p>
            <div className="space-y-1">
              {group.items.map((item) => {
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={onClose}
                    className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition ${
                      active
                        ? "bg-blue-600 text-white"
                        : "text-gray-400 hover:bg-gray-800 hover:text-white"
                    }`}
                  >
                    <item.icon size={18} />
                    {item.name}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="border-t border-gray-800 p-3">
        <Link
          href="/"
          className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-gray-400 transition hover:bg-gray-800 hover:text-white"
        >
          <Store size={18} />
          View store
        </Link>
        <p className="px-3 pt-3 text-xs text-gray-600">
          © {new Date().getFullYear()} BlueQuirk
        </p>
      </div>
      </aside>
    </>
  );
}
