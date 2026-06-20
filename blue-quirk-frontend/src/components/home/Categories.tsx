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
    <section className="py-12">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mb-8">
          <h2 className="text-2xl font-bold tracking-tight text-gray-900 md:text-3xl">
            Shop by category
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Browse the things people love most.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4 sm:gap-6 md:grid-cols-3 lg:grid-cols-4">
          {categories.map((category) => (
            <Link
              key={category.id}
              href={`/${lang}/category/${category.id}`}
              className="group"
            >
              <div className="relative aspect-square overflow-hidden rounded-2xl bg-gray-100">
                <Image
                  src={category.imageUrl}
                  alt={category.name}
                  fill
                  sizes="(max-width: 768px) 50vw, 25vw"
                  className="object-cover transition duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/45 to-transparent" />
                <span className="absolute bottom-3 left-3 right-3 text-base font-bold text-white drop-shadow">
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
