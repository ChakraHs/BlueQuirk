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
  url: string;
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
