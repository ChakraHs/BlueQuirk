import Link from "next/link";
import { notFound } from "next/navigation";
import ProductCard from "@/components/ProductCard";
import ProductDetailClient from "@/components/product/ProductDetailClient";
import { ProductService } from "@/services/product.service";

type ProductPageParams = {
  lang: string;
  id: string;
};

async function getProduct(id: string, lang: string) {
  const productId = Number(id);

  if (!Number.isFinite(productId)) {
    return null;
  }

  return ProductService.getById(productId, lang).catch(() => null);
}

export async function generateMetadata({
  params,
}: {
  params: Promise<ProductPageParams>;
}) {
  const { lang, id } = await params;
  const product = await getProduct(id, lang);

  if (!product) {
    return {
      title: "Product not found | BlueQuirk",
    };
  }

  return {
    title: `${product.name} | BlueQuirk`,
    description: product.description?.replace(/<[^>]*>/g, "").slice(0, 155),
  };
}

export default async function ProductPage({
  params,
}: {
  params: Promise<ProductPageParams>;
}) {
  const { lang, id } = await params;
  const product = await getProduct(id, lang);

  if (!product) {
    notFound();
  }

  const relatedResponse = await ProductService.getAll(0, 8, lang).catch(() => null);
  const relatedProducts =
    relatedResponse?.content
      .filter((relatedProduct) => relatedProduct.id !== product.id)
      .slice(0, 4) ?? [];

  return (
    <main className="bg-white">
      <nav className="mx-auto flex max-w-7xl items-center gap-2 px-6 pt-6 text-sm text-gray-500 md:px-12">
        <Link href={`/${lang}`} className="hover:text-gray-900">
          Home
        </Link>
        <span>/</span>
        <span className="text-gray-900">Product</span>
      </nav>

      <ProductDetailClient product={product} lang={lang} />

      {!!relatedProducts.length && (
        <section className="mx-auto max-w-7xl px-6 pb-16 pt-4 md:px-12">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-2xl font-semibold text-gray-800">
              You may also like
            </h2>
            <Link href={`/${lang}`} className="text-sm font-medium text-gray-600 hover:text-gray-950">
              Continue shopping
            </Link>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {relatedProducts.map((relatedProduct) => (
              <ProductCard key={relatedProduct.id} product={relatedProduct} lang={lang} />
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
