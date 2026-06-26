import { t } from "@/lib/i18n";

export default function ValueIntro({ lang = "fr" }: { lang?: string }) {
  return (
    <section className="py-10">
      <div className="mx-auto max-w-7xl px-6 text-center">

        <h2 className="text-2xl md:text-3xl font-semibold text-gray-800">
          {t(lang, "value.title")}
        </h2>

        <p className="mt-3 text-gray-600 max-w-2xl mx-auto">
          {t(lang, "value.subtitle")}
        </p>

      </div>
    </section>
  );
}
