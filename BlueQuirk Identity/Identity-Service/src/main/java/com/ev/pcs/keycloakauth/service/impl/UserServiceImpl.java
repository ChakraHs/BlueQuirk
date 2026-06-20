package com.ev.pcs.keycloakauth.service.impl;

import com.ev.pcs.keycloakauth.dto.RegisterRequest;
import com.ev.pcs.keycloakauth.dto.RegisterResponse;
import com.ev.pcs.keycloakauth.dto.UpdateRequest;
import com.ev.pcs.keycloakauth.dto.UserDto;
import com.ev.pcs.keycloakauth.dto.response.TokenResponse;
import com.ev.pcs.keycloakauth.mapper.UserMapper;
import com.ev.pcs.keycloakauth.service.KeycloakService;
import com.ev.pcs.keycloakauth.service.UserService;
import jakarta.ws.rs.core.Response;
import org.keycloak.admin.client.Keycloak;
import org.keycloak.admin.client.resource.UserResource;
import org.keycloak.admin.client.resource.UsersResource;
import org.keycloak.representations.idm.UserRepresentation;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class UserServiceImpl implements UserService {

    private static final Logger log = LoggerFactory.getLogger(UserServiceImpl.class);

    @Autowired
    private KeycloakService keycloakUtil;

    private final UserMapper userMapper = new UserMapper();

    @Value("${keycloak.realm}")
    private String realm;

    @Override
    public RegisterResponse createUser(RegisterRequest registerRequest) {
        if(registerRequest.getFirstName()==null || registerRequest.getFirstName().isEmpty()){
            registerRequest.setFirstName(registerRequest.getUsername());
        }
        if(registerRequest.getLastName()==null || registerRequest.getLastName().isEmpty()){
            registerRequest.setLastName(registerRequest.getUsername());
        }
        UserRepresentation userRepresentation = userMapper.toUserRepresentation(registerRequest);
        Keycloak keycloak = keycloakUtil.getKeycloakInstance();
        Response response = keycloak.realm(realm).users().create(userRepresentation);
        if (response.getStatus() == 201) {
            // Extract user ID from the Location header
            String locationHeader = response.getHeaderString("Location");
            if (locationHeader != null) {
                String userId = locationHeader.substring(locationHeader.lastIndexOf('/') + 1);
                emailVerification(userId);
                log.info("Email was sent to user id: " + userId);
                // Authenticate the user to get the token
                TokenResponse token = keycloakUtil.authenticate(registerRequest.getUsername(), registerRequest.getPassword());

                return new RegisterResponse(201, "User created successfully", userId, token);
            } else {
                return new RegisterResponse(0, "Failed to extract user ID from the response");
            }
        } else if (response.getStatus() == 409) {
            // Read the error response body
            String errorResponse = response.readEntity(String.class);
            if (errorResponse.contains("User exists with same email")) {
                log.error("Failed to create user. Email already exists.");
                return new RegisterResponse(409, "Email already exists");
            } else if (errorResponse.contains("username")) {
                log.error("Failed to create user. Username already exists.");
                return new RegisterResponse(409, "Username already exists");
            } else {
                log.error("Failed to create user. Response: " + errorResponse);
                return new RegisterResponse(409, "User creation failed: " + errorResponse);
            }
        } else {
            // Handle other statuses
            String errorResponse = response.readEntity(String.class);
            log.error("Failed to create user. Status code: " + response.getStatus() + " Response: " + errorResponse);
            return new RegisterResponse(response.getStatus(), "Failed to create user. Status code: " + response.getStatus() + " Response: " + errorResponse);
        }
    }

    @Override
    public List<UserDto> getUsers() {
        try {
            Keycloak keycloak = keycloakUtil.getKeycloakInstance();
            List<UserRepresentation> userRepresentations = keycloak.realm(realm).users().list();

            // Check if the user list is null
            if (userRepresentations == null) {
                throw new RuntimeException("Failed to retrieve user representations");
            }

            return userMapper.toUserDtos(userRepresentations);

        } catch (Exception e) {
            // Log the error
            log.error("Failed to retrieve users: {}", e.getMessage());

            // Optionally, throw the exception to be handled by the controller
            throw new RuntimeException("Failed to retrieve users", e);
        }
    }

    @Override
    public UserDto getUserById(String id) {
        try {
            Keycloak keycloak = keycloakUtil.getKeycloakInstance();
            UserRepresentation userRepresentation = keycloak.realm(realm).users().get(id).toRepresentation();

            if (userRepresentation == null) {
                // Handle case where userRepresentation is null
                return null; // or throw a custom exception, based on your design
            }

            return userMapper.toUserDto(userRepresentation);
        } catch (RuntimeException e) {
            // Handle and log the exception as needed
            log.error("Failed to retrieve user with ID {}: {}", id, e.getMessage(), e);

            // Handle error according to your application's error handling strategy
            return null; // or throw a custom exception
        }
    }

    @Override
    public void deleteUser(String id) {
        try {
            Keycloak keycloak = keycloakUtil.getKeycloakInstance();
            UserResource userResource = keycloak.realm(realm).users().get(id);

            try {
                userResource.remove();
                log.info("User with id {} has been deleted successfully.", id);
            } catch (Exception e) {
                log.error("Failed to delete user with id {}: {}", id, e.getMessage());
                throw new RuntimeException("Failed to delete user", e);
            }

        } catch (Exception e) {
            log.error("Failed to retrieve Keycloak instance or realm: {}", e.getMessage());
            throw new RuntimeException("Failed to delete user", e);
        }
    }

    @Override
    public UserDto updateUser(String id, UpdateRequest updateRequest) {
        try {
            Keycloak keycloak = keycloakUtil.getKeycloakInstance();
            UserResource userResource = keycloak.realm(realm).users().get(id);
            UserRepresentation userRepresentation;

            try {
                userRepresentation = userResource.toRepresentation();
            } catch (Exception e) {
                log.error("Failed to retrieve user with id {}: {}", id, e.getMessage());
                throw new RuntimeException("Failed to retrieve user", e);
            }

            if (userRepresentation == null) {
                throw new RuntimeException("User with ID " + id + " not found");
            }

            userMapper.updateUserRepresentation(userRepresentation, updateRequest);

            try {
                userResource.update(userRepresentation);
            } catch (Exception e) {
                log.error("Failed to update user with id {}: {}", id, e.getMessage());
                throw new RuntimeException("Failed to update user", e);
            }

            return userMapper.toUserDto(userRepresentation);

        } catch (Exception e) {
            log.error("Failed to update user: {}", e.getMessage());
            throw e;
        }
    }


    @Override
    public void emailVerification(String userId){
        try {
            Keycloak keycloak = keycloakUtil.getKeycloakInstance();
            UsersResource usersResource = keycloak.realm(realm).users();

            // Call sendVerifyEmail and handle any potential issues
            usersResource.get(userId).sendVerifyEmail();
            System.out.println("Verification email sent successfully.");
        } catch (Exception e) {
            // Handle any exceptions that might occur
            System.err.println("Failed to send verification email: " + e.getMessage());
            // Optionally, you can rethrow or log the exception based on your application's needs
        }

//        just comment
    }

}

