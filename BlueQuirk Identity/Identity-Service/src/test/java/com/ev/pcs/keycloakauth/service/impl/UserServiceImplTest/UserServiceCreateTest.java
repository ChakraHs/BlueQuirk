package com.ev.pcs.keycloakauth.service.impl.UserServiceImplTest;

import com.ev.pcs.keycloakauth.dto.RegisterRequest;
import com.ev.pcs.keycloakauth.dto.RegisterResponse;
import com.ev.pcs.keycloakauth.dto.response.TokenResponse;
import com.ev.pcs.keycloakauth.service.KeycloakService;
import com.ev.pcs.keycloakauth.service.impl.UserServiceImpl;
import jakarta.ws.rs.core.Response;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.keycloak.admin.client.Keycloak;
import org.keycloak.admin.client.resource.RealmResource;
import org.keycloak.admin.client.resource.UserResource;
import org.keycloak.admin.client.resource.UsersResource;
import org.keycloak.representations.idm.UserRepresentation;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import static org.assertj.core.api.AssertionsForClassTypes.assertThat;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class UserServiceCreateTest {
    @Mock
    private KeycloakService keycloakService;

    @Mock
    private Keycloak keycloak;

    @Mock
    private RealmResource realmResource;

    @Mock
    private UsersResource usersResource;

    @Mock
    private UserResource userResource;

    @Mock
    private Response response;

    @InjectMocks
    private UserServiceImpl userServiceImpl;

    @BeforeEach
    void setUp() {
        when(keycloakService.getKeycloakInstance()).thenReturn(keycloak);
        // Match the actual value of 'realm' that will be used in the method.
        doReturn(realmResource).when(keycloak).realm("ec-realm"); // Replace "ec-realm" with the actual realm name used in the method
        when(realmResource.users()).thenReturn(usersResource);
        // Set the value of `realm` field using ReflectionTestUtils
        ReflectionTestUtils.setField(userServiceImpl, "realm", "ec-realm");
        // Ensure usersResource.get(userId) returns a non-null UserResource
        lenient().when(usersResource.get(anyString())).thenReturn(userResource);
    }

    @Test
    void testCreateUserSuccess() {
        RegisterRequest registerRequest = new RegisterRequest();
        registerRequest.setUsername("testuser");
        registerRequest.setPassword("password");
        registerRequest.setEmail("testuser@example.com");

        UserRepresentation userRepresentation = new UserRepresentation();
        when(usersResource.create(any(UserRepresentation.class))).thenReturn(response);
        when(response.getStatus()).thenReturn(201);
        when(response.getHeaderString("Location")).thenReturn("/users/12345");

        TokenResponse mockedToken = new TokenResponse();
        mockedToken.setAccessToken("mockedToken");

        when(keycloakService.authenticate(anyString(), anyString())).thenReturn(mockedToken);

        RegisterResponse result = userServiceImpl.createUser(registerRequest);

        assertEquals(201, result.getStatus());
        assertEquals("User created successfully", result.getMessage());
        assertEquals("12345", result.getUserId());
        assertThat(mockedToken).usingRecursiveComparison().isEqualTo(result.getToken());
    }

    @Test
    void testCreateUserEmailAlreadyExists() {
        RegisterRequest registerRequest = new RegisterRequest();
        registerRequest.setUsername("testuser");
        registerRequest.setPassword("password");
        registerRequest.setEmail("testuser@example.com");

        when(usersResource.create(any(UserRepresentation.class))).thenReturn(response);
        when(response.getStatus()).thenReturn(409);
        when(response.readEntity(String.class)).thenReturn("{\"errorMessage\":\"User exists with same email\"}");

        RegisterResponse result = userServiceImpl.createUser(registerRequest);

        assertEquals(409, result.getStatus());
        assertEquals("Email already exists", result.getMessage());
    }

    @Test
    void testCreateUserUsernameAlreadyExists() {
        RegisterRequest registerRequest = new RegisterRequest();
        registerRequest.setUsername("testuser");
        registerRequest.setPassword("password");
        registerRequest.setEmail("testuser@example.com");

        when(usersResource.create(any(UserRepresentation.class))).thenReturn(response);
        when(response.getStatus()).thenReturn(409);
        when(response.readEntity(String.class)).thenReturn("{\"errorMessage\":\"User exists with same username\"}");

        RegisterResponse result = userServiceImpl.createUser(registerRequest);

        assertEquals(409, result.getStatus());
        assertEquals("Username already exists", result.getMessage());
    }

    @Test
    void testCreateUserFailure() {
        RegisterRequest registerRequest = new RegisterRequest();
        registerRequest.setUsername("testuser");
        registerRequest.setPassword("password");
        registerRequest.setEmail("testuser@example.com");

        when(usersResource.create(any(UserRepresentation.class))).thenReturn(response);
        when(response.getStatus()).thenReturn(500);
        when(response.readEntity(String.class)).thenReturn("Internal Server Error");

        RegisterResponse result = userServiceImpl.createUser(registerRequest);

        assertEquals(500, result.getStatus());
        assertEquals("Failed to create user. Status code: 500 Response: Internal Server Error", result.getMessage());
    }

    @Test
    void testCreateUserMissingLocationHeader() {
        RegisterRequest registerRequest = new RegisterRequest();
        registerRequest.setUsername("testuser");
        registerRequest.setPassword("password");
        registerRequest.setEmail("testuser@example.com");

        // Mock the behavior of creating a user
        when(usersResource.create(any(UserRepresentation.class))).thenReturn(response);
        when(response.getStatus()).thenReturn(201); // Simulate successful creation
        when(response.getHeaderString("Location")).thenReturn(null); // Simulate missing Location header

        RegisterResponse result = userServiceImpl.createUser(registerRequest);

        // Verify the response when the Location header is missing
        assertEquals(0, result.getStatus());
        assertEquals("Failed to extract user ID from the response", result.getMessage());
        assertNull(result.getUserId()); // Ensure userId is not set
        assertNull(result.getToken()); // Ensure token is not set
    }

    @Test
    void testCreateUserUnexpectedConflictError() {
        RegisterRequest registerRequest = new RegisterRequest();
        registerRequest.setUsername("testuser");
        registerRequest.setPassword("password");
        registerRequest.setEmail("testuser@example.com");

        // Mock the behavior of creating a user
        when(usersResource.create(any(UserRepresentation.class))).thenReturn(response);
        when(response.getStatus()).thenReturn(409); // Simulate conflict status
        when(response.readEntity(String.class)).thenReturn("Unexpected conflict error"); // Simulate an unexpected error message

        RegisterResponse result = userServiceImpl.createUser(registerRequest);

        // Verify the response when an unexpected conflict error occurs
        assertEquals(409, result.getStatus());
        assertEquals("User creation failed: Unexpected conflict error", result.getMessage());
    }
}