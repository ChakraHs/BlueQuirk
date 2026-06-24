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
	    ProductStatus status,
	    List<Image> images,
	    List<AttributeDto> attributes,
	    // --- Todify link info (null/false for normal local products) ---
	    String todifyTemplateId,
	    boolean syncedFromTodify
	) {}