import { Suspense } from "react";
import SearchClient from "@/components/search/SearchClient";

type SearchPageProps = {
  params: Promise<{ lang: string }>;
  searchParams: Promise<{ q?: string }>;
};

export async function generateMetadata({ searchParams }: SearchPageProps) {
  const { q } = await searchParams;
  return {
    title: q ? `Recherche : ${q} | RedQuirk` : "Recherche | RedQuirk",
  };
}

export default async function SearchPage({ params, searchParams }: SearchPageProps) {
  const { lang } = await params;
  const { q = "" } = await searchParams;

  return (
    <Suspense fallback={null}>
      <SearchClient lang={lang} initialQuery={q} />
    </Suspense>
  );
}
