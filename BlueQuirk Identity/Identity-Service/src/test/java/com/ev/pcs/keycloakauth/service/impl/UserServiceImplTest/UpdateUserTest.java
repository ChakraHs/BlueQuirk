package com.ev.pcs.keycloakauth.service.impl.UserServiceImplTest;

import com.ev.pcs.keycloakauth.dto.UpdateRequest;
import com.ev.pcs.keycloakauth.dto.UserDto;
import com.ev.pcs.keycloakauth.service.KeycloakService;
import com.ev.pcs.keycloakauth.service.impl.UserServiceImpl;
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

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class UpdateUserTest {

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

    @InjectMocks
    private UserServiceImpl userServiceImpl;

    private String realm = "ec-realm";

    @BeforeEach
    void setUp() {
        when(keycloakService.getKeycloakInstance()).thenReturn(keycloak);
        lenient().when(keycloak.realm(realm)).thenReturn(realmResource);
        lenient().when(realmResource.users()).thenReturn(usersResource);
        ReflectionTestUtils.setField(userServiceImpl, "realm", realm);
    }

    @Test
    void testUpdateUserSuccess() {
        // Given
        String userId = "12345";
        UpdateRequest updateRequest = new UpdateRequest();
        UserRepresentation userRepresentation = new UserRepresentation();
        UserDto userDto = new UserDto();
        // Set properties on userRepresentation, updateRequest, and userDto as needed

        when(usersResource.get(userId)).thenReturn(userResource);
        when(userResource.toRepresentation()).thenReturn(userRepresentation);
//        when(userServiceImpl.mapUserDto(userRepresentation)).thenReturn(userDto);

        // When
        UserDto result = userServiceImpl.updateUser(userId, updateRequest);

        // Then
        verify(userResource).update(userRepresentation);
        assertNotNull(result);
        assertThat(result).usingRecursiveComparison().isEqualTo(userDto);
    }

    @Test
    void testUpdateUserNotFound() {
        // Given
        String userId = "12345";
        UpdateRequest updateRequest = new UpdateRequest();

        when(usersResource.get(userId)).thenReturn(userResource);
        when(userResource.toRepresentation()).thenReturn(null);

        // When / Then
        RuntimeException thrown = assertThrows(RuntimeException.class, () -> {
            userServiceImpl.updateUser(userId, updateRequest);
        });
        assertEquals("User with ID " + userId + " not found", thrown.getMessage());
    }

    @Test
    void testUpdateUserRetrievalError() {
        // Given
        String userId = "12345";
        UpdateRequest updateRequest = new UpdateRequest();

        when(usersResource.get(userId)).thenReturn(userResource);
        when(userResource.toRepresentation()).thenThrow(new RuntimeException("Retrieval error"));

        // When / Then
        RuntimeException thrown = assertThrows(RuntimeException.class, () -> {
            userServiceImpl.updateUser(userId, updateRequest);
        });
        assertEquals("Failed to retrieve user", thrown.getMessage());
    }

    @Test
    void testUpdateUserUpdateError() {
        // Given
        String userId = "12345";
        UpdateRequest updateRequest = new UpdateRequest();
        UserRepresentation userRepresentation = new UserRepresentation();

        when(usersResource.get(userId)).thenReturn(userResource);
        when(userResource.toRepresentation()).thenReturn(userRepresentation);
        doThrow(new RuntimeException("Update error")).when(userResource).update(userRepresentation);

        // When / Then
        RuntimeException thrown = assertThrows(RuntimeException.class, () -> {
            userServiceImpl.updateUser(userId, updateRequest);
        });
        assertEquals("Failed to update user", thrown.getMessage());
    }

    @Test
    void testUpdateUserKeycloakError() {
        // Given
        String userId = "12345";
        UpdateRequest updateRequest = new UpdateRequest();

        when(keycloakService.getKeycloakInstance()).thenThrow(new RuntimeException("Keycloak instance error"));

        // When / Then
        RuntimeException thrown = assertThrows(RuntimeException.class, () -> {
            userServiceImpl.updateUser(userId, updateRequest);
        });
        assertEquals("Keycloak instance error", thrown.getMessage());
    }
}
