// Helpers for the color <-> image association. Shared by the admin image
// manager (offer color options) and the storefront (filter the gallery by the
// selected color). A color is an AttributeValue under the COLOR attribute; an
// image with no colorValueId is "generic" and shown for every color.
import type { ProductImage } from "@/types/product";

export type ColorOption = { id: number; label: string };

// Loose shape both the admin Attribute and the storefront ProductAttribute satisfy.
type AttrLike = {
  name: string;
  type?: string;
  values: { id: number; value: string; selected?: boolean }[];
};

/** The product's COLOR attribute, by type (preferred) or a name match. */
export function findColorAttribute<T extends AttrLike>(attributes?: T[]): T | undefined {
  if (!attributes) return undefined;
  return (
    attributes.find((a) => (a.type || "").toUpperCase() === "COLOR") ||
    attributes.find((a) => /couleur|color/i.test(a.name))
  );
}

/**
 * Color options to link images to: the product's selected colors when any are
 * selected, otherwise every color value (e.g. a brand-new product).
 */
export function colorOptionsFromAttributes(attributes?: AttrLike[]): ColorOption[] {
  const color = findColorAttribute(attributes);
  if (!color) return [];
  const selected = color.values.filter((v) => v.selected);
  const source = selected.length > 0 ? selected : color.values;
  return source.map((v) => ({ id: v.id, label: v.value }));
}

/**
 * The gallery to show for a selected color: that color's images first, then
 * generic (uncolored) images. Falls back to generics when the color has none,
 * and to all images when there are no generics either. Passing no color (null)
 * returns every image in its original order.
 */
export function imagesForColor(
  images: ProductImage[],
  colorValueId: number | null
): ProductImage[] {
  if (colorValueId == null) return images;
  const colorSpecific = images.filter((img) => img.colorValueId === colorValueId);
  const generic = images.filter((img) => img.colorValueId == null);
  const result = [...colorSpecific, ...generic];
  return result.length > 0 ? result : images;
}
