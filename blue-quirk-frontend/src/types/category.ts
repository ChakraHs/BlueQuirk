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
  translations?: CategoryTranslation[];
  children: Category[];
};