import Link from "next/link";
import { Facebook, Instagram, Twitter, Youtube } from "lucide-react";

const columns = [
  {
    title: "Shop",
    links: ["T-Shirts", "Hoodies", "Stickers", "Phone Cases", "New Arrivals"],
  },
  {
    title: "Help",
    links: ["Shipping", "Returns", "Order Status", "Size Guide", "Contact us"],
  },
  {
    title: "Company",
    links: ["About BlueQuirk", "Sell your art", "Careers", "Blog", "Press"],
  },
];

export default function Footer({ lang }: { lang: string }) {
  return (
    <footer className="border-t border-gray-200 bg-gray-50">
      <div className="mx-auto max-w-7xl px-6 py-14">
        <div className="grid gap-10 md:grid-cols-[1.5fr_repeat(3,1fr)]">
          {/* Brand */}
          <div>
            <Link
              href={`/${lang}`}
              className="text-2xl font-extrabold tracking-tight text-gray-900"
            >
              Blue<span className="text-blue-600">Quirk</span>
            </Link>
            <p className="mt-3 max-w-xs text-sm text-gray-500">
              Weirdly meaningful art on high-quality products, made by
              independent artists.
            </p>

            <div className="mt-5 flex items-center gap-3">
              {[Instagram, Facebook, Twitter, Youtube].map((Icon, i) => (
                <a
                  key={i}
                  href="#"
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-gray-600 ring-1 ring-gray-200 transition hover:text-blue-600 hover:ring-blue-300"
                  aria-label="Social link"
                >
                  <Icon size={18} />
                </a>
              ))}
            </div>
          </div>

          {/* Link columns */}
          {columns.map((col) => (
            <div key={col.title}>
              <h3 className="text-sm font-semibold text-gray-900">
                {col.title}
              </h3>
              <ul className="mt-4 space-y-2.5">
                {col.links.map((link) => (
                  <li key={link}>
                    <a
                      href="#"
                      className="text-sm text-gray-500 transition hover:text-blue-600"
                    >
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-gray-200 pt-6 text-sm text-gray-500 sm:flex-row">
          <p>© {new Date().getFullYear()} BlueQuirk. All rights reserved.</p>
          <div className="flex items-center gap-5">
            <a href="#" className="hover:text-gray-900">Privacy</a>
            <a href="#" className="hover:text-gray-900">Terms</a>
            <a href="#" className="hover:text-gray-900">Cookies</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
