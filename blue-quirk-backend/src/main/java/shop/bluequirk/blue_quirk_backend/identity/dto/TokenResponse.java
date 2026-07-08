package shop.bluequirk.blue_quirk_backend.identity.dto;

/**
 * Result of a successful login/register/refresh. {@code tokenType} is always
 * "Bearer"; {@code expiresIn} is the access-token lifetime in seconds.
 */
public record TokenResponse(
        String accessToken,
        String refreshToken,
        String tokenType,
        long expiresIn,
        UserResponse user) {

    public static TokenResponse bearer(String accessToken, String refreshToken, long expiresIn, UserResponse user) {
        return new TokenResponse(accessToken, refreshToken, "Bearer", expiresIn, user);
    }
}
