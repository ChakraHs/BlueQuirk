"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { useProduct, useUpdateProduct } from "../../hooks/useProducts";

type FormValues = {
  name: string;
  description: string;
  price: number;
};

export default function ProductEditPage() {
  const { id } = useParams<{ id: string }>();
  const { data, isLoading } = useProduct(id);
  const update = useUpdateProduct();
  const router = useRouter();

  const { register, handleSubmit, reset } = useForm<FormValues>();

  useEffect(() => {
    if (data) {
      reset({
        name: data.name,
        description: data.description,
        price: data.price,
      });
    }
  }, [data, reset]);

  const onSubmit = (values: FormValues) => {
    update.mutate(
      { id, payload: values },
      { onSuccess: () => router.push("/bq-admin/products") }
    );
  };

  if (isLoading) return <div>Loading...</div>;
  if (!data) return <div>Product not found</div>;

  return (
    <div>
      <h1 className="text-xl mb-4">Edit Product</h1>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="block mb-1">Name</label>
          <input
            {...register("name", { required: true })}
            className="border p-2 w-full rounded"
          />
        </div>
        <div>
          <label className="block mb-1">Description</label>
          <textarea
            {...register("description")}
            className="border p-2 w-full rounded"
          />
        </div>
        <div>
          <label className="block mb-1">Price</label>
          <input
            type="number"
            step="0.01"
            {...register("price", { required: true, valueAsNumber: true })}
            className="border p-2 w-full rounded"
          />
        </div>
        <button
          type="submit"
          className="bg-blue-600 text-white px-4 py-2 rounded"
          disabled={update.isPending}
        >
          {update.isPending ? "Saving..." : "Save"}
        </button>
      </form>
    </div>
  );
}
