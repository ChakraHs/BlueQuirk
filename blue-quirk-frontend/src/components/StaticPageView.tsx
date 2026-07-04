import Link from "next/link";
import type { StaticPageContent, PageBlock } from "@/content/staticPages";
import { t } from "@/lib/i18n";

function Block({ block }: { block: PageBlock }) {
  switch (block.type) {
    case "h":
      return (
        <h2 className="mt-10 text-lg font-bold tracking-tight text-gray-900">
          {block.text}
        </h2>
      );
    case "p":
      return <p className="mt-3 leading-relaxed text-gray-600">{block.text}</p>;
    case "ul":
      return (
        <ul className="mt-4 space-y-2">
          {block.items.map((item, i) => (
            <li key={i} className="flex gap-3 text-gray-600">
              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-600" />
              <span className="leading-relaxed">{item}</span>
            </li>
          ))}
        </ul>
      );
    case "table":
      return (
        <div className="mt-5 overflow-x-auto rounded-xl border border-gray-200">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-700">
              <tr>
                {block.head.map((h) => (
                  <th
                    key={h}
                    className="px-4 py-3 text-start font-semibold whitespace-nowrap"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {block.rows.map((row, ri) => (
                <tr key={ri} className="text-gray-600">
                  {row.map((cell, ci) => (
                    <td key={ci} className="px-4 py-3 whitespace-nowrap">
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
  }
}

export default function StaticPageView({
  lang,
  content,
}: {
  lang: string;
  content: StaticPageContent;
}) {
  return (
    <main className="min-h-screen bg-white">
      {/* Header band */}
      <div className="border-b border-gray-100 bg-gradient-to-b from-gray-50 to-white">
        <div className="mx-auto max-w-3xl px-6 py-14 sm:py-20">
          <nav className="mb-4 text-sm text-gray-400">
            <Link href={`/${lang}`} className="hover:text-blue-600">
              {t(lang, "breadcrumb.home")}
            </Link>
            <span className="mx-2">/</span>
            <span className="text-gray-600">{content.title}</span>
          </nav>
          <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 sm:text-4xl">
            {content.title}
          </h1>
          <p className="mt-3 text-lg text-gray-500">{content.subtitle}</p>
        </div>
      </div>

      {/* Body */}
      <article className="mx-auto max-w-3xl px-6 py-12">
        {content.blocks.map((block, i) => (
          <Block key={i} block={block} />
        ))}

        <div className="mt-12 border-t border-gray-100 pt-6">
          <Link
            href={`/${lang}`}
            className="inline-flex items-center gap-2 text-sm font-semibold text-blue-600 hover:text-blue-700"
          >
            ← {t(lang, "common.back")}
          </Link>
        </div>
      </article>
    </main>
  );
}
