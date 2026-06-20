package com.ev.pcs.keycloakauth.dto.response;

import lombok.Data;

@Data
public class TokenResponse {
    private String accessToken;
    private String refreshToken;
}
