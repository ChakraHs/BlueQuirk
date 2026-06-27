import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import ProductCard from "@/components/ProductCard";
import ProductDetailClient from "@/components/product/ProductDetailClient";
import { ProductService } from "@/services/product.service";
import { getPublicShopConfig } from "@/lib/shopConfig";
import { displaySrc } from "@/lib/productImage";
import { buildAlternates, absoluteUrl } from "@/lib/seo";
import { t } from "@/lib/i18n";

type ProductPageParams = {
  lang: string;
  id: string;
};

function plainText(html?: string, max = 160): string {
  return (html ?? "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim().slice(0, max);
}

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
}): Promise<Metadata> {
  const { lang, id } = await params;
  const product = await getProduct(id, lang);

  if (!product) {
    return { title: t(lang, "breadcrumb.product") };
  }

  const description = plainText(product.description);
  const image = product.images?.[0] ? displaySrc(product.images[0]) : undefined;

  return {
    // The lang layout adds the "| StoreName" suffix via its title template.
    title: product.name,
    description,
    alternates: buildAlternates(lang, `/product/${id}`),
    openGraph: {
      type: "website",
      title: product.name,
      description,
      images: image ? [{ url: image }] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: product.name,
      description,
      images: image ? [image] : undefined,
    },
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

  const [relatedResponse, config] = await Promise.all([
    ProductService.getAll(0, 8, lang, "PUBLISHED").catch(() => null),
    getPublicShopConfig(),
  ]);
  const relatedProducts =
    relatedResponse?.content
      .filter((relatedProduct) => relatedProduct.id !== product.id)
      .slice(0, 4) ?? [];

  // JSON-LD Product structured data for rich results (price, availability, brand).
  const images = (product.images ?? [])
    .map((img) => displaySrc(img))
    .filter((u): u is string => !!u);
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: plainText(product.description, 5000) || undefined,
    image: images.length ? images : undefined,
    sku: String(product.id),
    brand: { "@type": "Brand", name: config.storeName },
    offers: {
      "@type": "Offer",
      price: product.price,
      priceCurrency: config.currency === "DH" ? "MAD" : config.currency,
      availability: "https://schema.org/InStock",
      url: absoluteUrl(`/${lang}/product/${product.id}`),
    },
  };

  return (
    <main className="bg-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
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
