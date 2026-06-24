"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ShoppingBag,
  Package,
  Tags,
  Users,
  Store,
  Shirt,
  Truck,
  Webhook,
  ScrollText,
  type LucideIcon,
} from "lucide-react";

type Item = { name: string; href: string; icon: LucideIcon };
type Group = { heading: string; items: Item[] };

const groups: Group[] = [
  {
    heading: "Aperçu",
    items: [{ name: "Tableau de bord", href: "/admin-v2", icon: LayoutDashboard }],
  },
  {
    heading: "Ventes",
    items: [{ name: "Commandes", href: "/admin-v2/orders", icon: ShoppingBag }],
  },
  {
    heading: "Catalogue",
    items: [
      { name: "Produits", href: "/admin-v2/products", icon: Package },
      { name: "Catégories", href: "/admin-v2/categories", icon: Tags },
    ],
  },
  {
    heading: "Clients",
    items: [{ name: "Clients", href: "/admin-v2/users", icon: Users }],
  },
  {
    heading: "Todify",
    items: [
      { name: "Templates", href: "/admin-v2/todify/templates", icon: Shirt },
      { name: "Commandes Todify", href: "/admin-v2/todify/orders", icon: Truck },
      { name: "Webhooks", href: "/admin-v2/todify/webhooks", icon: Webhook },
      { name: "Journaux", href: "/admin-v2/todify/logs", icon: ScrollText },
    ],
  },
];

export default function Sidebar() {
  const pathname = usePathname();

  const isActive = (href: string) =>
    href === "/admin-v2"
      ? pathname === "/admin-v2"
      : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <aside className="sticky top-0 flex h-screen w-64 shrink-0 flex-col border-r border-gray-800 bg-gray-900 text-gray-200">
      {/* Logo */}
      <div className="px-6 py-5">
        <h1 className="text-lg font-bold tracking-tight text-white">
          Blue<span className="text-blue-400">Quirk</span>
        </h1>
        <p className="text-xs text-gray-500">Espace administrateur</p>
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
          Voir la boutique
        </Link>
        <p className="px-3 pt-3 text-xs text-gray-600">
          © {new Date().getFullYear()} BlueQuirk
        </p>
      </div>
    </aside>
  );
}
