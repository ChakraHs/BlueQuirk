package com.ev.pcs.keycloakauth.dto;

import lombok.*;

@AllArgsConstructor @NoArgsConstructor @Getter @Setter @Builder
public class UserDto {
    private String id;
    private String username;
    private String email;
    private String firstName;
    private String lastName;
    private String imageUrl; // Field for image URL
    private Boolean activated;
    private String createdDate; // Field for created date
}