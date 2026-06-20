package com.ev.pcs.keycloakauth.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Service;

import java.util.Base64;

@Service
public class JwtUtil {

    private final ObjectMapper objectMapper = new ObjectMapper();

    public String getUserIdFromToken(String token) {
        try {
            // Split the token into header, payload, and signature
            String[] parts = token.split("\\.");
            if (parts.length == 3) {
                // Decode the payload (second part of the token)
                String payload = new String(Base64.getDecoder().decode(parts[1]));
                // Parse the payload as JSON
                JsonNode jsonNode = objectMapper.readTree(payload);
                // Extract the 'sub' field, which is the user ID
                return jsonNode.get("sub").asText();
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
        return null;
    }
}