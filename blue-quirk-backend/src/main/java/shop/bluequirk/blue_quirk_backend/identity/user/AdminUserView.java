package shop.bluequirk.blue_quirk_backend.identity.user;

import java.util.Set;

/** Admin-facing projection of a user account for the customer/user directory. */
public record AdminUserView(
        Long id,
        String email,
        String name,
        boolean enabled,
        boolean emailVerified,
        Set<String> roles,
        String createdAt) {}
