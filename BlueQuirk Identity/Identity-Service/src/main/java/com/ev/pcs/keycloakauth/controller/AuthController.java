package com.ev.pcs.keycloakauth.controller;

import com.ev.pcs.keycloakauth.dto.AuthRequest;
import com.ev.pcs.keycloakauth.dto.response.TokenResponse;
import com.ev.pcs.keycloakauth.service.KeycloakService;
import jakarta.validation.Valid;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.view.RedirectView;

import java.util.Map;

@RestController
@RequestMapping("/uaa")
public class AuthController {

    private static final Logger LOG = LoggerFactory.getLogger(AuthController.class);

    private final KeycloakService keycloakService;

    private final String redirectUri = "http://localhost:8087/uaa/callback"; // Replace with your backend redirect URI
    private final String keycloakAuthUrl = "http://localhost:8001/realms/payway-realm/protocol/openid-connect/auth";

    // test branch
    @Autowired
    public AuthController(KeycloakService keycloakService) {
        this.keycloakService = keycloakService;
    }

    @PostMapping("/token")
    public ResponseEntity<?> authenticate(@Valid @RequestBody AuthRequest authRequest) {
        LOG.info("Getting access token for: {}", authRequest);

        // Determine whether to use login or email for authentication
        String username = authRequest.getLogin() != null ? authRequest.getLogin() : authRequest.getEmail();
        if (username == null) {
            LOG.info("No login or email provided.");
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("Login or email is required.");
        }

        TokenResponse token = keycloakService.authenticate(username, authRequest.getPassword());
        LOG.info("Authentication result: {}", token != null);

        return token != null
                ? ResponseEntity.ok(token)
                : ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Invalid login credentials.");
    }

    @PostMapping("validate")
    public ResponseEntity<String> validateToken(@RequestBody Map<String, String> requestBody) {
        String token = requestBody.get("token");
        if (token == null || token.isEmpty()) {
            return ResponseEntity.badRequest().body("Token is missing");
        }

        boolean isValid = keycloakService.validateToken(token);
        return isValid
                ? ResponseEntity.ok("Token is valid")
                : ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Invalid token");
    }

    @PostMapping("/token/refresh")
    public ResponseEntity<TokenResponse> refreshToken(@RequestBody Map<String, String> requestBody) {
        String refreshToken = requestBody.get("refreshToken");
        if (refreshToken == null || refreshToken.isEmpty()) {
            return ResponseEntity.badRequest().build();
        }
        TokenResponse tokenResponse = keycloakService.refreshToken(refreshToken);
        return tokenResponse != null
                ? ResponseEntity.ok(tokenResponse)
                : ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
    }

    String clientId="ec-client";


    @GetMapping("/auth/google")
    public RedirectView googleLogin() {
        // Correctly building the Keycloak Google login URL
        String keycloakRedirectUrl = keycloakAuthUrl +
                "?client_id=" + clientId +
                "&response_type=code" +
                "&scope=openid" +
                "&redirect_uri=" + redirectUri +  // Use your backend callback URI
                "&kc_idp_hint=google";  // Hint Keycloak to use Google as Identity Provider

        // Redirect to the Keycloak authentication URL (which redirects to Google)
        return new RedirectView(keycloakRedirectUrl);  // Redirect to the full URL with params
    }

    @GetMapping("/callback")
    public ResponseEntity<String> handleCallback(
            @RequestParam("code") String authorizationCode
    ) {
        try {
            // Pass the authorization code to your service for token exchange
            String accessToken = keycloakService.exchangeCodeForToken(authorizationCode);

            // Return a success response with the token
            return ResponseEntity.ok("Access token: " + accessToken);
        } catch (Exception e) {
            // Handle errors (such as failing to get the token)
            return ResponseEntity.status(500).body("Failed to get access token: " + e.getMessage());
        }
    }
}
