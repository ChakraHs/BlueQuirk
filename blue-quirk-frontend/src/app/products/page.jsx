"use client";

import { useQuery } from "@tanstack/react-query";
import { getProducts } from "../../api/blueQuirkApi";

export default function ProductsPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['products'],
    queryFn: getProducts,
  });

  if (isLoading) return <p>Loading...</p>;
  if (error) return <p>Error fetching products</p>;

  return (
    <div>
      <h1>Products</h1>
      <ul>
        {data?.map(product => (
          <li key={product.id}>{product.name}</li>
        ))}
      </ul>
    </div>
  );
}
