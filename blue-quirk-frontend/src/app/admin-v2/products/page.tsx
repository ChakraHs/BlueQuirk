"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { ProductService } from "@/services/product.service";
import { Product } from "@/types/product";
import { PageResponse } from "@/types/page";

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);


  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const res: PageResponse<Product> = await ProductService.getAll();
      setProducts(res.content);
    } catch {
      setError("Failed to load products");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProducts();
    const msg = sessionStorage.getItem("success");
    if (msg) {
      setSuccess(msg);
      sessionStorage.removeItem("success");
    }
  }, [fetchProducts]);

  const handleDelete = async (id: number) => {
    try {
      await ProductService.delete(id);
      setProducts((prev) => prev.filter((p) => p.id !== id));
    } catch {
      setError("Failed to delete product");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        Loading products...
      </div>
    );
  }

  if (error) {
    return (
      <div className="m-4 p-3 rounded bg-red-50 text-red-600 border border-red-200">
        {error}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-gray-800">
          Products
        </h1>

        <Link
          href="/admin-v2/products/new"
          className="bg-gray-900 hover:bg-black text-white px-4 py-2 rounded-md transition"
        >
          + Add Product
        </Link>
      </div>


      {success && (
        <div className="mb-4 p-3 rounded bg-green-50 text-green-700 border border-green-200">
          {success}
        </div>
      )}
      
      {/* Table Card */}
      <div className="bg-white shadow-md rounded-lg overflow-hidden border border-gray-200">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-600 uppercase text-xs tracking-wider">
            <tr>
              <th className="p-4 text-left">Name</th>
              <th className="p-4 text-left">Price</th>
              <th className="p-4 text-left">Status</th>
              <th className="p-4 text-right">Actions</th>
            </tr>
          </thead>

          <tbody className="text-gray-700">
            {products.length === 0 ? (
              <tr>
                <td
                  colSpan={4}
                  className="p-6 text-center text-gray-500"
                >
                  No products found
                </td>
              </tr>
            ) : (
              products.map((p) => (
                <tr
                  key={p.id}
                  className="border-t hover:bg-gray-50 transition"
                >
                  <td className="p-4 font-medium text-gray-800">
                    {p.name}
                  </td>

                  <td className="p-4 text-gray-600">
                    ${p.price}
                  </td>

                  <td className="p-4">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${
                        p.status === "ACTIVE"
                          ? "bg-green-100 text-green-700"
                          : "bg-yellow-100 text-yellow-700"
                      }`}
                    >
                      {p.status}
                    </span>
                  </td>

                  <td className="p-4 text-right space-x-3">
                    <Link
                      href={`/admin/products/${p.id}`}
                      className="text-blue-600 hover:text-blue-800 font-medium"
                    >
                      Edit
                    </Link>

                    <button
                      onClick={() => handleDelete(p.id)}
                      className="text-red-600 hover:text-red-800 font-medium"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}