import { Geist, Geist_Mono } from "next/font/google";
import "../globals.css";
import { Providers } from "../../components/Providers";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import { CategoryService } from "@/services/category.service";
import { getPublicShopConfig } from "@/lib/shopConfig";


const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export default async function LangLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ lang: string }>;
}) {

  const { lang } = await params;

  const [categories, config] = await Promise.all([
    CategoryService.getAll(lang).catch(() => []),
    getPublicShopConfig(),
  ]);
  const topCategories = categories.filter((c) => !c.parentId);

  return (
    <html
      lang={lang}
      dir={lang === "ar" ? "rtl" : "ltr"}
    >
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
            {/* <ShopNavbar /> */}
            <Header
              lang={lang}
              categories={topCategories}
              storeName={config.storeName}
              logoUrl={config.logoUrl}
            />
            <Providers>{children}</Providers>
            <Footer lang={lang} storeName={config.storeName} />
      </body>
    </html>
  );
}
