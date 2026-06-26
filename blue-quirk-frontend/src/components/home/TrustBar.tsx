import { t } from "@/lib/i18n";

export default function TrustBar({ lang = "fr" }: { lang?: string }) {
  const items = [
    { title: t(lang, "trust.shipping.title"), desc: t(lang, "trust.shipping.desc") },
    { title: t(lang, "trust.delivery.title"), desc: t(lang, "trust.delivery.desc") },
    { title: t(lang, "trust.payments.title"), desc: t(lang, "trust.payments.desc") },
    { title: t(lang, "trust.support.title"), desc: t(lang, "trust.support.desc") },
  ];

  return (
    <section className="border-t border-gray-200 py-14">
      <div className="mx-auto max-w-7xl px-6">

        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {items.map((item, i) => (
            <div key={i} className="text-center space-y-2">

              <h3 className="text-lg font-semibold text-gray-800">
                {item.title}
              </h3>

              <p className="text-sm text-gray-600">
                {item.desc}
              </p>

            </div>
          ))}
        </div>

      </div>
    </section>
  );
}
