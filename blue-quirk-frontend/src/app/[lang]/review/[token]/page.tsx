"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Star, Loader2, Check, ImagePlus, X } from "lucide-react";
import { t } from "@/lib/i18n";
import { track } from "@/lib/analytics/tracker";
import {
  fetchTokenInfo,
  submitReview,
  uploadReviewPhoto,
  type ReviewTokenInfo,
} from "@/services/review.service";

/**
 * Token-gated review submission. There is deliberately no open review form: the
 * page is reachable only via the single-use link a delivered order produces. It
 * validates the token server-side (products to review, redeemability), collects a
 * genuine review, and shows a "pending approval" thank-you. No token / bad token →
 * a friendly not-found, never a blank form.
 */
export default function ReviewSubmitPage() {
  const params = useParams<{ lang: string; token: string }>();
  const lang = params?.lang ?? "fr";
  const token = params?.token ?? "";

  const [info, setInfo] = useState<ReviewTokenInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [done, setDone] = useState(false);

  useEffect(() => {
    let alive = true;
    fetchTokenInfo(token)
      .then((data) => {
        if (!alive) return;
        setInfo(data);
        if (data.valid) track("review_submission_started", {});
      })
      .catch(() => alive && setInfo({ valid: false, orderNumber: null, products: [] }))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [token]);

  if (loading) {
    return (
      <main className="mx-auto flex min-h-[60vh] max-w-lg items-center justify-center px-6">
        <Loader2 className="size-6 animate-spin text-gray-400" />
      </main>
    );
  }

  if (!info?.valid) {
    return (
      <main className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center gap-3 px-6 text-center">
        <h1 className="text-xl font-semibold text-gray-900">{t(lang, "review.submit.invalidTitle")}</h1>
        <p className="text-sm text-gray-500">{t(lang, "review.submit.invalidBody")}</p>
        <Link href={`/${lang}`} className="mt-2 text-sm font-medium text-blue-600 hover:underline">
          {t(lang, "cart.continue")}
        </Link>
      </main>
    );
  }

  if (done) {
    return (
      <main className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center gap-3 px-6 text-center">
        <span className="flex size-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
          <Check className="size-7" />
        </span>
        <h1 className="text-xl font-semibold text-gray-900">{t(lang, "review.submit.successTitle")}</h1>
        <p className="text-sm text-gray-500">{t(lang, "review.submit.successBody")}</p>
        <Link href={`/${lang}`} className="mt-2 text-sm font-medium text-blue-600 hover:underline">
          {t(lang, "cart.continue")}
        </Link>
      </main>
    );
  }

  return <ReviewForm lang={lang} token={token} info={info} onDone={() => setDone(true)} />;
}

function ReviewForm({
  lang,
  token,
  info,
  onDone,
}: {
  lang: string;
  token: string;
  info: ReviewTokenInfo;
  onDone: () => void;
}) {
  const [productId, setProductId] = useState<number>(info.products[0]?.productId ?? 0);
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [name, setName] = useState("");
  const [size, setSize] = useState("");
  const [color, setColor] = useState("");
  const [photo, setPhoto] = useState<{ url: string; thumbnailUrl: string } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const optional = t(lang, "review.submit.optional");
  const canSubmit = rating >= 1 && body.trim().length > 0 && name.trim().length > 0 && !submitting;

  const chosenProduct = useMemo(
    () => info.products.find((p) => p.productId === productId),
    [info.products, productId]
  );

  const handlePhoto = async (file: File) => {
    setUploading(true);
    setError(null);
    try {
      const res = await uploadReviewPhoto(token, file);
      setPhoto(res);
    } catch {
      setError(t(lang, "review.submit.error"));
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async () => {
    if (rating < 1) {
      setError(t(lang, "review.submit.ratingRequired"));
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await submitReview({
        token,
        productId,
        rating,
        title: title.trim() || undefined,
        body: body.trim(),
        authorName: name.trim(),
        sizePurchased: size.trim() || undefined,
        variantColor: color.trim() || undefined,
        photoUrl: photo?.url,
        photoThumbnailUrl: photo?.thumbnailUrl,
        lang,
      });
      track("review_submitted", { productId });
      onDone();
    } catch {
      setError(t(lang, "review.submit.error"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="mx-auto max-w-lg px-6 py-10">
      <h1 className="text-2xl font-semibold text-gray-900">{t(lang, "review.submit.title")}</h1>
      <p className="mt-1 text-sm text-gray-500">{t(lang, "review.submit.subtitle")}</p>

      <div className="mt-8 space-y-6">
        {/* Product picker (only when the order had more than one product) */}
        {info.products.length > 1 && (
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              {t(lang, "review.submit.chooseProduct")}
            </label>
            <div className="space-y-2">
              {info.products.map((p) => (
                <button
                  key={p.productId}
                  type="button"
                  onClick={() => setProductId(p.productId)}
                  className={`flex w-full items-center gap-3 rounded-xl border p-2.5 text-left transition ${
                    productId === p.productId
                      ? "border-blue-600 ring-1 ring-blue-600"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  {p.imageUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.imageUrl} alt="" className="size-12 rounded-lg object-cover" />
                  )}
                  <span className="text-sm font-medium text-gray-800">{p.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}
        {info.products.length === 1 && chosenProduct && (
          <div className="flex items-center gap-3 rounded-xl border border-gray-200 p-2.5">
            {chosenProduct.imageUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={chosenProduct.imageUrl} alt="" className="size-12 rounded-lg object-cover" />
            )}
            <span className="text-sm font-medium text-gray-800">{chosenProduct.name}</span>
          </div>
        )}

        {/* Star picker */}
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">
            {t(lang, "review.submit.rating")}
          </label>
          <div className="flex gap-1" onMouseLeave={() => setHover(0)}>
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setRating(n)}
                onMouseEnter={() => setHover(n)}
                aria-label={`${n}`}
                className="p-0.5"
              >
                <Star
                  className={`size-8 transition ${
                    (hover || rating) >= n ? "fill-amber-400 text-amber-400" : "text-gray-300"
                  }`}
                />
              </button>
            ))}
          </div>
        </div>

        {/* Title */}
        <Field label={`${t(lang, "review.submit.titleLabel")} (${optional})`}>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={140}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          />
        </Field>

        {/* Body */}
        <Field label={t(lang, "review.submit.bodyLabel")}>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={4}
            maxLength={2000}
            placeholder={t(lang, "review.submit.bodyPlaceholder")}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          />
        </Field>

        {/* Name */}
        <Field label={t(lang, "review.submit.nameLabel")}>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={120}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          />
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label={`${t(lang, "review.submit.sizeLabel")} (${optional})`}>
            <input
              value={size}
              onChange={(e) => setSize(e.target.value)}
              maxLength={40}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
          </Field>
          <Field label={`${t(lang, "review.submit.colorLabel")} (${optional})`}>
            <input
              value={color}
              onChange={(e) => setColor(e.target.value)}
              maxLength={60}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
          </Field>
        </div>

        {/* Optional photo */}
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">
            {t(lang, "review.submit.photoLabel")} ({optional})
          </label>
          {photo ? (
            <div className="relative inline-block">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photo.thumbnailUrl} alt="" className="size-24 rounded-xl object-cover" />
              <button
                type="button"
                onClick={() => setPhoto(null)}
                aria-label={t(lang, "reviews.close")}
                className="absolute -right-2 -top-2 rounded-full bg-gray-900 p-1 text-white"
              >
                <X className="size-3.5" />
              </button>
            </div>
          ) : (
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-gray-300 px-4 py-3 text-sm text-gray-600 transition hover:border-gray-400">
              {uploading ? <Loader2 className="size-4 animate-spin" /> : <ImagePlus className="size-4" />}
              {t(lang, "review.submit.photoHint")}
              <input
                type="file"
                accept="image/*"
                hidden
                onChange={(e) => {
                  if (e.target.files?.[0]) handlePhoto(e.target.files[0]);
                  e.target.value = "";
                }}
              />
            </label>
          )}
        </div>

        {error && <p className="text-sm text-rose-600">{error}</p>}

        <button
          type="button"
          onClick={handleSubmit}
          disabled={!canSubmit}
          className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-primary px-5 text-sm font-semibold text-white transition hover:bg-primary-hover disabled:cursor-not-allowed disabled:bg-gray-300"
        >
          {submitting && <Loader2 className="size-4 animate-spin" />}
          {submitting ? t(lang, "review.submit.submitting") : t(lang, "review.submit.submit")}
        </button>
      </div>
    </main>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-gray-700">{label}</label>
      {children}
    </div>
  );
}
