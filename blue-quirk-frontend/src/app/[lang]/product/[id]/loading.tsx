/**
 * Route-level loading UI for a product page. Next renders this instantly on
 * navigation (Suspense fallback) while the server fetches the product, so the
 * shopper sees a polished skeleton — never a frozen previous page. Pairs with the
 * per-card spinner (ProductCard) that fires the moment a product is tapped.
 */
export default function ProductLoading() {
  return (
    <main className="bg-surface pb-24 md:pb-0">
      {/* Breadcrumb placeholder */}
      <div className="mx-auto flex max-w-7xl items-center gap-2 px-6 pt-6 md:px-12">
        <div className="h-4 w-16 animate-pulse rounded bg-gray-100" />
        <div className="h-4 w-4 animate-pulse rounded bg-gray-100" />
        <div className="h-4 w-40 animate-pulse rounded bg-gray-100" />
      </div>

      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-8 px-6 py-8 md:grid-cols-2 md:px-12 lg:gap-12">
        {/* Gallery */}
        <div className="space-y-3">
          <div className="aspect-square w-full animate-pulse rounded-2xl bg-gray-100" />
          <div className="flex gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="size-16 animate-pulse rounded-lg bg-gray-100" />
            ))}
          </div>
        </div>

        {/* Details */}
        <div className="space-y-5">
          <div className="h-8 w-3/4 animate-pulse rounded bg-gray-100" />
          <div className="h-6 w-1/3 animate-pulse rounded bg-gray-100" />
          <div className="space-y-2 pt-2">
            <div className="h-4 w-full animate-pulse rounded bg-gray-100" />
            <div className="h-4 w-5/6 animate-pulse rounded bg-gray-100" />
            <div className="h-4 w-2/3 animate-pulse rounded bg-gray-100" />
          </div>
          <div className="flex gap-2 pt-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="size-10 animate-pulse rounded-full bg-gray-100" />
            ))}
          </div>
          <div className="h-12 w-full animate-pulse rounded-full bg-gray-100" />
          <div className="grid grid-cols-2 gap-3 pt-2 sm:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-24 animate-pulse rounded-2xl bg-gray-100" />
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
