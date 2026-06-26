import Link from "next/link";
import { notFound } from "next/navigation";
import ProductCard from "@/components/ProductCard";
import ProductDetailClient from "@/components/product/ProductDetailClient";
import { ProductService } from "@/services/product.service";
import { t } from "@/lib/i18n";

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

  // The storefront only shows published products — hide drafts/archived even
  // when reached by a direct link.
  if (!product || product.status !== "PUBLISHED") {
    notFound();
  }

  const relatedResponse = await ProductService.getAll(0, 8, lang, "PUBLISHED").catch(() => null);
  const relatedProducts =
    relatedResponse?.content
      .filter((relatedProduct) => relatedProduct.id !== product.id)
      .slice(0, 4) ?? [];

  return (
    <main className="bg-white">
      <nav className="mx-auto flex max-w-7xl items-center gap-2 px-6 pt-6 text-sm text-gray-500 md:px-12">
        <Link href={`/${lang}`} className="hover:text-gray-900">
          {t(lang, "breadcrumb.home")}
        </Link>
        <span>/</span>
        <span className="text-gray-900">{t(lang, "breadcrumb.product")}</span>
      </nav>

      <ProductDetailClient product={product} lang={lang} />

      {!!relatedProducts.length && (
        <section className="mx-auto max-w-7xl px-6 pb-16 pt-4 md:px-12">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-2xl font-semibold text-gray-800">
              {t(lang, "product.relatedTitle")}
            </h2>
            <Link href={`/${lang}`} className="text-sm font-medium text-gray-600 hover:text-gray-950">
              {t(lang, "cart.continue")}
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
