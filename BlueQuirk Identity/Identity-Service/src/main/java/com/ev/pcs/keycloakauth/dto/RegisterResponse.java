package com.ev.pcs.keycloakauth.dto;

import com.ev.pcs.keycloakauth.dto.response.TokenResponse;
import lombok.*;

@Data @NoArgsConstructor
@AllArgsConstructor @Getter @Setter
public class RegisterResponse {
    private int status;
    private String message;
    private String userId; // Optional field for success responses
    private TokenResponse token;  // Token field

    // Constructors
    public RegisterResponse(int status, String message) {
        this.status = status;
        this.message = message;
    }

    public RegisterResponse(int status, String message, String userId) {
        this.status = status;
        this.message = message;
        this.userId = userId;
    }
}
