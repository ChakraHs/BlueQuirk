import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Geist, Geist_Mono } from "next/font/google";
import "../globals.css";
import { Providers } from "../../components/Providers";
import ThemeStyle from "@/components/ThemeStyle";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import { CategoryTreeProvider } from "@/components/CategoryTreeProvider";
import SupportWidget from "@/components/support/SupportWidget";
import { CategoryService } from "@/services/category.service";
import { getPublicShopConfig } from "@/lib/shopConfig";
import { isLang, LANGS, dirOf } from "@/lib/lang";
import { t } from "@/lib/i18n";
import { SITE_URL } from "@/lib/config";
import { buildAlternates } from "@/lib/seo";


const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Pre-render the three supported locales; anything else 404s (see notFound below).
export function generateStaticParams() {
  return LANGS.map((l) => ({ lang: l.code }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await params;
  if (!isLang(lang)) return {};
  const config = await getPublicShopConfig();
  const storeName = config.storeName;
  const description = t(lang, "footer.tagline");

  return {
    metadataBase: new URL(SITE_URL),
    title: {
      default: `${storeName} — ${t(lang, "seo.homeTagline")}`,
      template: `%s | ${storeName}`,
    },
    description,
    applicationName: storeName,
    alternates: buildAlternates(lang, ""),
    openGraph: {
      type: "website",
      siteName: storeName,
      title: `${storeName} — ${t(lang, "seo.homeTagline")}`,
      description,
      locale: lang,
      images: config.logoUrl ? [{ url: config.logoUrl }] : undefined,
    },
    twitter: { card: "summary_large_image" },
    robots: { index: true, follow: true },
  };
}

export default async function LangLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ lang: string }>;
}) {

  const { lang } = await params;
  // Reject non-locale first segments (e.g. /random) so they don't render the
  // home page as duplicate content.
  if (!isLang(lang)) {
    notFound();
  }

  const [categories, config] = await Promise.all([
    CategoryService.getAll(lang).catch(() => []),
    getPublicShopConfig(),
  ]);
  const topCategories = categories.filter((c) => !c.parentId);

  return (
    <html lang={lang} dir={dirOf(lang)}>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
            <ThemeStyle />
            {/* <ShopNavbar /> */}
            <Header
              lang={lang}
              categories={topCategories}
              storeName={config.storeName}
              logoUrl={config.logoUrl}
            />
            {/* Full tree (not just top categories) so product cards can label
                themselves by depth and by the page being browsed. */}
            <CategoryTreeProvider tree={categories}>
              <Providers>{children}</Providers>
            </CategoryTreeProvider>
            <Footer
              lang={lang}
              storeName={config.storeName}
              logoUrl={config.logoUrl}
            />
            <SupportWidget
              lang={lang}
              storeName={config.storeName}
              logoUrl={config.logoUrl}
            />
      </body>
    </html>
  );
}
