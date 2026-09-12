// Review + social-proof API. Reads are public (gated server-side by
// `reviewsEnabled`); writes (submit + photo) require a delivery token. Server-side
// reads use plain fetch (like `getPublicShopConfig`) so the product page can render
// the first page of reviews in SSR for SEO; client-side interactions (load more,
// photos, submission) use the shared axios instance — never a new one.
import api from "@/services/api";
import { API_BASE_URL } from "@/lib/config";

const BASE = `${API_BASE_URL}/shop/reviews`;

export interface ReviewSummary {
  enabled: boolean;
  average: number;
  total: number;
  five: number;
  four: number;
  three: number;
  two: number;
  one: number;
}

export interface ReviewCard {
  id: number;
  rating: number;
  title: string | null;
  body: string;
  authorName: string;
  verifiedPurchase: boolean;
  sizePurchased: string | null;
  variantColor: string | null;
  photoUrl: string | null;
  photoThumbnailUrl: string | null;
  featured: boolean;
  createdAt: string | null;
}

export interface ReviewPage {
  enabled: boolean;
  reviews: ReviewCard[];
  page: number;
  totalPages: number;
  totalElements: number;
  hasMore: boolean;
}

export interface ReviewTokenInfo {
  valid: boolean;
  orderNumber: string | null;
  products: { productId: number; name: string; imageUrl: string | null }[];
}

export interface ReviewSubmission {
  token: string;
  productId: number;
  rating: number;
  body: string;
  // All optional — the form only collects rating + body (+ photo). The author name
  // is derived server-side from the verified order; title/size/color are unused now
  // but kept so an admin/legacy caller could still supply them.
  title?: string;
  authorName?: string;
  sizePurchased?: string;
  variantColor?: string;
  photoUrl?: string;
  photoThumbnailUrl?: string;
  lang?: string;
}

const EMPTY_SUMMARY: ReviewSummary = {
  enabled: false,
  average: 0,
  total: 0,
  five: 0,
  four: 0,
  three: 0,
  two: 0,
  one: 0,
};

const EMPTY_PAGE: ReviewPage = {
  enabled: false,
  reviews: [],
  page: 0,
  totalPages: 0,
  totalElements: 0,
  hasMore: false,
};

// --- server-side (SSR) reads -------------------------------------------------

/** Rating summary for a product. Returns a disabled/empty summary on any failure. */
export async function fetchReviewSummary(productId: number): Promise<ReviewSummary> {
  try {
    const res = await fetch(`${BASE}/product/${productId}/summary`, { cache: "no-store" });
    if (!res.ok) return EMPTY_SUMMARY;
    return (await res.json()) as ReviewSummary;
  } catch {
    return EMPTY_SUMMARY;
  }
}

/** First page of approved reviews for SSR. Empty/disabled on failure. */
export async function fetchReviewPage(productId: number, page = 0): Promise<ReviewPage> {
  try {
    const res = await fetch(`${BASE}/product/${productId}?page=${page}`, { cache: "no-store" });
    if (!res.ok) return EMPTY_PAGE;
    return (await res.json()) as ReviewPage;
  } catch {
    return EMPTY_PAGE;
  }
}

// --- client-side interactions ------------------------------------------------

export async function loadReviewPage(productId: number, page: number): Promise<ReviewPage> {
  const { data } = await api.get<ReviewPage>(`/shop/reviews/product/${productId}`, {
    params: { page },
  });
  return data;
}

export async function fetchReviewPhotos(productId: number, limit = 12): Promise<ReviewPage> {
  const { data } = await api.get<ReviewPage>(`/shop/reviews/product/${productId}/photos`, {
    params: { limit },
  });
  return data;
}

export async function fetchTokenInfo(token: string): Promise<ReviewTokenInfo> {
  const { data } = await api.get<ReviewTokenInfo>(`/shop/reviews/token/${token}`);
  return data;
}

export async function submitReview(payload: ReviewSubmission): Promise<{ status: string }> {
  const { data } = await api.post<{ status: string }>(`/shop/reviews/submit`, payload);
  return data;
}

export async function uploadReviewPhoto(
  token: string,
  file: File
): Promise<{ url: string; thumbnailUrl: string }> {
  const form = new FormData();
  form.append("token", token);
  form.append("file", file);
  const { data } = await api.post<{ url: string; thumbnailUrl: string }>(
    `/shop/reviews/photo`,
    form,
    { headers: { "Content-Type": "multipart/form-data" } }
  );
  return data;
}
