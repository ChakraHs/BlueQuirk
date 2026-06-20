import { ProductService } from "@/services/product.service";
import ProductCard from "../ProductCard";

export default async function FeaturedProducts({ lang }: { lang: string }) {
  const res = await ProductService.getAll(0, 8, lang).catch(() => null);
  const products = res?.content ?? [];

  if (!products.length) {
    return null;
  }

  return (
    <section className="py-16">
      <div className="mx-auto max-w-7xl px-4">

        <div className="mb-10 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-700">
            Featured Products
          </h2>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} lang={lang} />
          ))}
        </div>

      </div>
    </section>
  );
}
