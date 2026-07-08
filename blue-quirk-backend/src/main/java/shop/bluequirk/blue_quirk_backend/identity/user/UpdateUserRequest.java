package shop.bluequirk.blue_quirk_backend.identity.user;

import java.util.Set;

/** Partial admin update of a user. Null fields are left unchanged. */
public record UpdateUserRequest(
        String name,
        Boolean enabled,
        Set<String> roles) {}
