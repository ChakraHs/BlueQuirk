import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "../globals.css";
import Sidebar from "@/components/admin/Sidebar";
import Topbar from "@/components/admin/Topbar";
import RoleGuard from "@/components/auth/RoleGuard";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Admin · BlueQuirk",
  description: "BlueQuirk admin dashboard.",
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <div className="flex min-h-screen bg-gray-100">
          <Sidebar />

          <div className="flex-1">
            <Topbar />

            <main className="p-6">
              <RoleGuard requireRole="admin">{children}</RoleGuard>
            </main>
          </div>
        </div>
      </body>
    </html>
  );
}
