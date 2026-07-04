package shop.bluequirk.blue_quirk_backend.analytics.dto;

import java.util.List;

/** Top countries and cities (empty when no GeoLite2 DB is installed). */
public record CountriesResponse(
        List<LabelCount> countries,
        List<LabelCount> cities
) {}
