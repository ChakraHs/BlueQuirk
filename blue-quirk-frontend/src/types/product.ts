export interface Product {
  id: number;
  name: string;
  price: number;
  description: string;
  // Materials / composition (e.g. "100% Cotton"). Shown in the storefront
  // "Product Highlights" and editable from the admin product form.
  material?: string;
  quantity?: number;
  stockQuantity?: number;
  status: string;

  images?: ProductImage[];

  // Optional featured video. Present only when the product actually has one, so
  // products without a video behave exactly as before.
  video?: ProductVideo | null;

  categories?: {
    id: number;
    name: string;
  }[];

  attributes?: ProductAttribute[];

  translations?: ProductTranslation[];

  // --- Todify link (null/false for normal local products) ---
  todifyTemplateId?: string | null;
  syncedFromTodify?: boolean;
}

/**
 * Admin-only product view returned by /api/admin/products. Includes the
 * confidential purchase `cost` and derived margins — never comes from the
 * public storefront endpoints.
 */
export interface AdminProduct {
  id: number;
  name: string;
  price: number;
  cost: number;
  grossMargin: number; // price − cost, in DH
  grossMarginPercent: number; // (price − cost) / price
  stockQuantity?: number;
  status: string;
  images?: ProductImage[];
}

export interface ProductImage {
  id: number;
  // Legacy single URL. Still sent by the backend (points at the display variant
  // for new images) and used as the fallback for the variant fields below.
  url: string;
  // Optimized variants generated automatically on upload. The backend always
  // populates these (falling back to `url` for pre-migration images), so the
  // frontend can rely on them. Use the helpers in lib/productImage.ts to pick
  // the right one per surface and never download more than needed.
  thumbnailUrl?: string; // ~400px — cards, listings, search, wishlist, cart
  displayUrl?: string; // ~1200px — product page, gallery, hover zoom
  originalUrl?: string; // full-res — fullscreen/deep zoom only, on demand
  fileName?: string;
  primary?: boolean;
  sortOrder?: number;
  // Id of the COLOR AttributeValue this image belongs to; null/undefined = generic.
  colorValueId?: number | null;
}

/**
 * One optional featured product video (MP4/H.264 hosted on Cloudflare R2). The
 * poster is loaded first; the heavy MP4 is only requested when the video slide
 * becomes active (see ProductGallery). All fields but videoUrl are optional.
 */
export interface ProductVideo {
  videoUrl: string;
  posterImageUrl?: string | null;
  duration?: number | null; // seconds
  fileSize?: number | null; // bytes
}

export interface ProductAttribute {
  id: number;
  name: string;
  // Backend AttributeType, e.g. "COLOR", "SIZE". Used to find the color attribute.
  type?: string;
  values: {
    id: number;
    value: string;
    selected?: boolean;
  }[];
}

export interface ProductTranslation {
  id?: number;
  lang: string;
  name: string;
  description: string;
}
