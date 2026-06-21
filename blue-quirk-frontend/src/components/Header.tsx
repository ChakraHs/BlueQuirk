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

export default function Header({
  lang,
  categories = [],
}: {
  lang: string;
  categories?: Category[];
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
        <div className="flex h-16 items-center gap-4">
          {/* Logo */}
          <Link
            href={`/${lang}`}
            className="shrink-0 text-2xl font-extrabold tracking-tight text-gray-900"
          >
            Blue<span className="text-blue-600">Quirk</span>
          </Link>

          {/* Search (desktop) */}
          <div className="hidden md:block flex-1 max-w-2xl">
            <SearchBar lang={lang} />
          </div>

          {/* Actions */}
          <nav className="ml-auto flex items-center gap-1 sm:gap-2">
            {loggedIn ? (
              <>
                <Link
                  href={accountUrl}
                  className="hidden sm:flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
                >
                  <UserIcon size={18} />
                  Account
                </Link>
                <button
                  onClick={handleLogout}
                  className="hidden sm:flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
                >
                  <LogOut size={18} />
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="hidden sm:flex items-center rounded-full px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100"
                >
                  Login
                </Link>
                <Link
                  href="/signup"
                  className="hidden sm:flex items-center rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
                >
                  Sign Up
                </Link>
              </>
            )}

            <LanguageSwitcher current={lang} />

            <Link
              href={`/${lang}/wishlist`}
              aria-label="Wishlist"
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
              aria-label="Cart"
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
              aria-label="Menu"
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
                  Account
                </Link>
                <button
                  onClick={handleLogout}
                  className="block w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-red-600 hover:bg-gray-100"
                >
                  Logout
                </button>
              </>
            ) : (
              <div className="flex gap-2 pb-2">
                <Link href="/login" className="flex-1 rounded-full border border-gray-300 px-4 py-2 text-center text-sm font-semibold text-gray-700">
                  Login
                </Link>
                <Link href="/signup" className="flex-1 rounded-full bg-blue-600 px-4 py-2 text-center text-sm font-semibold text-white">
                  Sign Up
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
