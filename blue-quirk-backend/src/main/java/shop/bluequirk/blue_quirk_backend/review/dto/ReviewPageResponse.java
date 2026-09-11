package shop.bluequirk.blue_quirk_backend.review.dto;

import java.util.List;

/**
 * A page of public review cards plus just enough paging metadata for the storefront
 * "load more" control. Returned empty (enabled=false / empty list) when reviews are
 * globally disabled, so the frontend renders no review DOM at all.
 */
public record ReviewPageResponse(
        boolean enabled,
        List<ReviewPublic> reviews,
        int page,
        int totalPages,
        long totalElements,
        boolean hasMore
) {
    public static ReviewPageResponse disabled() {
        return new ReviewPageResponse(false, List.of(), 0, 0, 0, false);
    }
}
