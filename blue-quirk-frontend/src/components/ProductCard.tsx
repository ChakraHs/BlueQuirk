import Image from "next/image";
import Link from "next/link";
import { Product } from "@/types/product";
import WishlistButton from "./WishlistButton";

export default function ProductCard({
  product,
  lang = "fr",
}: {
  product: Product;
  lang?: string;
}) {
  const image =
    product.images?.[0]?.url ||
    "https://images.ctfassets.net/5hig0ukq7ib0/bUmu6RBCWC5TTscquxd16/041978fd5b8a89923e2bcf646f24c71c/2352468_LocalizationUpdates40offPromo_800x800_1_081824.jpg?fm=jpg&q=85&w=800&fl=progressive";

  const isOutOfStock = product.status === "ARCHIVED";
  const category = product.categories?.[0]?.name;

  return (
    <Link
      href={`/${lang}/product/${product.id}`}
      className="group block"
    >
      {/* IMAGE */}
      <div className="relative aspect-square overflow-hidden rounded-xl bg-gray-100">
        <Image
          src={image}
          alt={product.name}
          fill
          sizes="(max-width: 768px) 50vw, 25vw"
          className="object-cover transition-transform duration-500 group-hover:scale-105"
        />

        {isOutOfStock && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
            <span className="text-sm font-semibold tracking-wider text-white">
              OUT OF STOCK
            </span>
          </div>
        )}

        {/* wishlist toggle */}
        <WishlistButton
          item={{ id: product.id, name: product.name, price: product.price, image, lang }}
          className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-gray-700 shadow-sm backdrop-blur transition hover:text-blue-600"
        />
      </div>

      {/* INFO */}
      <div className="px-1 pt-3">
        <h3 className="line-clamp-1 text-sm font-semibold text-gray-900">
          {product.name}
        </h3>

        {category && (
          <p className="mt-0.5 line-clamp-1 text-xs text-gray-500">{category}</p>
        )}

        <p className="mt-1.5 text-sm font-bold text-gray-900">
          ${product.price}
        </p>
      </div>
    </Link>
  );
}
