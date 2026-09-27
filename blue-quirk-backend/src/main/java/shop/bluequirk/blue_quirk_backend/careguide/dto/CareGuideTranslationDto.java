package shop.bluequirk.blue_quirk_backend.careguide.dto;

/**
 * One language's care-guide sections, used both in the admin create/update
 * request and in the full admin response. All sections are optional plain text;
 * the service trims them and rejects a translation that carries no content.
 */
public record CareGuideTranslationDto(
        String lang,
        String fabricAndFeel,
        String washingAndDrying,
        String ironing,
        String printCare,
        String tips
) {}
