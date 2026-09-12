import type { Category } from "@/types/category";

/**
 * Shared logic for deciding which of a product's (possibly many) categories to
 * show on a product card. A product can belong to several categories — e.g.
 * "Men T-Shirts" *and* "Women T-Shirts" — so the label must depend on the page
 * the shopper is currently browsing, not just the first assigned category.
 *
 * Kept framework-free and pure so it can be reused by every listing surface and
 * unit-tested in isolation. The route-aware wiring lives in
 * components/CategoryTreeProvider.
 */

export type CategoryRef = { id: number; name: string };

export type CategoryContext = {
  /**
   * Category ids that describe the current browsing scope, ordered from
   * MOST specific (the current page / deepest leaf) to LEAST specific
   * (its ancestors). The product category matching the earliest id wins, so a
   * product shown under "Men" surfaces "Men T-Shirts" rather than plain "Men".
   */
  activeCategoryIds?: number[];
  /** id -> depth in the tree (roots = 0). Powers the most-specific fallback. */
  categoryDepths?: Map<number, number>;
};

/**
 * Pick the single category to display for a product, given the current page
 * context. Priority:
 *   1. The product category that best matches the page being browsed
 *      (most-specific first).
 *   2. Otherwise the most specific (deepest) category we recognise.
 *   3. Otherwise the first assigned category.
 */
export function pickDisplayCategory(
  categories: CategoryRef[] | undefined | null,
  ctx: CategoryContext = {},
): CategoryRef | undefined {
  if (!categories || categories.length === 0) return undefined;

  const { activeCategoryIds, categoryDepths } = ctx;

  // 1) Page-relevant match — activeCategoryIds is ordered deepest→shallowest,
  //    so a leaf such as "Men T-Shirts" beats its "Men" parent.
  if (activeCategoryIds && activeCategoryIds.length > 0) {
    for (const id of activeCategoryIds) {
      const match = categories.find((c) => c.id === id);
      if (match) return match;
    }
  }

  // 2) Fallback for non-category pages (home, search, trending, related…):
  //    the deepest category we know from the tree. Ties keep the first
  //    assigned category (stable, backend-defined order).
  if (categoryDepths && categoryDepths.size > 0) {
    let best: CategoryRef | undefined;
    let bestDepth = -1;
    for (const c of categories) {
      const depth = categoryDepths.get(c.id);
      if (depth !== undefined && depth > bestDepth) {
        best = c;
        bestDepth = depth;
      }
    }
    if (best) return best;
  }

  // 3) Last resort — the first assigned category.
  return categories[0];
}

/**
 * Build the category breadcrumb path for a product — ordered from the BROADEST
 * (root) category down to the MOST SPECIFIC one the product belongs to. Ancestors
 * are resolved from the category tree, so the full path shows even when the product
 * is only assigned to a leaf category (e.g. root "Femme" → "T-shirts" → "Floral").
 * Falls back to the product's first assigned category alone if the tree is missing.
 */
export function buildCategoryPath(
  tree: Category[] | undefined | null,
  productCategories: CategoryRef[] | undefined | null,
): CategoryRef[] {
  if (!productCategories || productCategories.length === 0) return [];

  // Flatten the tree: id -> { name, parentId, depth }.
  const byId = new Map<number, { name: string; parentId: number | null; depth: number }>();
  const walk = (node: Category, parentId: number | null, depth: number) => {
    byId.set(node.id, { name: node.name, parentId, depth });
    for (const child of node.children ?? []) walk(child, node.id, depth + 1);
  };
  for (const root of tree ?? []) walk(root, null, 0);

  // Anchor on the product's DEEPEST category that exists in the tree.
  let leafId: number | null = null;
  let leafDepth = -1;
  for (const c of productCategories) {
    const info = byId.get(c.id);
    if (info && info.depth > leafDepth) {
      leafDepth = info.depth;
      leafId = c.id;
    }
  }
  if (leafId == null) return [productCategories[0]]; // tree unavailable → single crumb

  // Climb to the root, then reverse to get root → leaf.
  const path: CategoryRef[] = [];
  const seen = new Set<number>();
  let cur: number | null = leafId;
  while (cur != null && byId.has(cur) && !seen.has(cur)) {
    seen.add(cur);
    const info = byId.get(cur)!;
    path.push({ id: cur, name: info.name });
    cur = info.parentId;
  }
  return path.reverse();
}

export type CategoryTreeIndex = {
  /** categoryId -> depth in the tree (roots = 0). */
  depths: Map<number, number>;
  /** categoryId -> that category plus all descendants, ordered deepest-first. */
  subtree: Map<number, number[]>;
};

/**
 * Precompute depth and subtree lookups for a category forest (roots with nested
 * `children`). Done once per tree; consumed cheaply per product card.
 */
export function indexCategoryTree(
  tree: Category[] | undefined | null,
): CategoryTreeIndex {
  const depths = new Map<number, number>();
  const subtree = new Map<number, number[]>();

  const collect = (
    node: Category,
    depth: number,
  ): { id: number; depth: number }[] => {
    depths.set(node.id, depth);
    let acc: { id: number; depth: number }[] = [{ id: node.id, depth }];
    for (const child of node.children ?? []) {
      acc = acc.concat(collect(child, depth + 1));
    }
    subtree.set(
      node.id,
      [...acc].sort((a, b) => b.depth - a.depth).map((x) => x.id),
    );
    return acc;
  };

  for (const root of tree ?? []) {
    collect(root, 0);
  }

  return { depths, subtree };
}

/** Extract the category id from a storefront path like `/fr/category/42`. */
export function parseCategoryIdFromPath(
  pathname: string | null | undefined,
): number | null {
  if (!pathname) return null;
  const m = pathname.match(/\/category\/(\d+)/);
  return m ? Number(m[1]) : null;
}
