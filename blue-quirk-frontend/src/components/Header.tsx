"use client";

import { Heart, ShoppingCart, Menu, User as UserIcon, LogOut, X } from "lucide-react";
import { useEffect, useState } from "react";
import Link from "next/link";
import SearchBar from "./SearchBar";
import LanguageSwitcher from "./LanguageSwitcher";
import { Category } from "@/types/category";
import { useCart, cartCount } from "@/lib/cart";
import { useWishlist } from "@/lib/wishlist";
import { accountHref, logout } from "@/lib/auth";
import { t } from "@/lib/i18n";

export default function Header({
  lang,
  categories = [],
  storeName = "BlueQuirk",
  logoUrl = null,
}: {
  lang: string;
  categories?: Category[];
  storeName?: string;
  logoUrl?: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);
  // Where "Account" points depends on the role in the JWT: admins go to the
  // dashboard, customers go to their profile page.
  const [accountUrl, setAccountUrl] = useState("/login");
  const cart = useCart();
  const wishlist = useWishlist();
  const cartQty = cartCount(cart);

  // Reflect auth state. login/signup store the Identity token under `access_token`.
  useEffect(() => {
    const sync = () => {
      setLoggedIn(!!localStorage.getItem("access_token"));
      setAccountUrl(accountHref());
    };
    sync();
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, []);

  const handleLogout = () => {
    setLoggedIn(false);
    logout(`/${lang}`);
  };

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-gray-200">
      {/* ---- Top row ---- */}
      <div className="mx-auto max-w-7xl px-4 md:px-6">
        <div className="flex h-16 items-center gap-2 md:gap-4">
          {/* Logo — uploaded image when set, otherwise the store name as text.
              min-w-0 + truncate let the logo yield/shrink first on tiny screens
              so the action icons (and the menu button) are never pushed off the
              edge and clipped. */}
          <Link
            href={`/${lang}`}
            aria-label={storeName}
            className="flex min-w-0 items-center"
          >
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={logoUrl}
                alt={storeName}
                className="h-8 w-auto max-w-[130px] object-contain md:h-9 md:max-w-[180px]"
              />
            ) : (
              <span className="truncate text-xl font-extrabold tracking-tight text-gray-900 md:text-2xl">
                {storeName}
              </span>
            )}
          </Link>

          {/* Search (desktop) */}
          <div className="hidden md:block flex-1 max-w-2xl">
            <SearchBar lang={lang} />
          </div>

          {/* Actions — shrink-0 so the icons and the mobile menu button always
              stay fully visible (the logo above absorbs any tight space). */}
          <nav className="ml-auto flex shrink-0 items-center gap-1 sm:gap-2">
            {loggedIn ? (
              <>
                <Link
                  href={accountUrl}
                  className="hidden md:flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
                >
                  <UserIcon size={18} />
                  {t(lang, "nav.account")}
                </Link>
                <button
                  onClick={handleLogout}
                  className="hidden md:flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
                >
                  <LogOut size={18} />
                  {t(lang, "nav.logout")}
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="hidden md:flex items-center rounded-full px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100"
                >
                  {t(lang, "nav.login")}
                </Link>
                <Link
                  href="/signup"
                  className="hidden md:flex items-center rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
                >
                  {t(lang, "nav.signup")}
                </Link>
              </>
            )}

            <LanguageSwitcher current={lang} />

            <Link
              href={`/${lang}/wishlist`}
              aria-label={t(lang, "nav.wishlist")}
              className="relative flex h-10 w-10 items-center justify-center rounded-full text-gray-700 hover:bg-gray-100"
            >
              <Heart size={20} />
              {wishlist.length > 0 && (
                <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-blue-600 px-1 text-[10px] font-bold text-white">
                  {wishlist.length}
                </span>
              )}
            </Link>
            <Link
              href={`/${lang}/cart`}
              aria-label={t(lang, "nav.cart")}
              className="relative flex h-10 w-10 items-center justify-center rounded-full text-gray-700 hover:bg-gray-100"
            >
              <ShoppingCart size={20} />
              {cartQty > 0 && (
                <span className="absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-blue-600 px-1 text-[10px] font-bold text-white">
                  {cartQty}
                </span>
              )}
            </Link>

            {/* Mobile menu toggle */}
            <button
              aria-label={t(lang, "nav.menu")}
              onClick={() => setOpen((o) => !o)}
              className="flex h-10 w-10 items-center justify-center rounded-full text-gray-700 hover:bg-gray-100 md:hidden"
            >
              {open ? <X size={22} /> : <Menu size={22} />}
            </button>
          </nav>
        </div>

        {/* Search (mobile) */}
        <div className="pb-3 md:hidden">
          <SearchBar lang={lang} />
        </div>
      </div>

      {/* ---- Category nav strip ---- */}
      {categories.length > 0 && (
        <div className="hidden md:block border-t border-gray-100 bg-white">
          <div className="mx-auto max-w-7xl px-6">
            <ul className="flex items-center gap-1 overflow-x-auto">
              {categories.map((cat) => (
                <li key={cat.id}>
                  <Link
                    href={`/${lang}/category/${cat.id}`}
                    className="block whitespace-nowrap px-3 py-3 text-sm font-medium text-gray-600 transition hover:text-blue-600"
                  >
                    {cat.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* ---- Mobile drawer ---- */}
      {open && (
        <div className="border-t border-gray-200 bg-white md:hidden">
          <div className="space-y-1 px-4 py-3">
            {loggedIn ? (
              <>
                <Link href={accountUrl} className="block rounded-lg px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100">
                  {t(lang, "nav.account")}
                </Link>
                <button
                  onClick={handleLogout}
                  className="block w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-red-600 hover:bg-gray-100"
                >
                  {t(lang, "nav.logout")}
                </button>
              </>
            ) : (
              <div className="flex gap-2 pb-2">
                <Link href="/login" className="flex-1 rounded-full border border-gray-300 px-4 py-2 text-center text-sm font-semibold text-gray-700">
                  {t(lang, "nav.login")}
                </Link>
                <Link href="/signup" className="flex-1 rounded-full bg-blue-600 px-4 py-2 text-center text-sm font-semibold text-white">
                  {t(lang, "nav.signup")}
                </Link>
              </div>
            )}

            <div className="border-t border-gray-100 pt-2">
              <LanguageSwitcher current={lang} />
            </div>

            {categories.length > 0 && (
              <div className="border-t border-gray-100 pt-2">
                {categories.map((cat) => (
                  <Link
                    key={cat.id}
                    href={`/${lang}/category/${cat.id}`}
                    onClick={() => setOpen(false)}
                    className="block rounded-lg px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100"
                  >
                    {cat.name}
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
