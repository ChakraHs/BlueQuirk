import Link from "next/link";
import { Facebook, Instagram, Twitter, Youtube } from "lucide-react";
import { t } from "@/lib/i18n";

export default function Footer({
  lang,
  storeName = "BlueQuirk",
}: {
  lang: string;
  storeName?: string;
}) {
  const columns = [
    {
      title: t(lang, "footer.shop"),
      links: [
        t(lang, "footer.tshirts"),
        t(lang, "footer.hoodies"),
        t(lang, "footer.stickers"),
        t(lang, "footer.phoneCases"),
        t(lang, "footer.newArrivals"),
      ],
    },
    {
      title: t(lang, "footer.help"),
      links: [
        t(lang, "footer.shipping"),
        t(lang, "footer.returns"),
        t(lang, "footer.orderStatus"),
        t(lang, "footer.sizeGuide"),
        t(lang, "footer.contact"),
      ],
    },
    {
      title: t(lang, "footer.company"),
      links: [
        t(lang, "footer.about"),
        t(lang, "footer.sellArt"),
        t(lang, "footer.careers"),
        t(lang, "footer.blog"),
        t(lang, "footer.press"),
      ],
    },
  ];

  return (
    <footer className="border-t border-gray-200 bg-gray-50">
      <div className="mx-auto max-w-7xl px-6 py-14">
        <div className="grid gap-10 md:grid-cols-[1.5fr_repeat(3,1fr)]">
          {/* Brand */}
          <div>
            <Link
              href={`/${lang}`}
              className="text-2xl font-extrabold tracking-tight text-gray-900"
            >
              {storeName}
            </Link>
            <p className="mt-3 max-w-xs text-sm text-gray-500">
              {t(lang, "footer.tagline")}
            </p>

            <div className="mt-5 flex items-center gap-3">
              {[Instagram, Facebook, Twitter, Youtube].map((Icon, i) => (
                <a
                  key={i}
                  href="#"
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-gray-600 ring-1 ring-gray-200 transition hover:text-blue-600 hover:ring-blue-300"
                  aria-label="Social link"
                >
                  <Icon size={18} />
                </a>
              ))}
            </div>
          </div>

          {/* Link columns */}
          {columns.map((col) => (
            <div key={col.title}>
              <h3 className="text-sm font-semibold text-gray-900">
                {col.title}
              </h3>
              <ul className="mt-4 space-y-2.5">
                {col.links.map((link) => (
                  <li key={link}>
                    <a
                      href="#"
                      className="text-sm text-gray-500 transition hover:text-blue-600"
                    >
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-gray-200 pt-6 text-sm text-gray-500 sm:flex-row">
          <p>© {new Date().getFullYear()} {storeName}. {t(lang, "footer.rights")}</p>
          <div className="flex items-center gap-5">
            <a href="#" className="hover:text-gray-900">{t(lang, "footer.privacy")}</a>
            <a href="#" className="hover:text-gray-900">{t(lang, "footer.terms")}</a>
            <a href="#" className="hover:text-gray-900">{t(lang, "footer.cookies")}</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
