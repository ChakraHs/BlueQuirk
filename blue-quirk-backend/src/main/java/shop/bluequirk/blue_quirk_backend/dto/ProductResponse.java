package shop.bluequirk.blue_quirk_backend.dto;

import java.util.List;
import java.util.Set;

import shop.bluequirk.blue_quirk_backend.domain.ProductStatus;
import shop.bluequirk.blue_quirk_backend.entity.Image;

public record ProductResponse(
	    Long id,
	    String name,
	    Double price,
	    String description,
	    ProductStatus status,
	    Set<Image> images,
	    List<AttributeDto> attributes
	) {}