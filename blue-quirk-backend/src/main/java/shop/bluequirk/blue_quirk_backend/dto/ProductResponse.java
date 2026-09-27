package shop.bluequirk.blue_quirk_backend.dto;

import java.util.List;

import shop.bluequirk.blue_quirk_backend.careguide.dto.CareGuidePublic;
import shop.bluequirk.blue_quirk_backend.domain.ProductStatus;
import shop.bluequirk.blue_quirk_backend.domain.ProductType;
import shop.bluequirk.blue_quirk_backend.entity.Image;

public record ProductResponse(
	    Long id,
	    String name,
	    Double price,
	    // Compare-at / previous price shown crossed out (campaign-scaled like price;
	    // null when the product is not on sale). Display-only — never charged.
	    Double compareAtPrice,
	    Integer stockQuantity,
	    String description,
	    // Physical garment type (never null in the response — legacy null resolves to
	    // T_SHIRT). Drives the storefront size guide (T-shirt vs hoodie).
	    ProductType productType,
	    // Legacy materials string (e.g. "100% Cotton") — kept for backward compat and
	    // as the storefront fallback when the structured composition can't be resolved.
	    String material,
	    // Structured composition (Cotton 67% + Polyester 33%). Resolved from stored
	    // structured data, or parsed from the legacy `material` string for older rows;
	    // empty when neither is available (storefront then falls back to `material`).
	    List<MaterialComponentDto> materialComposition,
	    String fabricWeight,
	    String fit,
	    // Attached care-guide template id (for the admin edit form to preselect it);
	    // null when the product has no guide. Only populated on the single-product
	    // read — list responses leave it null.
	    Long careGuideTemplateId,
	    // The care guide resolved to the request's language for the storefront
	    // (title-less section bodies). Null when the product has no guide or on list
	    // responses (only the product detail page needs it) — the storefront then
	    // hides the "Care & Wear" section entirely.
	    CareGuidePublic careGuide,
	    ProductStatus status,
	    List<Image> images,
	    // Optional featured video — null when the product has none, so existing
	    // products/clients are unaffected.
	    ProductVideoResponse video,
	    List<AttributeDto> attributes,
	    // Categories this product belongs to (locale-resolved names) — used by the
	    // storefront search/filter facets.
	    List<CategoryRef> categories,
	    // Raw per-language name/description pairs. The storefront ignores these
	    // (it reads the resolved name/description above); the admin edit form uses
	    // them to populate the translations editor.
	    List<ProductTranslationDto> translations,
	    // --- Todify link info (null/false for normal local products) ---
	    String todifyTemplateId,
	    boolean syncedFromTodify
	) {}
