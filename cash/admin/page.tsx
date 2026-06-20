"use client";

import dynamic from "next/dynamic";

// Dynamically import the Admin component (disable SSR)
const AdminApp = dynamic(() => import("./AdminApp"), { ssr: false });

export default function AdminPage() {
  return <AdminApp />;
}
