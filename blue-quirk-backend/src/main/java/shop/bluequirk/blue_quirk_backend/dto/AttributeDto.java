package shop.bluequirk.blue_quirk_backend.dto;

import java.util.List;

public record AttributeDto(
	    Long id,
	    String name,
	    List<AttributeValueDto> values
	) {}