import { Button } from "@/components/ui/button";

import { Cairo } from "next/font/google";

const cairo = Cairo({
  subsets: ["arabic"],
  weight: ["400", "700", "800"],
});

export default function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="mx-auto max-w-7xl px-6 py-4">
        <div className="grid items-center justify-center gap-10 bg-blue-900 p-8 py-12 text-white rounded-sm">

          {/* Center Content */}
          <div className="text-center">
            <h1
              dir="rtl"
              className="text-4xl font-bold md:text-6xl text-white"
            >
              الخيوط الأيقونية
            </h1>

            <p
              dir="rtl"
              className="mx-auto mt-6 max-w-xl text-lg text-white md:text-xl"
            >
              من الراحة الخالدة إلى اللمسة العصرية، اكتشف أزياء تعبّر عنك
              وتبرز أسلوبك الفريد.
            </p>

            <div className="mt-8">
              <Button
                size="lg"
                className={`${cairo.className} font-bold text-lg bg-white text-2xl hover:bg-gray-100 text-black cursor-pointer`}
              >
                تسوق الآن
              </Button>
            </div>
          </div>
        </div>
      </div>

    </section>
  );
}