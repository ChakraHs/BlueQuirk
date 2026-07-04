package shop.bluequirk.blue_quirk_backend.analytics.dto;

import java.util.List;

/** Traffic sources + most common navigation paths (user journey). */
public record TrafficResponse(
        List<LabelCount> referrers,
        List<JourneyPath> topPaths
) {
    /** A common ordered page-type path, e.g. "HOME → PRODUCT → CART", with its count. */
    public record JourneyPath(String path, long count) {}
}
