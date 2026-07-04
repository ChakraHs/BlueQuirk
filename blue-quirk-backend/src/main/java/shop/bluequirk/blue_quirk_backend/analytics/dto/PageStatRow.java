package shop.bluequirk.blue_quirk_backend.analytics.dto;

import shop.bluequirk.blue_quirk_backend.analytics.domain.PageType;

/**
 * Aggregated per-path page metrics straight from the DB (JPQL constructor
 * projection). Bounce rate is computed separately at the service layer from
 * landing sessions; exit rate = exits / views.
 */
public record PageStatRow(
        String path,
        PageType pageType,
        long views,
        long uniqueViews,
        Double avgDurationMs,
        long exits
) {}
