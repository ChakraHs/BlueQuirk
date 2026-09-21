export type CategoryTranslation = {
  lang: string; // "fr" | "ar"
  name: string;
  description?: string;
};

export type Category = {
  id: number;
  name: string;
  slug?: string;
  description?: string;
  imageUrl: string;
  parentId?: number | null;
  // Storefront visibility. The public API only ever returns active categories, but
  // Admin receives every category so it can toggle/reactivate them. Optional so older
  // cached payloads without the field are treated as visible.
  active?: boolean;
  translations?: CategoryTranslation[];
  children: Category[];
};