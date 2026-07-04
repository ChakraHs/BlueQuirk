import type { Metadata } from "next";
import { notFound } from "next/navigation";
import StaticPageView from "@/components/StaticPageView";
import {
  getStaticPage,
  isStaticPageSlug,
  STATIC_PAGE_SLUGS,
} from "@/content/staticPages";
import { isLang, LANGS } from "@/lib/lang";
import { buildAlternates } from "@/lib/seo";

// Pre-render every content page in every locale. Unknown slugs fall through to
// notFound() below (and don't collide with the static siblings — cart, search,
// category, product, etc. — which take routing priority over this dynamic seg).
export function generateStaticParams() {
  return LANGS.flatMap((l) =>
    STATIC_PAGE_SLUGS.map((slug) => ({ lang: l.code, slug }))
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string; slug: string }>;
}): Promise<Metadata> {
  const { lang, slug } = await params;
  const content = getStaticPage(slug, lang);
  if (!content) return {};
  return {
    title: content.title,
    description: content.subtitle,
    alternates: buildAlternates(lang, `/${slug}`),
    openGraph: {
      type: "article",
      title: content.title,
      description: content.subtitle,
    },
  };
}

export default async function StaticPage({
  params,
}: {
  params: Promise<{ lang: string; slug: string }>;
}) {
  const { lang, slug } = await params;
  if (!isLang(lang) || !isStaticPageSlug(slug)) {
    notFound();
  }
  const content = getStaticPage(slug, lang);
  if (!content) {
    notFound();
  }
  return <StaticPageView lang={lang} content={content} />;
}
