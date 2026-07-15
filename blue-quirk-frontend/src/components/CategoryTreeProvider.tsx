"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import type { Category } from "@/types/category";
import {
  indexCategoryTree,
  parseCategoryIdFromPath,
  type CategoryContext,
  type CategoryTreeIndex,
} from "@/lib/productCategory";

const EMPTY: CategoryTreeIndex = { depths: new Map(), subtree: new Map() };

const Ctx = createContext<CategoryTreeIndex>(EMPTY);

/**
 * Makes the store's category tree available to client components so product
 * cards can label themselves relative to the page being browsed. Mounted once
 * in the locale layout with the tree the layout already fetches.
 */
export function CategoryTreeProvider({
  tree,
  children,
}: {
  tree: Category[];
  children: ReactNode;
}) {
  const index = useMemo(() => indexCategoryTree(tree), [tree]);
  return <Ctx.Provider value={index}>{children}</Ctx.Provider>;
}

/**
 * Resolve the category-selection context for the current route: the categories
 * in scope for the page (most-specific first) plus the depth map for the
 * most-specific fallback. On a `/category/:id` page the current category (and
 * its subtree) wins; everywhere else only the depth-based fallback applies.
 */
export function useProductCategoryContext(): CategoryContext {
  const { depths, subtree } = useContext(Ctx);
  const pathname = usePathname();
  return useMemo(() => {
    const id = parseCategoryIdFromPath(pathname);
    // subtree.get(id) yields the category + descendants deepest-first; fall back
    // to the bare id so an unknown/deep leaf page still matches exactly.
    const activeCategoryIds = id != null ? subtree.get(id) ?? [id] : undefined;
    return { activeCategoryIds, categoryDepths: depths };
  }, [pathname, depths, subtree]);
}
