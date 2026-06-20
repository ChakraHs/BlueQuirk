import { ProductService } from "@/services/product.service";
import ProductCard from "../ProductCard";

export default async function FeaturedProducts({ lang }: { lang: string }) {
  const res = await ProductService.getAll(0, 8, lang).catch(() => null);
  const products = res?.content ?? [];

  if (!products.length) {
    return null;
  }

  return (
    <section className="py-12">
      <div className="mx-auto max-w-7xl px-6">

        <div className="mb-8">
          <h2 className="text-2xl font-bold tracking-tight text-gray-900 md:text-3xl">
            Trending right now
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Fresh designs our community is loving this week.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:gap-x-6 lg:grid-cols-4">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} lang={lang} />
          ))}
        </div>

      </div>
    </section>
  );
}
