export type PageResponse<T> = {
  content: T[];
  number: number; // current page index
  size: number;
  totalElements: number;
  totalPages: number;
};