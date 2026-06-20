import Image from "next/image";
import Link from "next/link";

const collage = [
  { src: "/white-t-shirt-with-colorful-anime-character-design.png", rotate: "-rotate-6" },
  { src: "/black-hoodie-with-anime-character-graphic-design.png", rotate: "rotate-3" },
  { src: "/black-baseball-cap-with-small-white-text.png", rotate: "rotate-6" },
  { src: "/white-trucker-hat-with-blue-snowflake-design.png", rotate: "-rotate-3" },
];

export default function Hero({ lang = "fr" }: { lang?: string }) {
  return (
    <section className="bg-gradient-to-br from-blue-700 via-blue-600 to-indigo-700">
      <div className="mx-auto grid max-w-7xl items-center gap-10 px-6 py-14 md:grid-cols-2 md:py-20">
        {/* Text */}
        <div className="text-center md:text-left">
          <span className="inline-block rounded-full bg-white/15 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-blue-50">
            Original designs by independent artists
          </span>

          <h1 className="mt-5 text-4xl font-extrabold leading-tight text-white md:text-5xl lg:text-6xl">
            Find your thing.
          </h1>

          <p className="mx-auto mt-5 max-w-md text-lg text-blue-100 md:mx-0">
            Thousands of weirdly meaningful designs on high-quality tees,
            hoodies, stickers, phone cases and more.
          </p>

          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row md:justify-start">
            <Link
              href={`/${lang}/search?q=`}
              className="rounded-full bg-white px-7 py-3 text-base font-semibold text-blue-700 transition hover:bg-blue-50"
            >
              Shop all products
            </Link>
            <Link
              href={`/${lang}`}
              className="rounded-full border border-white/40 px-7 py-3 text-base font-semibold text-white transition hover:bg-white/10"
            >
              Explore designs
            </Link>
          </div>
        </div>

        {/* Collage */}
        <div className="relative hidden h-80 md:block">
          <div className="absolute inset-0 grid grid-cols-2 gap-4">
            {collage.map((item, i) => (
              <div
                key={i}
                className={`relative overflow-hidden rounded-2xl bg-white shadow-xl ring-1 ring-black/5 transition duration-500 hover:rotate-0 ${item.rotate}`}
              >
                <Image
                  src={item.src}
                  alt=""
                  fill
                  sizes="(max-width: 768px) 50vw, 25vw"
                  className="object-cover"
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
