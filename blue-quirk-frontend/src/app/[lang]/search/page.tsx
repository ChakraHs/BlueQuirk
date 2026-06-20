import Link from "next/link";
import { Search } from "lucide-react";
import ProductCard from "@/components/ProductCard";
import { ProductService } from "@/services/product.service";

type SearchPageProps = {
  params: Promise<{ lang: string }>;
  searchParams: Promise<{ q?: string }>;
};

export async function generateMetadata({ searchParams }: SearchPageProps) {
  const { q } = await searchParams;
  return {
    title: q ? `Search: ${q} | BlueQuirk` : "Search | BlueQuirk",
  };
}

export default async function SearchPage({ params, searchParams }: SearchPageProps) {
  const { lang } = await params;
  const { q = "" } = await searchParams;
  const query = q.trim().toLowerCase();

  const res = await ProductService.getAll(0, 100, lang).catch(() => null);
  const all = res?.content ?? [];

  const results = query
    ? all.filter((p) => p.name?.toLowerCase().includes(query))
    : all;

  return (
    <main className="mx-auto max-w-7xl px-6 py-10">
      <div className="mb-8">
        <p className="text-sm text-gray-500">
          <Link href={`/${lang}`} className="hover:text-gray-900">
            Home
          </Link>{" "}
          / Search
        </p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-gray-900 md:text-3xl">
          {q ? (
            <>
              Results for <span className="text-blue-600">“{q}”</span>
            </>
          ) : (
            "All products"
          )}
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          {results.length} {results.length === 1 ? "product" : "products"} found
        </p>
      </div>

      {results.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 py-20 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-gray-100 text-gray-400">
            <Search size={26} />
          </span>
          <h2 className="mt-5 text-lg font-semibold text-gray-900">
            No products match your search
          </h2>
          <p className="mt-1 max-w-sm text-sm text-gray-500">
            Try a different keyword, or browse our categories from the menu.
          </p>
          <Link
            href={`/${lang}`}
            className="mt-6 rounded-full bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
          >
            Back to home
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:gap-x-6 lg:grid-cols-4">
          {results.map((product) => (
            <ProductCard key={product.id} product={product} lang={lang} />
          ))}
        </div>
      )}
    </main>
  );
}
