"use client";

import { useState } from "react";
import Sidebar from "@/components/admin/Sidebar";
import Topbar from "@/components/admin/Topbar";

/**
 * Client shell for the admin dashboard. Owns the mobile drawer state so the
 * Topbar's hamburger can open/close the Sidebar. On desktop (md+) the sidebar is
 * a static column; on phones it slides in over a backdrop.
 */
export default function AdminShell({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-gray-100">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* min-w-0 lets the content column shrink instead of forcing the whole
          page wider than a phone screen (e.g. from wide tables). */}
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar onMenu={() => setSidebarOpen(true)} />
        <main className="p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
