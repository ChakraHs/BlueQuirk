package com.ev.pcs.keycloakauth.service.impl;

import com.ev.pcs.keycloakauth.dto.response.TokenResponse;
import com.ev.pcs.keycloakauth.service.KeycloakService;
import org.keycloak.admin.client.Keycloak;
import org.keycloak.admin.client.KeycloakBuilder;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestTemplate;

import java.util.HashMap;
import java.util.Map;

@Service
public class KeycloakServiceImpl implements KeycloakService {

    private static final Logger LOG = LoggerFactory.getLogger(KeycloakServiceImpl.class);

    private Keycloak keycloak;

    @Value("${keycloak.auth-server-url}")
    private String serverUrl;

    @Value("${keycloak.realm}")
    private String realm;

    @Value("${keycloak.client-id}")
    private String clientId;

    @Value("${keycloak.grant-type}")
    private String grantType;

    @Value("${keycloak.name}")
    private String adminUsername;

    @Value("${keycloak.password}")
    private String adminPassword;

    @Value("${keycloak.credentials.secret}")
    private String clientSecret;

    private final String tokenUrl = "http://localhost:8001/realms/payway-realm/protocol/openid-connect/token";

    @Override
    public Keycloak getKeycloakInstance() {
        if (keycloak == null) {
            keycloak = KeycloakBuilder.builder()
                    .serverUrl(serverUrl)
                    .realm(realm)
                    .clientId(clientId)
                    .clientSecret(clientSecret)
                    .grantType(grantType)
                    .username(adminUsername)
                    .password(adminPassword)
                    .build();
        }
        return keycloak;
    }


    @Override
    public String exchangeCodeForToken(String authorizationCode) throws Exception {
        // Request body for token exchange
        MultiValueMap<String, String> body = new LinkedMultiValueMap<>();
        body.add("code", authorizationCode);
        body.add("client_id", "ec-client");  // Your Keycloak client ID
        body.add("client_secret", "YOUR_KEYCLOAK_CLIENT_SECRET");  // Your Keycloak client secret
        body.add("redirect_uri", "http://localhost:8087/uaa/callback");  // Callback URL to match the one provided in the auth request
        body.add("grant_type", "authorization_code");

        // Set headers for the request
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_FORM_URLENCODED);

        // Build request entity with body and headers
        HttpEntity<MultiValueMap<String, String>> requestEntity = new HttpEntity<>(body, headers);

        // Use RestTemplate to make the POST request
        RestTemplate restTemplate = new RestTemplate();
        ResponseEntity<Map> responseEntity = restTemplate.exchange(tokenUrl, HttpMethod.POST, requestEntity, Map.class);

        // Extract the access token from the response
        if (responseEntity.getStatusCode() == HttpStatus.OK) {
            Map<String, Object> responseBody = responseEntity.getBody();
            if (responseBody != null && responseBody.containsKey("access_token")) {
                return (String) responseBody.get("access_token");
            } else {
                throw new Exception("Failed to retrieve access token");
            }
        } else {
            throw new Exception("Error during token exchange");
        }
    }

    @Override
    public boolean validateToken(String token) {
        try {
            String url = serverUrl + "/realms/" + realm + "/protocol/openid-connect/token/introspect";
            RestTemplate restTemplate = new RestTemplate();
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_FORM_URLENCODED);

            MultiValueMap<String, String> body = new LinkedMultiValueMap<>();
            body.add("token", token);
            body.add("client_id", clientId);
            body.add("client_secret", clientSecret);

            HttpEntity<MultiValueMap<String, String>> requestEntity = new HttpEntity<>(body, headers);
            ResponseEntity<Map> responseEntity = restTemplate.postForEntity(url, requestEntity, Map.class);

            if (responseEntity.getStatusCode() == HttpStatus.OK) {
                LOG.info("Token validation success: "+responseEntity.getBody()+" "+token);
                Map<String, Object> response = responseEntity.getBody();
                return response != null && (Boolean) response.get("active");
            }
        } catch (Exception e) {
            LOG.error("Token validation failed", e);
        }
        return false;
    }

    @Override
    public TokenResponse authenticate(String username, String password) {
        RestTemplate restTemplate = new RestTemplate();
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_FORM_URLENCODED);

        MultiValueMap<String, String> body = new LinkedMultiValueMap<>();
        body.add("client_id", clientId);
        body.add("client_secret", clientSecret);
        body.add("username", username);
        body.add("password", password);
        body.add("grant_type", grantType);

        HttpEntity<MultiValueMap<String, String>> requestEntity = new HttpEntity<>(body, headers);
        String url = serverUrl + "/realms/" + realm + "/protocol/openid-connect/token";

        try {
            ResponseEntity<Map> responseEntity = restTemplate.postForEntity(url, requestEntity, Map.class);

            System.out.println("Request body: " + requestEntity.toString()); // Log request body
            System.out.println("Response status code: " + responseEntity.getStatusCodeValue()); // Log status code

            if (responseEntity.getStatusCode() == HttpStatus.OK) {
                Map<String, Object> response = responseEntity.getBody();
                System.out.println("Response body: " + response); // Log response body

                if (response != null) {
                    TokenResponse tokenResponse = new TokenResponse();
                    tokenResponse.setAccessToken((String) response.get("access_token"));
                    tokenResponse.setRefreshToken((String) response.get("refresh_token"));
                    return tokenResponse;
                }
            } else {
                LOG.warn("Authentication failed for user: {}", username);
                LOG.error("Authentication error: {} - {}", responseEntity.getStatusCode(), responseEntity.getBody());
            }
        } catch (Exception e) {
            LOG.error("Unexpected error during authentication: {}", e.getMessage());
        }
        return null;
    }

    @Override
    public TokenResponse getAccessToken() {
        TokenResponse token = this.authenticate(adminUsername, adminPassword);
        return token != null ? token : new TokenResponse();
    }

    @Override
    public TokenResponse refreshToken(String refreshToken) {
        RestTemplate restTemplate = new RestTemplate();
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_FORM_URLENCODED);

        MultiValueMap<String, String> body = new LinkedMultiValueMap<>();
        body.add("client_id", clientId);
        body.add("client_secret", clientSecret);
        body.add("grant_type", "refresh_token");
        body.add("refresh_token", refreshToken);

        HttpEntity<MultiValueMap<String, String>> requestEntity = new HttpEntity<>(body, headers);
        String url = serverUrl + "/realms/" + realm + "/protocol/openid-connect/token";

        try {
            ResponseEntity<Map> responseEntity = restTemplate.postForEntity(url, requestEntity, Map.class);

            System.out.println("Request body: " + requestEntity.toString()); // Log request body
            System.out.println("Response status code: " + responseEntity.getStatusCodeValue()); // Log status code

            if (responseEntity.getStatusCode() == HttpStatus.OK) {
                Map<String, Object> response = responseEntity.getBody();
                System.out.println("Response body: " + response); // Log response body

                if (response != null) {
                    TokenResponse tokenResponse = new TokenResponse();
                    tokenResponse.setAccessToken((String) response.get("access_token"));
                    tokenResponse.setRefreshToken((String) response.get("refresh_token"));
                    return tokenResponse;
                }
            } else {
                LOG.warn("Token refresh failed");
                LOG.error("Token refresh error: {} - {}", responseEntity.getStatusCode(), responseEntity.getBody());
            }
        } catch (Exception e) {
            LOG.error("Unexpected error during token refresh: {}", e.getMessage());
        }
        return null;
    }

}
