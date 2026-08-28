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
    <div className="mt-8 grid grid-cols-2 gap-x-2 gap-y-6 sm:gap-x-4 sm:gap-y-8 lg:grid-cols-4">
      {products.map((product: Product) => (
        <ProductCard key={product.id} product={product} lang={lang} />
      ))}
    </div>
  );
}
