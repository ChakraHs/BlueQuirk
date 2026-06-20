import { Geist, Geist_Mono } from "next/font/google";
import "../globals.css";
import { Providers } from "../../components/Providers";
import Footer from "@/components/Footer";
import Header from "@/components/Header";


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

  return (
    <html 
      lang={lang}
      dir={lang === "ar" ? "rtl" : "ltr"}
    >
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
            {/* <ShopNavbar /> */}
            <Header lang={lang} />
            <Providers>{children}</Providers>
            <Footer lang={lang}/>
      </body>
    </html>
  );
}
