"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ProductService } from "@/services/product.service";
import { AttributeService } from "@/services/attribute.service";
import { Attribute } from "@/types/attribute";

export default function NewProductPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [attributes, setAttributes] = useState<Attribute[]>([]);

  const [form, setForm] = useState({
    name: "",
    price: 0,
    description: "",
    status: "PUBLISHED",
  });
  const [translations, setTranslations] = useState({
    fr: {
      name: "",
      description: "",
    },
    ar: {
      name: "",
      description: "",
    },
  });

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

  const handleTranslationChange = (
    lang: "fr" | "ar",
    field: "name" | "description",
    value: string
  ) => {
    setTranslations((prev) => ({
      ...prev,
      [lang]: {
        ...prev[lang],
        [field]: value,
      },
    }));
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
        attributes,
        images: [],
        translations: Object.entries(translations)
          .filter(([, value]) => value.name.trim() || value.description.trim())
          .map(([lang, value]) => ({
            lang,
            name: value.name,
            description: value.description,
          })),
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

          {/* Price */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Price
            </label>
            <input
              name="price"
              type="number"
              placeholder="0.00"
              onChange={handleChange}
              required
              className="w-full border border-gray-300 rounded-md px-3 py-2
                         text-gray-900
                         focus:outline-none focus:ring-2 focus:ring-black focus:border-black"
            />
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

          {/* Translations */}
          <div className="pt-4">
            <h2 className="text-sm font-semibold text-gray-800 mb-3">
              Translations
            </h2>

            <div className="grid gap-4 md:grid-cols-2">
              {(["fr", "ar"] as const).map((lang) => (
                <div key={lang} className="bg-gray-50 border rounded-md p-3">
                  <h3 className="mb-3 text-sm font-medium text-gray-700 uppercase">
                    {lang}
                  </h3>

                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Name
                  </label>
                  <input
                    value={translations[lang].name}
                    onChange={(e) =>
                      handleTranslationChange(lang, "name", e.target.value)
                    }
                    placeholder={`${lang.toUpperCase()} product name`}
                    className="mb-3 w-full border border-gray-300 rounded-md px-3 py-2
                              text-gray-900 placeholder-gray-400
                              focus:outline-none focus:ring-2 focus:ring-black focus:border-black"
                  />

                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={translations[lang].description}
                    onChange={(e) =>
                      handleTranslationChange(lang, "description", e.target.value)
                    }
                    placeholder={`${lang.toUpperCase()} product description`}
                    className="w-full border border-gray-300 rounded-md px-3 py-2
                              text-gray-900 placeholder-gray-400
                              focus:outline-none focus:ring-2 focus:ring-black focus:border-black"
                  />
                </div>
              ))}
            </div>
          </div>

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
