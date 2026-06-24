"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Shirt, Download, Link2, Eye, X, RefreshCw } from "lucide-react";
import PageHeader from "@/components/admin/ui/PageHeader";
import { TableSkeleton } from "@/components/admin/ui/Skeleton";
import { TodifyService } from "@/services/todify.service";
import { ProductService } from "@/services/product.service";
import type { TodifyTemplate, TodifyTemplateDetail } from "@/types/todify";
import type { Product } from "@/types/product";

export default function TodifyTemplatesPage() {
  const [templates, setTemplates] = useState<TodifyTemplate[]>([]);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [detail, setDetail] = useState<TodifyTemplateDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const [products, setProducts] = useState<Product[]>([]);

  async function load(p = page) {
    setLoading(true);
    setError(null);
    try {
      const res = await TodifyService.listTemplates(p);
      setTemplates(res.data ?? []);
      setLastPage(res.meta?.last_page ?? 1);
    } catch (e) {
      setError(messageOf(e, "Impossible de charger les templates Todify."));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load(page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  useEffect(() => {
    ProductService.getAll(0, 200)
      .then((r) => setProducts(r.content ?? []))
      .catch(() => setProducts([]));
  }, []);

  async function preview(id: string) {
    setDetailLoading(true);
    try {
      const res = await TodifyService.templateDetail(id);
      setDetail(res.data);
    } catch (e) {
      setNotice(messageOf(e, "Échec du chargement des détails."));
    } finally {
      setDetailLoading(false);
    }
  }

  async function importTemplate(id: string) {
    setBusy(id);
    setNotice(null);
    try {
      await TodifyService.importTemplate(id);
      setNotice("Template importé comme produit brouillon (DRAFT).");
      const r = await ProductService.getAll(0, 200);
      setProducts(r.content ?? []);
    } catch (e) {
      setNotice(messageOf(e, "Échec de l'import."));
    } finally {
      setBusy(null);
    }
  }

  async function linkToProduct(templateId: string, productId: number) {
    if (!productId) return;
    setBusy(templateId);
    try {
      await TodifyService.linkProduct(productId, templateId);
      setNotice("Template lié au produit.");
    } catch (e) {
      setNotice(messageOf(e, "Échec de la liaison."));
    } finally {
      setBusy(null);
    }
  }

  return (
    <div>
      <PageHeader
        title="Templates Todify"
        subtitle="Importez les templates print-on-demand et liez-les à vos produits."
      />

      <div className="mb-4 flex items-center gap-2">
        <button
          onClick={() => load(page)}
          className="inline-flex items-center gap-2 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          <RefreshCw size={15} /> Actualiser
        </button>
      </div>

      {notice && (
        <div className="mb-4 rounded-md border border-blue-200 bg-blue-50 p-3 text-sm text-blue-700">
          {notice}
        </div>
      )}
      {error && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-600">
          {error}
        </div>
      )}

      {loading ? (
        <TableSkeleton />
      ) : templates.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-12 text-center">
          <Shirt className="mx-auto mb-3 text-gray-300" size={40} />
          <p className="text-sm text-gray-500">Aucun template trouvé.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {templates.map((t) => {
            const linkedProduct = products.find((p) => p.todifyTemplateId === t.id);
            return (
              <div
                key={t.id}
                className="flex flex-col rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
              >
                <div className="mb-3 flex items-center gap-3">
                  <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-gray-100">
                    {t.thumbnail ? (
                      <Image
                        src={t.thumbnail}
                        alt={t.name}
                        fill
                        className="object-cover"
                        sizes="64px"
                        unoptimized
                      />
                    ) : (
                      <Shirt className="m-auto mt-5 text-gray-300" size={24} />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-gray-800">{t.name}</p>
                    <p className="truncate text-xs text-gray-400">{t.sku || t.id}</p>
                    {linkedProduct && (
                      <span className="mt-1 inline-block rounded-full bg-green-100 px-2 py-0.5 text-[11px] font-medium text-green-700">
                        Lié à #{linkedProduct.id}
                      </span>
                    )}
                  </div>
                </div>

                <div className="mt-auto flex flex-wrap gap-2">
                  <button
                    onClick={() => preview(t.id)}
                    className="inline-flex items-center gap-1.5 rounded-md border border-gray-300 px-2.5 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
                  >
                    <Eye size={14} /> Aperçu
                  </button>
                  <button
                    disabled={busy === t.id}
                    onClick={() => importTemplate(t.id)}
                    className="inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                  >
                    <Download size={14} /> Importer
                  </button>
                </div>

                <div className="mt-2 flex items-center gap-1.5">
                  <Link2 size={14} className="text-gray-400" />
                  <select
                    defaultValue=""
                    disabled={busy === t.id}
                    onChange={(e) => linkToProduct(t.id, Number(e.target.value))}
                    className="w-full rounded-md border border-gray-300 bg-white px-2 py-1 text-xs text-gray-600 outline-none focus:border-blue-500"
                  >
                    <option value="">Lier à un produit existant…</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        #{p.id} — {p.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {lastPage > 1 && (
        <div className="mt-5 flex items-center justify-center gap-2">
          <button
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm disabled:opacity-40"
          >
            Précédent
          </button>
          <span className="text-sm text-gray-500">
            Page {page} / {lastPage}
          </span>
          <button
            disabled={page >= lastPage}
            onClick={() => setPage((p) => Math.min(lastPage, p + 1))}
            className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm disabled:opacity-40"
          >
            Suivant
          </button>
        </div>
      )}

      {/* Detail modal */}
      {(detail || detailLoading) && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setDetail(null)}
        >
          <div
            className="max-h-[80vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-800">
                {detailLoading ? "Chargement…" : detail?.name}
              </h3>
              <button onClick={() => setDetail(null)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>
            {detail && (
              <div className="space-y-4 text-sm">
                {detail.attributes && (
                  <div>
                    <p className="mb-1 font-medium text-gray-700">Attributs</p>
                    {Object.entries(detail.attributes).map(([name, values]) => (
                      <div key={name} className="mb-1">
                        <span className="text-gray-500">{name}: </span>
                        <span className="text-gray-800">
                          {Object.values(values).join(", ")}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
                {detail.variants && detail.variants.length > 0 && (
                  <div>
                    <p className="mb-1 font-medium text-gray-700">
                      Variantes ({detail.variants.length})
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {detail.variants.slice(0, 30).map((v, i) => (
                        <span
                          key={i}
                          className="rounded-md bg-gray-100 px-2 py-0.5 text-xs text-gray-600"
                        >
                          {Object.values(v.variant).join(" / ")}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function messageOf(e: unknown, fallback: string): string {
  const resp = (e as { response?: { data?: { message?: string } } })?.response;
  return resp?.data?.message || fallback;
}
