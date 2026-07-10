package shop.bluequirk.blue_quirk_backend.dto;

import java.util.List;

import shop.bluequirk.blue_quirk_backend.domain.ProductStatus;
import shop.bluequirk.blue_quirk_backend.entity.Image;

/**
 * Admin-only product view. Unlike the public {@link ProductResponse}, this
 * includes the confidential {@code cost} plus derived gross-margin figures, so
 * it is served ONLY from the admin-authenticated {@code /api/admin/products}
 * endpoints. Never return this from a public/storefront route.
 */
public record AdminProductResponse(
        Long id,
        String name,
        double price,
        double cost,
        // Derived (price − cost) and margin % — computed centrally by
        // FinancialCalculationService so the admin UI never re-implements them.
        double grossMargin,
        double grossMarginPercent,
        Integer stockQuantity,
        ProductStatus status,
        List<Image> images
) {}
