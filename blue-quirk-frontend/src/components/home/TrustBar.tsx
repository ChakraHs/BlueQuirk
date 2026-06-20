const items = [
  {
    title: "All Morocco Shipping",
    desc: "We deliver anywhere in Morocco with reliable partners.",
  },
  {
    title: "Fast Delivery",
    desc: "Choose standard or express shipping at checkout.",
  },
  {
    title: "Secure Payments",
    desc: "Safe checkout with trusted payment methods.",
  },
  {
    title: "24/7 Local Support",
    desc: "Our team is always available to help you.",
  },
];

export default function TrustBar() {
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