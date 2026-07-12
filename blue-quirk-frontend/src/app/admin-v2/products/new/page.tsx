"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ProductService } from "@/services/product.service";
import { AttributeService } from "@/services/attribute.service";
import { Attribute } from "@/types/attribute";
import { ProductImage } from "@/types/product";
import ProductImageManager from "@/components/admin/ProductImageManager";
import PricingFields from "@/components/admin/PricingFields";
import { colorOptionsFromAttributes } from "@/lib/colorImages";
import ProductTranslationsEditor, {
  TranslationDrafts,
  emptyTranslationDrafts,
  draftsToPayload,
} from "@/components/admin/ProductTranslationsEditor";

export default function NewProductPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [attributes, setAttributes] = useState<Attribute[]>([]);
  const [images, setImages] = useState<ProductImage[]>([]);

  // Colors the admin can link images to (the product's selected colors, or all
  // color values before any selection).
  const colorOptions = useMemo(() => colorOptionsFromAttributes(attributes), [attributes]);

  const [form, setForm] = useState({
    name: "",
    price: 0,
    cost: 0,
    stockQuantity: 0,
    description: "",
    material: "100% Cotton",
    status: "PUBLISHED",
  });
  const [translations, setTranslations] = useState<TranslationDrafts>(
    emptyTranslationDrafts()
  );

  useEffect(() => {
    AttributeService.getAll().then((data) => {
      setAttributes(
        data.map((attr) => ({
          ...attr,
          values: attr.values.map((v) => ({
            ...v,
            selected: false,
          })),
        }))
      );
    });
  }, []);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const toggleValue = (attrId: number, valueId: number) => {
    setAttributes((prev) =>
      prev.map((attr) =>
        attr.id === attrId
          ? {
              ...attr,
              values: attr.values.map((v) =>
                v.id === valueId ? { ...v, selected: !v.selected } : v
              ),
            }
          : attr
      )
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setLoading(true);

      await ProductService.create({
        ...form,
        price: Number(form.price),
        cost: Number(form.cost),
        stockQuantity: Number(form.stockQuantity),
        attributes,
        images,
        translations: draftsToPayload(translations),
      });

      sessionStorage.setItem("success", "Product created successfully");
      router.push("/admin-v2/products");
    } catch {
      alert("Failed to create product");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      {/* Page Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-gray-800">
          Create Product
        </h1>
      </div>

      {/* Form Card */}
      <div className="max-w-3xl mx-auto bg-white shadow-md rounded-lg border border-gray-200 p-6">

        <form onSubmit={handleSubmit} className="space-y-5">

          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Name
            </label>
            <input
              name="name"
              placeholder="Product name"
              onChange={handleChange}
              required
              className="w-full border border-gray-300 rounded-md px-3 py-2
                         text-gray-900 placeholder-gray-400
                         focus:outline-none focus:ring-2 focus:ring-black focus:border-black"
            />
          </div>

          {/* Pricing (cost + selling price + live margin) */}
          <PricingFields
            cost={form.cost}
            price={form.price}
            onCostChange={(cost) => setForm((f) => ({ ...f, cost }))}
            onPriceChange={(price) => setForm((f) => ({ ...f, price }))}
          />

          {/* Stock */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Stock
            </label>
            <input
              name="stockQuantity"
              type="number"
              min="0"
              placeholder="0"
              value={form.stockQuantity}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded-md px-3 py-2
                         text-gray-900
                         focus:outline-none focus:ring-2 focus:ring-black focus:border-black"
            />
          </div>

          {/* Materials / composition */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Materials
            </label>
            <input
              name="material"
              placeholder="e.g. 100% Cotton"
              value={form.material}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded-md px-3 py-2
                         text-gray-900 placeholder-gray-400
                         focus:outline-none focus:ring-2 focus:ring-black focus:border-black"
            />
            <p className="mt-1 text-xs text-gray-400">
              Shown in the product highlights (composition). Defaults to 100% Cotton.
            </p>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              name="description"
              placeholder="Write product description..."
              onChange={handleChange}
              className="w-full border border-gray-300 rounded-md px-3 py-2
                         text-gray-900 placeholder-gray-400
                         focus:outline-none focus:ring-2 focus:ring-black focus:border-black"
            />
          </div>

          {/* Images */}
          <div className="pt-2">
            <ProductImageManager value={images} onChange={setImages} colorOptions={colorOptions} />
          </div>

          {/* Translations (fr / en / ar) */}
          <ProductTranslationsEditor value={translations} onChange={setTranslations} />

          {/* Status */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              name="status"
              onChange={handleChange}
              className="w-full border border-gray-300 rounded-md px-3 py-2
                         text-gray-900
                         focus:outline-none focus:ring-2 focus:ring-black focus:border-black"
            >
              <option value="DRAFT">DRAFT</option>
              <option value="PUBLISHED">PUBLISHED</option>
              <option value="ARCHIVED">ARCHIVED</option>
            </select>
          </div>

          {/* ATTRIBUTES */}
          <div className="pt-4">
            <h2 className="text-sm font-semibold text-gray-800 mb-3">
              Attributes
            </h2>

            <div className="space-y-4">
              {attributes.map((attr) => (
                <div key={attr.id} className="bg-gray-50 border rounded-md p-3">
                  
                  <div className="text-sm font-medium text-gray-700 mb-2">
                    {attr.name} <span className="text-gray-400">({attr.type})</span>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {attr.values.map((v) => (
                      <button
                        type="button"
                        key={v.id}
                        onClick={() => toggleValue(attr.id, v.id)}
                        className={`px-3 py-1 rounded-full text-sm border transition
                          ${
                            v.selected
                              ? "bg-gray-900 text-white border-gray-900"
                              : "bg-white text-gray-700 border-gray-300 hover:border-gray-500"
                          }`}
                      >
                        {v.value}
                      </button>
                    ))}
                  </div>

                </div>
              ))}
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gray-900 hover:bg-black text-white py-2 rounded-md transition"
          >
            {loading ? "Creating..." : "Create Product"}
          </button>

        </form>
      </div>
    </div>
  );
}
