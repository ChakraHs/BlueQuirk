package shop.bluequirk.blue_quirk_backend.dto;

/** Payload for creating/updating a category. parentId is optional (null = root). */
public record CategoryRequest(
        String name,
        String slug,
        String description,
        Long parentId,
        String imageUrl
) {}
