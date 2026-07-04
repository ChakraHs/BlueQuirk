package shop.bluequirk.blue_quirk_backend.analytics.dto;

/** Per-product view counts (from page views with pageType = PRODUCT). */
public record ProductViewRow(Long productId, long views, long uniqueViews) {}
