package shop.bluequirk.blue_quirk_backend.dto;

import java.util.List;

import shop.bluequirk.blue_quirk_backend.domain.ProductStatus;
import shop.bluequirk.blue_quirk_backend.entity.Image;

public record ProductResponse(
	    Long id,
	    String name,
	    Double price,
	    Integer stockQuantity,
	    String description,
	    // Materials / composition (e.g. "100% Cotton") shown in the storefront.
	    String material,
	    ProductStatus status,
	    List<Image> images,
	    List<AttributeDto> attributes,
	    // Categories this product belongs to (locale-resolved names) — used by the
	    // storefront search/filter facets.
	    List<CategoryRef> categories,
	    // --- Todify link info (null/false for normal local products) ---
	    String todifyTemplateId,
	    boolean syncedFromTodify
	) {}