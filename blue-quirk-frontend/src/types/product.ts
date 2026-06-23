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
  
}

export interface ProductImage {
  id: number;
  url: string;
  fileName?: string;
  primary?: boolean;
  sortOrder?: number;
}

export interface ProductAttribute {
  id: number;
  name: string;
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
