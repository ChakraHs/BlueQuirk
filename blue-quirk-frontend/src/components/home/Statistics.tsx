export default function Statistics() {
  const stats = [
    {
      value: "10K+",
      label: "Products Sold",
    },
    {
      value: "5K+",
      label: "Happy Customers",
    },
    {
      value: "50+",
      label: "Exclusive Designs",
    },
    {
      value: "4.9★",
      label: "Customer Rating",
    },
  ];

  return (
    <section className="bg-blue-600 py-16 text-white">
      <div className="mx-auto max-w-7xl px-4">
        <div className="grid gap-8 text-center md:grid-cols-4">
          {stats.map((stat) => (
            <div key={stat.label}>
              <h3 className="text-4xl font-bold">
                {stat.value}
              </h3>

              <p className="mt-2 text-blue-100">
                {stat.label}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}