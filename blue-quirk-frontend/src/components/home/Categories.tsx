// components/home/Categories.tsx (REMOVE "use client")
import Image from "next/image";
import Link from "next/link";
import { CategoryService } from "@/services/category.service";

export default async function Categories({ lang }: { lang: string }) {
  const categories = await CategoryService.getAll(lang).catch(() => []);

  if (!categories.length) {
    return null;
  }

  return (
    <section className="py-8">
      <div className="mx-auto max-w-7xl px-6">
        <h2 className="mb-8 text-2xl font-semibold text-gray-700">
          Shop by Category
        </h2>

        <div className="grid gap-6 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {categories.map((category) => (
            <Link
              key={category.id}
              href={`/${lang}/category/${category.id}`}
              className="group relative overflow-hidden rounded-sm bg-blue-200"
            >
              <div className="relative aspect-[4/5]">
                <Image
                  src={category.imageUrl}
                  alt={category.name}
                  fill
                  className="object-cover transition duration-500 group-hover:scale-110"
                />
              </div>

              <div className="absolute bottom-8 left-1/2 -translate-x-1/2">
                <span className="whitespace-nowrap rounded-full bg-white/90 px-4 py-3 text-sm font-semibold text-gray-800 backdrop-blur-md">
                  {category.name}
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
