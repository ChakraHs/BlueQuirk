package shop.bluequirk.blue_quirk_backend.identity.dto;

public record MessageResponse(String message) {
    public static MessageResponse of(String message) {
        return new MessageResponse(message);
    }
}
