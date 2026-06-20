package com.ev.pcs.keycloakauth.service;

import com.ev.pcs.keycloakauth.dto.response.TokenResponse;
import org.keycloak.admin.client.Keycloak;

public interface KeycloakService {
    Keycloak getKeycloakInstance();
    boolean validateToken(String token);
    TokenResponse authenticate(String username, String password);
    TokenResponse getAccessToken();
    TokenResponse refreshToken(String refreshToken);
    public String exchangeCodeForToken(String code) throws Exception;
}
