package shop.bluequirk.blue_quirk_backend.identity.dto;

import java.util.Set;

public record UserResponse(
        Long id,
        String email,
        String name,
        boolean emailVerified,
        Set<String> roles) {}
