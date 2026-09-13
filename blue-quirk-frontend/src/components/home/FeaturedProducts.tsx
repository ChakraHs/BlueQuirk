import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { ProductService } from "@/services/product.service";
import ProductCard from "../ProductCard";
import { t } from "@/lib/i18n";

export default async function FeaturedProducts({ lang }: { lang: string }) {
  // Trending products are ranked server-side: recent sales → recent views →
  // newest. Fall back to an empty list on error so the home page still renders.
  const products = await ProductService.getTrending(8, lang).catch(() => []);

  if (!products.length) {
    return null;
  }

  return (
    <section className="py-12">
      <div className="mx-auto max-w-7xl px-3 sm:px-4 lg:px-6">

        <div className="mb-8">
          <h2 className="text-2xl font-bold tracking-tight text-gray-900 md:text-3xl">
            {t(lang, "featured.title")}
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            {t(lang, "featured.subtitle")}
          </p>
        </div>

        {/* Edge-to-edge across the narrow 2-column range (phones + small tablets)
            for bigger, more visual cards; padding restored at md and up. The negative
            margin matches the container padding at each breakpoint (px-3 → px-4) so no
            residual gap remains. The gap between cards stays. */}
        <div className="-mx-3 grid grid-cols-2 gap-x-1 gap-y-4 sm:-mx-4 sm:gap-x-2 sm:gap-y-6 md:mx-0 lg:grid-cols-4">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} lang={lang} flushMobile />
          ))}
        </div>

        {/* View all products → Shop page */}
        <div className="mt-10 flex justify-center">
          <Link
            href={`/${lang}/search?q=`}
            className="group inline-flex items-center gap-2 rounded-full bg-blue-600 px-8 py-3.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
          >
            {t(lang, "featured.viewAll")}
            <ArrowRight
              size={18}
              className="transition-transform group-hover:translate-x-0.5 rtl:rotate-180 rtl:group-hover:-translate-x-0.5"
            />
          </Link>
        </div>

      </div>
    </section>
  );
}
