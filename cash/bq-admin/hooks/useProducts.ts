import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../../../api/client";

export type Product = {
  id: number;
  name: string;
  description: string;
  price: number;
  status?: string | null;
  selectedValues?: { id: number; value: string }[];
  images?: { id: number; fileName: string; url: string }[];
};

export function useProducts(page = 1, perPage = 20) {
  return useQuery({
    queryKey: ["products", { page, perPage }],
    queryFn: async () => {
      const { data, headers } = await api.get<Product[]>("/products", {
        params: { page, perPage },
      });

      const contentRange = headers["content-range"]; // "products 0-4/5"
      let total = 0;
      if (contentRange) {
        const [, range] = contentRange.split(" ");
        const [, totalStr] = range.split("/");
        total = parseInt(totalStr, 10);
      }

      return { items: data, total };
    },
    placeholderData: (prev) => prev,
  });
}

export function useProduct(productId: string | undefined) {
  return useQuery({
    queryKey: ["product", productId],
    queryFn: async () => {
      if (!productId) throw new Error("No product id");
      const { data } = await api.get<Product>(`/products/${productId}`);
      return data;
    },
    enabled: !!productId,
  });
}

export function useUpdateProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<Product> }) =>
      api.put(`/products/${id}`, payload),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["product", vars.id] });
      qc.invalidateQueries({ queryKey: ["products"] });
    },
  });
}
