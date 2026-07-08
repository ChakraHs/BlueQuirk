package shop.bluequirk.blue_quirk_backend.identity.token;

import shop.bluequirk.blue_quirk_backend.entity.User;

/** Internal result of issuing/rotating tokens: the signed access token, the raw
 *  (un-hashed) refresh token to hand back to the client, and the owning user. */
public record TokenPair(String accessToken, String rawRefreshToken, User user) {}
