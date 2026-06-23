package shop.bluequirk.blue_quirk_backend.dto;

import java.util.List;

public record AttributeDto(
	    Long id,
	    String name,
	    String type,
	    List<AttributeValueDto> values
	) {}