import Categories from "@/components/home/Categories";
import FeaturedProducts from "@/components/home/FeaturedProducts";
import Hero from "@/components/home/Hero";
import TrustBar from "@/components/home/TrustBar";
import ValueIntro from "@/components/home/ValueIntro";
import { getPublicShopConfig } from "@/lib/shopConfig";

export default async function HomePage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  const config = await getPublicShopConfig();

  return (
    <main>
      <Hero
        lang={lang}
        heroTitleFr={config.heroTitleFr}
        heroTitleEn={config.heroTitleEn}
        heroTitleAr={config.heroTitleAr}
        heroSubtitleFr={config.heroSubtitleFr}
        heroSubtitleEn={config.heroSubtitleEn}
        heroSubtitleAr={config.heroSubtitleAr}
        heroBtnTextColor={config.heroBtnTextColor}
        heroBtnBgColor={config.heroBtnBgColor}
        heroBgColor={config.heroBgColor}
        heroImageUrl={config.heroImageUrl}
        heroImageMobileUrl={config.heroImageMobileUrl}
      />
      <Categories lang={lang} />
      <FeaturedProducts lang={lang} />
      <ValueIntro lang={lang} />
      <TrustBar lang={lang} />
    </main>
  );
}
