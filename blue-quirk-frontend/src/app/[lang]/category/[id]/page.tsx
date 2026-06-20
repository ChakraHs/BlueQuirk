import ProductsGrid from "@/components/ProductsGrid";
import { Category } from "@/types/category";
import { Product } from "@/types/product";
import Image from "next/image";
import Link from "next/link";

type CategoryWithProducts = Category & {
  products?: Product[];
};

async function getCategory(id: string, lang: string): Promise<CategoryWithProducts> {
  const res = await fetch(
    `http://127.0.0.1:9090/api/categories/${id}?lang=${encodeURIComponent(lang)}`,
    {
      cache: "no-store",
    }
  );

  const category: CategoryWithProducts = await res.json();

  if (category.children?.length === 0) {
    const productsRes = await fetch(
      `http://127.0.0.1:9090/api/products/category/${id}?lang=${encodeURIComponent(lang)}`,
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
    <div className="mx-auto max-w-7xl md:px-12 py-0 md:py-12 text-gray-600">
      
      {/* Hero */}

      <div className="mx-auto max-w-7xl py-4">
        <div className="flex flex-col md:flex-row-reverse justify-between items-center gap-8 md:bg-violet-500 text-gray-900 md:text-white rounded-sm">

          {/* Image */}
          <div className="relative w-full md:w-96 h-72 overflow-hidden flex-shrink-0">
            <Image
              src={category.imageUrl}
              alt={category.name}
              fill
              className="object-cover"
            />
          </div>

          {/* Content */}
          <div className="p-0 text-center md:text-start md:px-8">
            <h1 className="text-3xl font-bold md:text-4xl whitespace-nowrap">
              {category.name}
            </h1>

            <p className="mt-4 max-w-xl text-lg md:text-xl">
              {category.description}
            </p>
          </div>

        </div>
      </div>

      {/* Sub Categories */}
      {category.children?.length > 0 ? (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 px-5 md:px-0 mt-8">
            {category.children.map((child) => (
                <Link
                key={child.id}
                href={`/${lang}/category/${child.id}`}
                className="rounded-sm overflow-hidden hover:shadow-lg transition block"
                >
                {/* IMAGE WRAPPER */}
                <div className="relative w-full aspect-[3/4]">
                    <Image
                    src={child.imageUrl}
                    alt={child.name}
                    fill
                    className="object-cover"
                    />
                </div>

                {/* TEXT */}
                <div className="p-4">
                    <h3 className="font-semibold text-lg text-center whitespace-nowrap text-gray-800">
                    {child.name}
                    </h3>
                </div>
                </Link>
            ))}
            </div>
        </>
      ):(
        <ProductsGrid products={category.products ?? []} lang={lang} />
      )}
    </div>
  );
}
