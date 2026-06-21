"use client";

import { useEffect, useState } from "react";
import { LogOut } from "lucide-react";
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

  return (
    <header className="h-16 bg-white shadow flex items-center justify-end gap-4 px-6">
      <span className="text-sm font-medium text-gray-700">{name}</span>
      <button
        onClick={() => logout("/login")}
        className="inline-flex items-center gap-2 rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
      >
        <LogOut size={16} />
        Logout
      </button>
    </header>
  );
}
