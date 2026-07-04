import Link from "next/link";
import { Facebook, Instagram, Twitter, Youtube } from "lucide-react";
import { t } from "@/lib/i18n";

type FooterLink = { label: string; href: string };

export default function Footer({
  lang,
  storeName = "BlueQuirk",
  logoUrl = null,
}: {
  lang: string;
  storeName?: string;
  logoUrl?: string | null;
}) {
  // Local storefront path (locale-prefixed). Content pages live under /[lang]/<slug>.
  const l = (path: string) => `/${lang}${path}`;

  const columns: { title: string; links: FooterLink[] }[] = [
    {
      title: t(lang, "footer.shop"),
      links: [
        { label: t(lang, "footer.newArrivals"), href: l("/search") },
        { label: t(lang, "footer.tshirts"), href: l("/search?q=t-shirt") },
        { label: t(lang, "footer.hoodies"), href: l("/search?q=hoodie") },
        { label: t(lang, "footer.stickers"), href: l("/search?q=sticker") },
        { label: t(lang, "footer.phoneCases"), href: l("/search?q=coque") },
      ],
    },
    {
      title: t(lang, "footer.help"),
      links: [
        { label: t(lang, "footer.shipping"), href: l("/shipping") },
        { label: t(lang, "footer.returns"), href: l("/returns") },
        { label: t(lang, "footer.orderStatus"), href: "/order-tracking" },
        { label: t(lang, "footer.sizeGuide"), href: l("/size-guide") },
        { label: t(lang, "footer.contact"), href: l("/contact") },
      ],
    },
    {
      title: t(lang, "footer.company"),
      links: [
        { label: t(lang, "footer.about"), href: l("/about") },
        { label: t(lang, "footer.sellArt"), href: l("/sell-art") },
        { label: t(lang, "footer.careers"), href: l("/careers") },
        { label: t(lang, "footer.blog"), href: l("/blog") },
        { label: t(lang, "footer.press"), href: l("/press") },
      ],
    },
  ];

  const legal: FooterLink[] = [
    { label: t(lang, "footer.privacy"), href: l("/privacy") },
    { label: t(lang, "footer.terms"), href: l("/terms") },
    { label: t(lang, "footer.cookies"), href: l("/cookies") },
  ];

  return (
    <footer className="border-t border-gray-200 bg-gray-50">
      <div className="mx-auto max-w-7xl px-6 py-14">
        <div className="grid gap-10 md:grid-cols-[1.5fr_repeat(3,1fr)]">
          {/* Brand — uploaded logo when set, otherwise the store name as text */}
          <div>
            <Link
              href={`/${lang}`}
              aria-label={storeName}
              className="inline-flex items-center"
            >
              {logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={logoUrl}
                  alt={storeName}
                  className="h-9 w-auto max-w-[180px] object-contain"
                />
              ) : (
                <span className="text-2xl font-extrabold tracking-tight text-gray-900">
                  {storeName}
                </span>
              )}
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
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-sm text-gray-500 transition hover:text-blue-600"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-gray-200 pt-6 text-sm text-gray-500 sm:flex-row">
          <p>
            © {new Date().getFullYear()} {storeName}. {t(lang, "footer.rights")}
          </p>
          <div className="flex items-center gap-5">
            {legal.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                className="hover:text-gray-900"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
