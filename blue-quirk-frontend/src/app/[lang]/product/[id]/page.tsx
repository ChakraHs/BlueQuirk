import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight } from "lucide-react";
import ProductCard from "@/components/ProductCard";
import ProductDetailClient from "@/components/product/ProductDetailClient";
import ProductReviews from "@/components/product/reviews/ProductReviews";
import TrustSignals from "@/components/product/TrustSignals";
import { ProductService } from "@/services/product.service";
import {
  fetchReviewSummary,
  fetchReviewPage,
  fetchReviewPhotos,
  type ReviewSummary,
  type ReviewPage,
  type ReviewCard,
} from "@/services/review.service";
import { CategoryService } from "@/services/category.service";
import { buildCategoryPath } from "@/lib/productCategory";
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

  const [relatedResponse, config, categoryTree] = await Promise.all([
    ProductService.getAll(0, 8, lang, "PUBLISHED").catch(() => null),
    getPublicShopConfig(),
    CategoryService.getAll(lang).catch(() => []),
  ]);
  const relatedProducts =
    relatedResponse?.content
      .filter((relatedProduct) => relatedProduct.id !== product.id)
      .slice(0, 4) ?? [];

  // Category breadcrumb: broadest → most specific, each linking to that category's
  // listing so shoppers can browse all products of the same category.
  const categoryPath = buildCategoryPath(categoryTree, product.categories);

  // Reviews are fetched ONLY when the store has enabled them — when off we request
  // nothing and render no review DOM at all (empty-state contract). The first page is
  // fetched server-side so approved reviews are in the initial HTML for SEO.
  let reviewSummary: ReviewSummary | null = null;
  let reviewPage: ReviewPage | null = null;
  let reviewPhotos: ReviewCard[] = [];
  if (config.reviewsEnabled) {
    const [summary, firstPage, photos] = await Promise.all([
      fetchReviewSummary(product.id),
      fetchReviewPage(product.id, 0),
      config.reviewPhotosEnabled
        ? fetchReviewPhotos(product.id, 12)
        : Promise.resolve<ReviewPage | null>(null),
    ]);
    reviewSummary = summary;
    reviewPage = firstPage;
    reviewPhotos = photos?.reviews ?? [];
  }
  const hasApprovedReviews = !!reviewSummary?.enabled && reviewSummary.total > 0;

  // JSON-LD Product structured data for rich results (price, availability, brand).
  const images = (product.images ?? [])
    .map((img) => displaySrc(img))
    .filter((u): u is string => !!u);
  const jsonLd: Record<string, unknown> = {
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
  // Emit AggregateRating/Review structured data ONLY when reviews are enabled AND at
  // least one genuine approved review is actually rendered — never fabricate Google
  // stars. Mirrors the visible reviews so search results can never overstate them.
  if (hasApprovedReviews && reviewSummary) {
    jsonLd.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: reviewSummary.average,
      reviewCount: reviewSummary.total,
      bestRating: 5,
      worstRating: 1,
    };
    jsonLd.review = (reviewPage?.reviews ?? []).slice(0, 5).map((r) => ({
      "@type": "Review",
      reviewRating: { "@type": "Rating", ratingValue: r.rating, bestRating: 5, worstRating: 1 },
      author: { "@type": "Person", name: r.authorName },
      datePublished: r.createdAt ?? undefined,
      name: r.title ?? undefined,
      reviewBody: r.body,
    }));
  }

  return (
    <main className="bg-surface">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {/* Breadcrumb — Category › … › Product. Every category is a clickable link to
          its listing (browse all products of that category); the product name is the
          current (non-link) crumb. Falls back to a Home link when the product has no
          category. */}
      <nav
        aria-label="Breadcrumb"
        className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-1.5 gap-y-1 px-6 pt-6 text-sm md:px-12"
      >
        {(categoryPath.length > 0
          ? categoryPath.map((c) => ({ id: c.id, name: c.name, href: `/${lang}/category/${c.id}` }))
          : [{ id: 0, name: t(lang, "breadcrumb.home"), href: `/${lang}` }]
        ).map((crumb) => (
          <span key={crumb.id} className="inline-flex items-center gap-1.5">
            <Link
              href={crumb.href}
              className="font-medium text-gray-500 underline-offset-4 transition-colors hover:text-primary hover:underline"
            >
              {crumb.name}
            </Link>
            <ChevronRight className="size-3.5 shrink-0 text-gray-300" aria-hidden />
          </span>
        ))}
        <span
          aria-current="page"
          className="max-w-[60vw] truncate font-semibold text-gray-900 sm:max-w-sm"
        >
          {product.name}
        </span>
      </nav>

      <ProductDetailClient
        product={product}
        lang={lang}
        reviewSummary={config.reviewsEnabled ? reviewSummary : null}
      />

      {/* Purchase-reassurance trust strip (real facts only). Always shown, so when
          reviews are off the page still reads as complete. */}
      <TrustSignals lang={lang} reviewsEnabled={config.reviewsEnabled} />

      {/* "What our customers say" — rendered only when reviews are enabled. */}
      {config.reviewsEnabled && reviewSummary && reviewPage && (
        <ProductReviews
          productId={product.id}
          lang={lang}
          summary={reviewSummary}
          initial={reviewPage}
          photos={reviewPhotos}
        />
      )}

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
