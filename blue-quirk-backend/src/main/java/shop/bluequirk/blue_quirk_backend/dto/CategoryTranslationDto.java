package shop.bluequirk.blue_quirk_backend.dto;

/** A single localized name/description for a category (lang = "fr" | "ar"). */
public record CategoryTranslationDto(
        String lang,
        String name,
        String description
) {}
