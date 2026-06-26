export interface Product {
  id: number;
  name: string;
  price: number;
  description: string;
  quantity?: number;
  stockQuantity?: number;
  status: string;

  images?: ProductImage[];

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
