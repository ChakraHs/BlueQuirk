package shop.bluequirk.blue_quirk_backend.dto;

/**
 * One line of a product's material composition as sent by / returned to the
 * client. {@code material} is the {@link shop.bluequirk.blue_quirk_backend.domain.MaterialType}
 * name (e.g. "COTTON"); {@code percentage} is a whole-number percent. The service
 * parses the name to the enum (400 on an unknown value) and validates that every
 * percentage is > 0 and that they total 100 before persisting.
 */
public record MaterialComponentDto(String material, Integer percentage) {}
