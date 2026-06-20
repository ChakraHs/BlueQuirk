"use client";

import Link from "next/link";
import { JSXElementConstructor, Key, ReactElement, ReactNode, ReactPortal, useState } from "react";
import { useProducts } from "../hooks/useProducts";

export default function ProductsListPage() {
  const [page, setPage] = useState(1);
  const { data, isLoading, isError } = useProducts(page, 20);

  if (isLoading) return <div>Loading...</div>;
  if (isError) return <div>Failed to load products.</div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-xl font-semibold">Products</h1>
        <Link
          href="/bq-admin/products/new"
          className="bg-blue-600 text-white px-3 py-2 rounded"
        >
          New Product
        </Link>
      </div>

      <table className="w-full border border-gray-200">
        <thead className="bg-gray-100">
          <tr>
            <th className="p-2 text-left">Name</th>
            <th className="p-2 text-left">Price</th>
            <th className="p-2 text-left">Selected Values</th>
            <th className="p-2 text-left">Images</th>
            <th className="p-2 text-left">Actions</th>
          </tr>
        </thead>
        <tbody>
          {data?.items?.map((p: { id: Key | null | undefined; name: string | number | bigint | boolean | ReactElement<unknown, string | JSXElementConstructor<any>> | Iterable<ReactNode> | ReactPortal | Promise<string | number | bigint | boolean | ReactPortal | ReactElement<unknown, string | JSXElementConstructor<any>> | Iterable<ReactNode> | null | undefined> | null | undefined; price: number; selectedValues: any[]; images: { id: Key | null | undefined; url: string | Blob | undefined; fileName: string | undefined; }[]; }) => (
            <tr key={p.id} className="border-t">
              <td className="p-2">{p.name}</td>
              <td className="p-2">${p.price.toFixed(2)}</td>
              <td className="p-2">
                {p.selectedValues?.map((v) => v.value).join(", ")}
              </td>
              <td className="p-2 flex gap-2">
                {p.images?.map((img: { id: Key | null | undefined; url: string | Blob | undefined; fileName: string | undefined; }) => (
                  <img
                    key={img.id}
                    src={img.url}
                    alt={img.fileName}
                    className="w-12 h-12 object-cover rounded"
                  />
                ))}
              </td>
              <td className="p-2">
                <Link
                  href={`/bq-admin/products/${p.id}`}
                  className="text-blue-600 hover:underline"
                >
                  Edit
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-4 flex gap-2">
        <button
          disabled={page === 1}
          onClick={() => setPage((p) => p - 1)}
          className="px-3 py-1 border rounded disabled:opacity-50"
        >
          Prev
        </button>
        <button
          onClick={() => setPage((p) => p + 1)}
          className="px-3 py-1 border rounded"
        >
          Next
        </button>
      </div>
    </div>
  );
}
