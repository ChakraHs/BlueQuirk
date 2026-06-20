package com.ev.pcs.keycloakauth.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@AllArgsConstructor
@NoArgsConstructor
@Getter
@Setter
public class UpdateRequest {
    private String email;
    private String firstName;
    private String lastName;
}
