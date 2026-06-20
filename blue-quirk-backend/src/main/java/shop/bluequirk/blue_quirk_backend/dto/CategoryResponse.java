package shop.bluequirk.blue_quirk_backend.dto;

import java.util.List;

public record CategoryResponse(
        Long id,
        String name,
        String slug,
        String description,
        Long parentId,
        String imageUrl,
        List<CategoryResponse> children
) {}