"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { LogOut, ExternalLink } from "lucide-react";
import { getAuthUser, logout } from "@/lib/auth";

export default function Topbar() {
  const [name, setName] = useState("Admin");

  useEffect(() => {
    const user = getAuthUser();
    if (user) {
      setName(
        `${user.firstName} ${user.lastName}`.trim() || user.username || "Admin"
      );
    }
  }, []);

  const initials = name
    .split(" ")
    .map((p) => p.charAt(0))
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-end gap-3 border-b border-gray-200 bg-white/90 px-6 backdrop-blur">
      <Link
        href="/"
        className="hidden items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium text-gray-500 transition hover:bg-gray-50 hover:text-gray-800 sm:inline-flex"
      >
        <ExternalLink size={15} />
        View store
      </Link>

      <div className="flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-xs font-semibold text-blue-700">
          {initials || "A"}
        </span>
        <span className="hidden text-sm font-medium text-gray-700 sm:inline">
          {name}
        </span>
      </div>

      <button
        onClick={() => logout("/login")}
        className="inline-flex items-center gap-2 rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
      >
        <LogOut size={16} />
        <span className="hidden sm:inline">Logout</span>
      </button>
    </header>
  );
}
