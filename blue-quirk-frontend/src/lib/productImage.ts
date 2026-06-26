// Helpers for picking the right product-image variant per surface, so each page
// downloads only what it needs (see the image-optimization design):
//
//   thumb   -> home, collections, categories, search, recommendations,
//              wishlist, cart  (~400px)
//   display -> product page, gallery, hover magnifier  (~1200px)
//   original-> fullscreen / deep zoom only, on demand  (full-res)
//
// Every getter falls back gracefully (thumbnail -> display -> url) so products
// created before the variant pipeline still render.
import type { ProductImage } from "@/types/product";

/** Small image for cards, listings, search, recommendations, wishlist and cart. */
export function thumbSrc(img: ProductImage): string {
  return img.thumbnailUrl || img.displayUrl || img.url;
}

/** Mid-size image for the product page, gallery and hover magnifier. */
export function displaySrc(img: ProductImage): string {
  return img.displayUrl || img.url;
}

/** Full-resolution image — only request for fullscreen / deep zoom. */
export function originalSrc(img: ProductImage): string {
  return img.originalUrl || img.displayUrl || img.url;
}
