"use client";

import { Heart } from "lucide-react";
import { useEffect, useState } from "react";
import {
  WishlistItem,
  isWishlisted,
  toggleWishlist,
  WISHLIST_EVENT,
} from "@/lib/wishlist";

export default function WishlistButton({
  item,
  className = "",
}: {
  item: WishlistItem;
  className?: string;
}) {
  const [active, setActive] = useState(false);

  useEffect(() => {
    const sync = () => setActive(isWishlisted(item.id));
    sync();
    window.addEventListener(WISHLIST_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(WISHLIST_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, [item.id]);

  const handleClick = (e: React.MouseEvent) => {
    // The card is wrapped in a <Link>; don't navigate when toggling.
    e.preventDefault();
    e.stopPropagation();
    setActive(toggleWishlist(item));
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={active ? "Remove from wishlist" : "Add to wishlist"}
      aria-pressed={active}
      className={className}
    >
      <Heart
        size={18}
        className={active ? "fill-blue-600 text-blue-600" : ""}
      />
    </button>
  );
}
