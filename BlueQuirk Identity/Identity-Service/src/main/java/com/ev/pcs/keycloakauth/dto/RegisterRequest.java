package com.ev.pcs.keycloakauth.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotEmpty;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@AllArgsConstructor
@NoArgsConstructor
@Getter
@Setter
public class RegisterRequest {
    @NotEmpty(message = "Username must not be empty")
    private String username;

    @Email(message = "Email should be valid")
    @NotEmpty(message = "Email must not be empty")
    private String email;

    @NotEmpty(message = "Password must not be empty")
    private String password;

    private String firstName;
    private String lastName;
    private String imageUrl; // Field for image URL
    private String createdDate; // Field for created date
}
