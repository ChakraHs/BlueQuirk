export type Category = {
  id: number;
  name: string;
  description?: string;
  imageUrl: string;
  parentId?: number | null;
  children: Category[];
};