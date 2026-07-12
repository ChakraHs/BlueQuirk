import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "../globals.css";
import ThemeStyle from "@/components/ThemeStyle";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Suivi de commande · RedQuirk",
  description: "Suivez votre commande RedQuirk avec votre numéro de commande.",
};

export default function OrderTrackingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <ThemeStyle />
        {children}
      </body>
    </html>
  );
}
