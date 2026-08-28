package shop.bluequirk.blue_quirk_backend.identity.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

public record ForgotPasswordRequest(
        @NotBlank @Email String email,
        // Storefront language ("fr" default, or "ar"); sets the reset email's
        // language. Optional — normalized server-side.
        String lang) {}
