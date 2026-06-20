"use client";

import {
  Search,
  Heart,
  ShoppingCart,
  Menu,
  LogIn,
  LogOut,
  UserCircle,
} from "lucide-react";

import { useEffect, useState } from "react";
import SearchBar from "./SearchBar";
import Link from "next/link";

export default function Header({ lang }: { lang: string }) {
  const [open, setOpen] = useState(false);
  const [token, setToken] = useState<string | null>(null);

  // read token safely on client
  useEffect(() => {
    const t = localStorage.getItem("token");
    setToken(t);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    setToken(null);
  };

  return (
    <header className="border-b bg-white sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-4">
        
        {/* TOP ROW */}
        <div className="flex items-center justify-between text-gray-700">

          {/* LOGO */}
          <Link
            href="/"
            className="text-2xl font-bold tracking-tight text-gray-900"
          >
            BlueQuirk
          </Link>

          {/* SEARCH */}
          <div className="hidden md:block w-full px-6">
            <SearchBar />
          </div>

          {/* DESKTOP ACTIONS */}
          <nav className="hidden md:flex items-center gap-6">

            {/* AUTH */}
            {!token ? (
              <>
                <a
                  href="/login"
                  className="flex items-center gap-2 text-sm font-bold hover:text-blue-600 transition"
                >
                  Login
                </a>

                <a
                  href="/signup"
                  className="flex items-center justify-center h-8 gap-2 text-sm font-bold rounded-full whitespace-nowrap"
                >
                  Sign Up
                </a>
              </>
            ) : (
              <>
                <a
                  href="/dashboard"
                  className="flex items-center gap-2 text-sm font-medium hover:text-blue-600 transition"
                >
                  <UserCircle size={18} />
                  Dashboard
                </a>

                <button
                  onClick={handleLogout}
                  className="flex items-center gap-2 text-sm font-medium text-red-500 hover:text-red-600 transition"
                >
                  <LogOut size={18} />
                  Logout
                </button>
              </>
            )}

            {/* ICONS */}
            <div className="flex items-center gap-4 pl-4">
              <Heart size={20} className="cursor-pointer hover:text-pink-500 transition" />
              <ShoppingCart size={20} className="cursor-pointer hover:text-blue-600 transition" />
            </div>
          </nav>

          {/* MOBILE MENU BUTTON */}
          <button
            className="md:hidden"
            onClick={() => setOpen(!open)}
          >
            <Menu />
          </button>
        </div>

        {/* MOBILE MENU */}
        {open && (
          <div className="md:hidden mt-4 flex flex-col gap-4 text-gray-700">

            <div className="w-full">
              <SearchBar />
            </div>

            {!token ? (
              <>
                <a href="/login" className="py-2">Login</a>
                <a href="/signup" className="py-2 font-semibold text-blue-600">
                  Sign Up
                </a>
              </>
            ) : (
              <>
                <a href="/dashboard" className="py-2">Dashboard</a>

                <button
                  onClick={handleLogout}
                  className="text-left py-2 text-red-500"
                >
                  Logout
                </button>
              </>
            )}

            <div className="flex gap-6 pt-2 border-t">
              <Heart size={20} />
              <ShoppingCart size={20} />
            </div>
          </div>
        )}
      </div>
    </header>
  );
}