package com.ev.pcs.keycloakauth.service.impl.UserServiceImplTest;

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
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class GetUserByIdTest {
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
        when(keycloak.realm(realm)).thenReturn(realmResource);
        when(realmResource.users()).thenReturn(usersResource);
        ReflectionTestUtils.setField(userServiceImpl, "realm", realm);
    }

    @Test
    void testGetUserByIdSuccess() {
        // Given
        String userId = "12345";
        UserRepresentation userRepresentation = new UserRepresentation();
        UserDto userDto = new UserDto();
        // Set properties on userRepresentation and userDto as needed

        when(usersResource.get(userId)).thenReturn(userResource);
        when(userResource.toRepresentation()).thenReturn(userRepresentation);
//        when(userServiceImpl.mapUserDto(userRepresentation)).thenReturn(userDto);

        // When
        UserDto result = userServiceImpl.getUserById(userId);

        // Then
        assertNotNull(result);
        assertThat(result).usingRecursiveComparison().isEqualTo(userDto);
    }

    @Test
    void testGetUserByIdNotFound() {
        // Given
        String userId = "12345";

        when(usersResource.get(userId)).thenReturn(userResource);
        when(userResource.toRepresentation()).thenReturn(null);

        // When
        UserDto result = userServiceImpl.getUserById(userId);

        // Then
        assertNull(result);
    }

    @Test
    void testGetUserByIdError() {
        // Given
        String userId = "12345";

        when(usersResource.get(userId)).thenReturn(userResource);
        when(userResource.toRepresentation()).thenThrow(new RuntimeException("Some error"));

        // When
        UserDto result = userServiceImpl.getUserById(userId);

        // Then
        assertNull(result);
    }
}
