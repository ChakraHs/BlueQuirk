import Image from "next/image";

interface Product {
  readonly id: number;
  readonly name: string;
  readonly price: number;
  readonly image: string;
}

interface ProductCardProps {
  readonly product: Product;
}

export default function ProductCard({
  product,
}: ProductCardProps) {
  return (
    <article
      className="
        group
        overflow-hidden
        rounded-xl
        border
        bg-white
        shadow-sm
        transition-all
        duration-300
        hover:shadow-xl
      "
    >
      <div className="relative aspect-square overflow-hidden">
        <Image
          src={product.image}
          alt={product.name}
          fill
          sizes="(max-width: 768px) 100vw, 33vw"
          className="
            object-cover
            transition-transform
            duration-500
            group-hover:scale-105
          "
        />
      </div>

      <div className="p-4">
        <h2 className="line-clamp-2 text-lg font-semibold text-gray-900">
          {product.name}
        </h2>

        <p className="mt-2 text-xl font-bold text-blue-600">
          ${product.price.toFixed(2)}
        </p>

        <button
          aria-label={`Add ${product.name} to cart`}
          className="
            mt-4
            w-full
            rounded-lg
            bg-blue-600
            px-4
            py-2
            font-medium
            text-white
            transition-colors
            hover:bg-blue-700
          "
        >
          Add to Cart
        </button>
      </div>
    </article>
  );
}