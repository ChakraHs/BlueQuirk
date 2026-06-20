package com.ev.pcs.keycloakauth.service.impl;

import com.ev.pcs.keycloakauth.service.KeycloakService;
import com.ev.pcs.keycloakauth.service.ProfileService;
import jakarta.transaction.Transactional;
import org.keycloak.admin.client.Keycloak;
import org.keycloak.admin.client.resource.UserResource;
import org.keycloak.admin.client.resource.UsersResource;
import org.keycloak.representations.idm.CredentialRepresentation;
import org.keycloak.representations.idm.UserRepresentation;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class ProfileServiceImpl implements ProfileService {

    @Autowired
    private KeycloakService keycloakUtil;

    @Value("${keycloak.realm}")
    private String realm;

    @Value("${keycloak.auth-server-url}")
    private String authServerUrl;

    @Value("${keycloak.resource}")
    private String clientId;

    @Override
    public boolean activateUserAccount(String userId, String activationKey) {
        Keycloak keycloak = keycloakUtil.getKeycloakInstance();
        UsersResource usersResource = keycloak.realm(realm).users();

        // Retrieve the user by ID
        UserRepresentation user = usersResource.get(userId).toRepresentation();

        if (user != null && user.getAttributes() != null && user.getAttributes().containsKey("activationKey")) {
            List<String> activationKeys = user.getAttributes().get("activationKey");
            if (activationKeys.contains(activationKey)) {
                // Activate the user
                user.setEmailVerified(true); // Mark email as verified
                usersResource.get(userId).update(user);
                return true; // Activation successful
            }
        }
        return false; // User not found or activation key is invalid
    }

    @Transactional
    @Override
    public boolean changePassword(String userId, String currentPassword, String newPassword) {
        Keycloak keycloak = keycloakUtil.getKeycloakInstance();
        UsersResource usersResource = keycloak.realm(realm).users();
        UserResource userResource = usersResource.get(userId);

//        // Verify current password
//        Keycloak keycloakVerify = Keycloak.getInstance(
//                authServerUrl,
//                realm,
//                userId,
//                currentPassword,
//                clientId);
//
//        try {
//            keycloakVerify.tokenManager().getAccessToken();
//        } catch (Exception e) {
//            throw new IllegalArgumentException("Current password is incorrect");
//        }

        // Update to new password
        CredentialRepresentation newCredential = new CredentialRepresentation();
        newCredential.setTemporary(false);
        newCredential.setType(CredentialRepresentation.PASSWORD);
        newCredential.setValue(newPassword);
        userResource.resetPassword(newCredential);

        return true;
    }
}
