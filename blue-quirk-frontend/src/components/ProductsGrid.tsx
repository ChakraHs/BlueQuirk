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
    <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-10">
      
      {products.map((product: Product) => (
                  <ProductCard key={product.id} product={product} lang={lang} />
                ))}
    </div>
  );
}
