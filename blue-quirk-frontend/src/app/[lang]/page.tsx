import Categories from "@/components/home/Categories";
import FeaturedProducts from "@/components/home/FeaturedProducts";
import Hero from "@/components/home/Hero";
import TrustBar from "@/components/home/TrustBar";
import ValueIntro from "@/components/home/ValueIntro";

export default async function HomePage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;

  return (
    <main>
      <Hero />
      <ValueIntro />
      <Categories lang={lang} />
      <FeaturedProducts lang={lang} />
      <TrustBar />
    </main>
  );
}
