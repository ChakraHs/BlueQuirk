import Image from "next/image";
import Link from "next/link";
import { Product } from "@/types/product";

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

  return (
    <Link
      href={`/${lang}/product/${product.id}`}
      className="group relative block overflow-hidden rounded-sm border border-gray-100 bg-white transition hover:shadow-lg"
    >
      {/* IMAGE */}
      <div className="relative aspect-[5/6] overflow-hidden bg-gray-100">
        <Image
          src={image}
          alt={product.name}
          fill
          sizes="(max-width: 768px) 50vw, 25vw"
          className="object-cover transition-transform duration-500 group-hover:scale-110"
        />

        {isOutOfStock && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <span className="text-white font-semibold text-sm tracking-wider">
              OUT OF STOCK
            </span>
          </div>
        )}

        <div className="absolute inset-0 flex items-end justify-center pb-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <span className="bg-black text-white px-4 py-2 rounded-full text-xs">
            Quick View
          </span>
        </div>

        <div className="absolute top-3 left-3">
          <span className="bg-white text-black text-[10px] px-2 py-1 rounded-full shadow">
            NEW
          </span>
        </div>
      </div>

      {/* INFO */}
      <div className="p-4">
        <h3 className="text-sm font-medium text-gray-800 line-clamp-2">
          {product.name}
        </h3>

        <div className="mt-2 flex items-center justify-between">
          <p className="text-base font-semibold text-gray-900">
            ${product.price}
          </p>

          <span
            className={`text-xs px-3 py-1 rounded-full ${
              isOutOfStock
                ? "bg-gray-200 text-gray-400"
                : "bg-gray-100 text-gray-700"
            }`}
          >
            View
          </span>
        </div>
      </div>
    </Link>
  );
}
