package com.ev.pcs.keycloakauth.controller;

import com.ev.pcs.keycloakauth.dto.AccountActivationRequest;
import com.ev.pcs.keycloakauth.dto.PasswordChangeRequest;
import com.ev.pcs.keycloakauth.service.JwtUtil;
import com.ev.pcs.keycloakauth.service.ProfileService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;


@RestController
@RequestMapping("/account")
public class ProfileController {

    @Autowired
    private ProfileService profileService;

    @Autowired
    private JwtUtil jwtUtil;

    @PostMapping("/activate")
    public ResponseEntity<String> activateUser(
            @RequestBody AccountActivationRequest activationRequest,
            HttpServletRequest request) {

        // Extract the token from the Authorization header
        String authorizationHeader = request.getHeader(HttpHeaders.AUTHORIZATION);

        String token = authorizationHeader.substring(7); // Remove "Bearer " prefix

        System.out.println("Token for activated: "+ token);

        // Here you need to extract the user ID from the token
        // For simplicity, let's assume a method getUserIdFromToken(token) exists
        String userId = jwtUtil.getUserIdFromToken(token);

        if (userId == null) {
            return ResponseEntity.status(401).body("Invalid token.");
        }

        boolean isActivated = profileService.activateUserAccount(userId, activationRequest.getActivationKey());

        if (isActivated) {
            return ResponseEntity.ok("Account successfully activated.");
        } else {
            return ResponseEntity.status(400).body("Invalid activation key or user not found.");
        }
    }


    @PostMapping("/change-password")
    public ResponseEntity<?> changePassword(@RequestBody PasswordChangeRequest passwordChangeRequest, HttpServletRequest request) {
        // Extract the token from the Authorization header
        String authorizationHeader = request.getHeader(HttpHeaders.AUTHORIZATION);

        String token = authorizationHeader.substring(7); // Remove "Bearer " prefix

        // Here you need to extract the user ID from the token
        // For simplicity, let's assume a method getUserIdFromToken(token) exists
        String userId = jwtUtil.getUserIdFromToken(token);

        if (userId == null) {
            return ResponseEntity.status(401).body("Invalid token.");
        }

        profileService.changePassword(userId, passwordChangeRequest.getCurrentPassword(), passwordChangeRequest.getNewPassword());
        return ResponseEntity.ok().build();
    }
}
