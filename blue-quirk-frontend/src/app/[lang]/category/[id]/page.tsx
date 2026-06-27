import type { Metadata } from "next";
import ProductsGrid from "@/components/ProductsGrid";
import { Category } from "@/types/category";
import { Product } from "@/types/product";
import { API_BASE_URL } from "@/lib/config";
import { t } from "@/lib/i18n";
import { buildAlternates } from "@/lib/seo";
import Image from "next/image";
import Link from "next/link";

type CategoryWithProducts = Category & {
  products?: Product[];
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string; id: string }>;
}): Promise<Metadata> {
  const { lang, id } = await params;
  const category = await getCategory(id, lang).catch(() => null);
  if (!category?.name) {
    return { title: t(lang, "categories.title") };
  }
  const description =
    category.description?.replace(/<[^>]*>/g, "").slice(0, 160) ||
    t(lang, "seo.categoryDesc", { category: category.name });
  const cover = category.imageUrl || undefined;
  return {
    title: category.name,
    description,
    alternates: buildAlternates(lang, `/category/${id}`),
    openGraph: {
      type: "website",
      title: category.name,
      description,
      images: cover ? [{ url: cover }] : undefined,
    },
  };
}

async function getCategory(id: string, lang: string): Promise<CategoryWithProducts> {
  const res = await fetch(
    `${API_BASE_URL}/categories/${id}?lang=${encodeURIComponent(lang)}`,
    {
      cache: "no-store",
    }
  );

  const category: CategoryWithProducts = await res.json();

  if (category.children?.length === 0) {
    const productsRes = await fetch(
      `${API_BASE_URL}/products/category/${id}?lang=${encodeURIComponent(lang)}&status=PUBLISHED`,
      {
        cache: "no-store",
      }
    );
    category.products = await productsRes.json();
  }


  return category;
}

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ lang: string; id: string }>;
}) {
  const { lang, id } = await params;

  const category = await getCategory(id, lang);

  return (
    <div className="mx-auto max-w-7xl px-6 py-8 md:px-12 md:py-10 text-gray-600">

      {/* Breadcrumb */}
      <nav className="mb-6 flex items-center gap-2 text-sm text-gray-500">
        <Link href={`/${lang}`} className="hover:text-gray-900">
          Home
        </Link>
        <span>/</span>
        <span className="text-gray-900">{category.name}</span>
      </nav>

      {/* Hero */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-700 via-blue-600 to-indigo-700">
        <div className="flex flex-col items-center gap-8 md:flex-row-reverse md:justify-between">
          {/* Image */}
          <div className="relative h-56 w-full flex-shrink-0 md:h-72 md:w-96">
            <Image
              src={category.imageUrl}
              alt={category.name}
              fill
              className="object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-blue-700/60 to-transparent md:bg-gradient-to-l" />
          </div>

          {/* Content */}
          <div className="px-6 pb-8 text-center text-white md:px-10 md:py-10 md:text-start">
            <h1 className="text-3xl font-bold md:text-4xl">
              {category.name}
            </h1>

            {category.description && (
              <p className="mt-4 max-w-xl text-base text-blue-100 md:text-lg">
                {category.description}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Sub Categories */}
      {category.children?.length > 0 ? (
        <div className="mt-10 grid grid-cols-2 gap-4 sm:gap-6 md:grid-cols-4">
          {category.children.map((child) => (
            <Link
              key={child.id}
              href={`/${lang}/category/${child.id}`}
              className="group"
            >
              <div className="relative aspect-square overflow-hidden rounded-2xl bg-gray-100">
                <Image
                  src={child.imageUrl}
                  alt={child.name}
                  fill
                  sizes="(max-width: 768px) 50vw, 25vw"
                  className="object-cover transition duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/45 to-transparent" />
                <span className="absolute bottom-3 left-3 right-3 text-base font-bold text-white drop-shadow">
                  {child.name}
                </span>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <ProductsGrid products={category.products ?? []} lang={lang} />
      )}
    </div>
  );
}
