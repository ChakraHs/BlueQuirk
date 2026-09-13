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
    // Edge-to-edge across the narrow 2-column range (phones + small tablets) so cards
    // are bigger/more visual; padding restored at md and up. The negative margin matches
    // the category page container padding at each breakpoint (px-4 → px-6). Gap stays.
    <div className="-mx-4 mt-8 grid grid-cols-2 gap-x-1 gap-y-4 sm:-mx-6 sm:gap-x-2 sm:gap-y-6 md:mx-0 lg:grid-cols-4">
      {products.map((product: Product) => (
        <ProductCard key={product.id} product={product} lang={lang} flushMobile />
      ))}
    </div>
  );
}
