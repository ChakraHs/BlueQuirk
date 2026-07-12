import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "../globals.css";
import ThemeStyle from "@/components/ThemeStyle";
import AdminShell from "@/components/admin/AdminShell";
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
  title: "Admin · RedQuirk",
  description: "RedQuirk admin dashboard.",
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <ThemeStyle />
        <AdminShell>
          <RoleGuard requireRole="admin">{children}</RoleGuard>
        </AdminShell>
      </body>
    </html>
  );
}
