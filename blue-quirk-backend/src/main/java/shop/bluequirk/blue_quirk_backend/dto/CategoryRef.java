package shop.bluequirk.blue_quirk_backend.dto;

/**
 * Lightweight category reference embedded in {@link ProductResponse} so the
 * storefront can build category facets/filters without a second round-trip.
 * The {@code name} is already locale-resolved by the service.
 */
public record CategoryRef(
        Long id,
        String name
) {}
