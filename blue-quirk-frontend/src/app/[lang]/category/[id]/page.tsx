import type { Metadata } from "next";
import ProductsGrid from "@/components/ProductsGrid";
import { Category } from "@/types/category";
import { Product } from "@/types/product";
import { API_BASE_URL } from "@/lib/config";
import { t } from "@/lib/i18n";
import { buildAlternates } from "@/lib/seo";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  Leaf,
  Palette,
  ShieldCheck,
  Shirt,
  Sparkles,
  Ruler,
  Tag,
  type LucideIcon,
} from "lucide-react";

/** Strip any rich-text markup so descriptions render as clean plain text. */
function plainText(html?: string): string {
  return html ? html.replace(/<[^>]*>/g, "").trim() : "";
}

/** Small, rotating set of elegant line icons used as a subtle card badge. */
const CARD_ICONS: LucideIcon[] = [Shirt, Sparkles, Leaf, Ruler, Tag];

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
  const description = plainText(category.description);

  const benefits = [
    {
      icon: Leaf,
      title: t(lang, "category.benefit.cotton.title"),
      desc: t(lang, "category.benefit.cotton.desc"),
    },
    {
      icon: Palette,
      title: t(lang, "category.benefit.designs.title"),
      desc: t(lang, "category.benefit.designs.desc"),
    },
    {
      icon: ShieldCheck,
      title: t(lang, "category.benefit.quality.title"),
      desc: t(lang, "category.benefit.quality.desc"),
    },
  ];

  const hasChildren = (category.children?.length ?? 0) > 0;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 md:py-12 lg:px-8">
      {/* Breadcrumb */}
      <nav
        aria-label="Breadcrumb"
        className="flex flex-wrap items-center gap-2 text-sm text-gray-500"
      >
        <Link
          href={`/${lang}`}
          className="transition-colors hover:text-primary"
        >
          {t(lang, "category.home")}
        </Link>
        <span className="text-gray-300" aria-hidden>
          /
        </span>
        <span>{t(lang, "category.categories")}</span>
        <span className="text-gray-300" aria-hidden>
          /
        </span>
        <span className="font-medium text-gray-900" aria-current="page">
          {category.name}
        </span>
      </nav>

      {/* Header: title + description on the left, brand benefits on the right */}
      <header className="mt-6 flex flex-col gap-8 lg:mt-8 lg:flex-row lg:items-start lg:justify-between lg:gap-12">
        <div className="max-w-2xl">
          <h1 className="text-4xl font-semibold tracking-tight text-gray-900 sm:text-5xl">
            {category.name}
          </h1>
          {description && (
            <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-gray-500 sm:text-base">
              {description}
            </p>
          )}
        </div>

        {/* Benefits — horizontal on desktop, quietly scrollable on small screens */}
        <ul className="-mx-4 flex shrink-0 gap-6 overflow-x-auto px-4 pb-1 sm:mx-0 sm:gap-8 sm:px-0 lg:gap-10 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {benefits.map((b) => {
            const Icon = b.icon;
            return (
              <li
                key={b.title}
                className="flex min-w-0 shrink-0 items-center gap-3"
              >
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gray-100 text-gray-700">
                  <Icon className="h-5 w-5" strokeWidth={1.75} aria-hidden />
                </span>
                <span className="whitespace-nowrap">
                  <span className="block text-sm font-semibold text-gray-900">
                    {b.title}
                  </span>
                  <span className="block text-xs text-gray-500">{b.desc}</span>
                </span>
              </li>
            );
          })}
        </ul>
      </header>

      {/* Divider */}
      <div className="mt-8 border-t border-gray-200 lg:mt-10" />

      {/* Sub-categories as rich collection cards, or the products grid */}
      {hasChildren ? (
        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {category.children.map((child, i) => {
            const Badge = CARD_ICONS[i % CARD_ICONS.length];
            const childDesc = plainText(child.description);
            return (
              <Link
                key={child.id}
                href={`/${lang}/category/${child.id}`}
                className="group relative block overflow-hidden rounded-2xl bg-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                <div className="relative aspect-[3/4] w-full">
                  {child.imageUrl ? (
                    <Image
                      src={child.imageUrl}
                      alt={child.name}
                      fill
                      sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, (max-width: 1280px) 33vw, 20vw"
                      className="object-cover transition-transform duration-300 ease-out group-hover:scale-[1.04] motion-reduce:transform-none"
                    />
                  ) : (
                    /* Graceful fallback when a category has no image yet */
                    <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-gray-200 to-gray-300 transition-transform duration-300 ease-out group-hover:scale-[1.04] motion-reduce:transform-none">
                      <Badge
                        className="h-12 w-12 text-gray-400"
                        strokeWidth={1.25}
                        aria-hidden
                      />
                    </div>
                  )}

                  {/* Bottom overlay keeps text legible without hiding the image */}
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-transparent opacity-90 transition-opacity duration-300 group-hover:opacity-100" />

                  {/* Subtle badge */}
                  <span className="absolute left-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-white/15 text-white ring-1 ring-white/25 backdrop-blur-md">
                    <Badge className="h-4 w-4" strokeWidth={1.75} aria-hidden />
                  </span>
                </div>

                {/* Text content anchored to the bottom */}
                <div className="absolute inset-x-0 bottom-0 p-4">
                  <h3 className="text-lg font-semibold leading-tight text-white">
                    {child.name}
                  </h3>
                  {childDesc && (
                    <p className="mt-0.5 line-clamp-1 text-[13px] text-white/70">
                      {childDesc}
                    </p>
                  )}
                  <span className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-white/12 px-3 py-1.5 text-[13px] font-medium text-white ring-1 ring-white/20 backdrop-blur-md transition-colors duration-300 group-hover:bg-primary group-hover:ring-transparent">
                    {t(lang, "category.discover")}
                    <ArrowRight
                      className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-0.5 motion-reduce:transform-none"
                      aria-hidden
                    />
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      ) : (
        <div className="mt-8">
          <ProductsGrid products={category.products ?? []} lang={lang} />
        </div>
      )}
    </div>
  );
}
