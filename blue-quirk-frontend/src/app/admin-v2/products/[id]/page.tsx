"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2 } from "lucide-react";
import PageHeader from "@/components/admin/ui/PageHeader";
import ProductImageManager from "@/components/admin/ProductImageManager";
import { ProductService } from "@/services/product.service";
import { TodifyService } from "@/services/todify.service";
import { Product, ProductAttribute, ProductImage } from "@/types/product";
import { colorOptionsFromAttributes } from "@/lib/colorImages";

type FormState = {
  name: string;
  price: number;
  stockQuantity: number;
  description: string;
  status: string;
};

export default function EditProductPage() {
  const params = useParams();
  const router = useRouter();
  const id = Number(params.id);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [product, setProduct] = useState<Product | null>(null);
  const [attributes, setAttributes] = useState<ProductAttribute[]>([]);
  const [images, setImages] = useState<ProductImage[]>([]);
  const colorOptions = useMemo(() => colorOptionsFromAttributes(attributes), [attributes]);
  const [form, setForm] = useState<FormState>({
    name: "",
    price: 0,
    stockQuantity: 0,
    description: "",
    status: "PUBLISHED",
  });

  useEffect(() => {
    (async () => {
      try {
        const p = await ProductService.getById(id);
        setProduct(p);
        setForm({
          name: p.name ?? "",
          price: p.price ?? 0,
          stockQuantity: p.stockQuantity ?? 0,
          description: p.description ?? "",
          status: p.status ?? "PUBLISHED",
        });
        setAttributes(p.attributes ?? []);
        setImages(p.images ?? []);
      } catch {
        setError("Produit introuvable.");
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
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
    setSaving(true);
    setError(null);
    try {
      await ProductService.update(id, {
        ...form,
        price: Number(form.price),
        stockQuantity: Number(form.stockQuantity),
        attributes,
        images,
      });
      sessionStorage.setItem("success", "Produit mis à jour");
      router.push("/admin-v2/products");
    } catch {
      setError("Échec de la mise à jour du produit.");
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center text-gray-400">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Chargement…
      </div>
    );
  }

  if (error && !product) {
    return (
      <div>
        <Link
          href="/admin-v2/products"
          className="mb-4 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800"
        >
          <ArrowLeft size={16} /> Retour aux produits
        </Link>
        <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-600">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div>
      <Link
        href="/admin-v2/products"
        className="mb-4 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800"
      >
        <ArrowLeft size={16} /> Retour aux produits
      </Link>

      <PageHeader title="Modifier le produit" subtitle={product?.name} />

      <div className="max-w-3xl rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        {error && (
          <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-600">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Nom
            </label>
            <input
              name="name"
              value={form.name}
              onChange={handleChange}
              required
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 focus:border-black focus:outline-none focus:ring-2 focus:ring-black"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Prix (DH)
              </label>
              <input
                name="price"
                type="number"
                step="0.01"
                value={form.price}
                onChange={handleChange}
                required
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 focus:border-black focus:outline-none focus:ring-2 focus:ring-black"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Stock
              </label>
              <input
                name="stockQuantity"
                type="number"
                min="0"
                value={form.stockQuantity}
                onChange={handleChange}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 focus:border-black focus:outline-none focus:ring-2 focus:ring-black"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Description
            </label>
            <textarea
              name="description"
              value={form.description}
              onChange={handleChange}
              rows={4}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 focus:border-black focus:outline-none focus:ring-2 focus:ring-black"
            />
          </div>

          <ProductImageManager value={images} onChange={setImages} colorOptions={colorOptions} />

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Statut
            </label>
            <select
              name="status"
              value={form.status}
              onChange={handleChange}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 focus:border-black focus:outline-none focus:ring-2 focus:ring-black"
            >
              <option value="DRAFT">DRAFT</option>
              <option value="PUBLISHED">PUBLISHED</option>
              <option value="ARCHIVED">ARCHIVED</option>
            </select>
          </div>

          {attributes.length > 0 && (
            <div className="pt-2">
              <h2 className="mb-3 text-sm font-semibold text-gray-800">
                Attributs
              </h2>
              <div className="space-y-4">
                {attributes.map((attr) => (
                  <div
                    key={attr.id}
                    className="rounded-md border bg-gray-50 p-3"
                  >
                    <div className="mb-2 text-sm font-medium text-gray-700">
                      {attr.name}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {attr.values.map((v) => (
                        <button
                          type="button"
                          key={v.id}
                          onClick={() => toggleValue(attr.id, v.id)}
                          className={`rounded-full border px-3 py-1 text-sm transition ${
                            v.selected
                              ? "border-gray-900 bg-gray-900 text-white"
                              : "border-gray-300 bg-white text-gray-700 hover:border-gray-500"
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
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-md bg-gray-900 px-5 py-2 text-sm font-medium text-white transition hover:bg-black disabled:opacity-60"
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {saving ? "Enregistrement…" : "Enregistrer"}
            </button>
            <Link
              href="/admin-v2/products"
              className="rounded-md border border-gray-300 px-5 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
            >
              Annuler
            </Link>
          </div>
        </form>
      </div>

      <TodifyLinkPanel
        productId={id}
        initialTemplateId={product?.todifyTemplateId ?? null}
        syncedFromTodify={product?.syncedFromTodify ?? false}
      />
    </div>
  );
}

/** Compact panel to link/unlink this product with a Todify template. */
function TodifyLinkPanel({
  productId,
  initialTemplateId,
  syncedFromTodify,
}: {
  productId: number;
  initialTemplateId: string | null;
  syncedFromTodify: boolean;
}) {
  const [templateId, setTemplateId] = useState(initialTemplateId ?? "");
  const [linked, setLinked] = useState<string | null>(initialTemplateId);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function link() {
    if (!templateId.trim()) return;
    setBusy(true);
    setMsg(null);
    try {
      await TodifyService.linkProduct(productId, templateId.trim());
      setLinked(templateId.trim());
      setMsg("Produit lié au template Todify.");
    } catch {
      setMsg("Échec de la liaison.");
    } finally {
      setBusy(false);
    }
  }

  async function unlink() {
    setBusy(true);
    setMsg(null);
    try {
      await TodifyService.unlinkProduct(productId);
      setLinked(null);
      setTemplateId("");
      setMsg("Produit délié de Todify.");
    } catch {
      setMsg("Échec de la suppression du lien.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-6 max-w-3xl rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <h2 className="mb-1 text-sm font-semibold text-gray-800">Intégration Todify</h2>
      <p className="mb-3 text-xs text-gray-500">
        Liez ce produit à un template Todify pour la fabrication à la demande.
        {syncedFromTodify && " Ce produit a été importé depuis Todify."}
      </p>

      {linked ? (
        <div className="flex flex-wrap items-center gap-3">
          <span className="rounded-full bg-green-100 px-2.5 py-1 text-xs font-medium text-green-700">
            Lié : {linked}
          </span>
          <button
            disabled={busy}
            onClick={unlink}
            className="rounded-md border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
          >
            Délier
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            value={templateId}
            onChange={(e) => setTemplateId(e.target.value)}
            placeholder="ID du template Todify"
            className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
          />
          <button
            disabled={busy || !templateId.trim()}
            onClick={link}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            Lier
          </button>
        </div>
      )}

      {msg && <p className="mt-2 text-xs text-gray-500">{msg}</p>}
    </div>
  );
}
