"use client";

import Sidebar from "@/components/admin/Sidebar";
import Topbar from "@/components/admin/Topbar";
import { useEffect, useState } from "react";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const syncToken = () => {
      const t = localStorage.getItem("access_token");
      console.log("TOKEN CHECK:", t); // DEBUG
      setToken(t);
    };

    syncToken();

    // listen for changes (login/logout)
    window.addEventListener("storage", syncToken);

    return () => window.removeEventListener("storage", syncToken);
  }, []);

  return (
    <div className="flex min-h-screen bg-gray-100">
      <Sidebar />

      <div className="flex-1">
        <Topbar />

        {token ? (
          <details className="mb-4 mx-6 mt-4">
            <summary className="cursor-pointer p-2 bg-gray-900 text-green-300 text-xs rounded">
              DEV TOKEN (click to expand)
            </summary>

            <div className="mt-2 p-3 bg-gray-800 text-green-200 text-xs rounded overflow-x-auto">
              <div className="break-all">{token}</div>
            </div>
          </details>
        ) : (
          <div className="mx-6 mt-4 text-red-500 text-sm">
            No token found (not logged in or page not refreshed)
          </div>
        )}

        <main className="p-6">{children}</main>
      </div>
    </div>
  );
}