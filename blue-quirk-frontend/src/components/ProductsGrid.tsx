import ProductCard from "./ProductCard";
import { Product } from "@/types/product";

export default function ProductsGrid({
  products,
  lang = "fr",
}: {
  products: Product[];
  lang?: string;
}) {
  return (
    <div className="mt-10 grid grid-cols-2 gap-x-4 gap-y-8 sm:gap-x-6 lg:grid-cols-4">
      {products.map((product: Product) => (
        <ProductCard key={product.id} product={product} lang={lang} />
      ))}
    </div>
  );
}
