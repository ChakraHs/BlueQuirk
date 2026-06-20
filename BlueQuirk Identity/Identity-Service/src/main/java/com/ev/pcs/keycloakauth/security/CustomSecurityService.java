package com.ev.pcs.keycloakauth.security;

import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.stereotype.Service;

@Service
public class CustomSecurityService {

    public boolean isUserId(Authentication authentication, String id) {
        if (authentication instanceof JwtAuthenticationToken) {
            Jwt jwt = ((JwtAuthenticationToken) authentication).getToken();
            String userId = jwt.getClaimAsString("sub"); // assuming 'sub' contains the user ID
            return userId != null && userId.equals(id);
        }
        return false;
    }
}
