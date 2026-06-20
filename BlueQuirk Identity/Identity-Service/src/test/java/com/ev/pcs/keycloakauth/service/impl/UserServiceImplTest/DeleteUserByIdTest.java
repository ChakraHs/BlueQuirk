package com.ev.pcs.keycloakauth.service.impl.UserServiceImplTest;

import com.ev.pcs.keycloakauth.service.KeycloakService;
import com.ev.pcs.keycloakauth.service.impl.UserServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.keycloak.admin.client.Keycloak;
import org.keycloak.admin.client.resource.RealmResource;
import org.keycloak.admin.client.resource.UserResource;
import org.keycloak.admin.client.resource.UsersResource;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.test.util.ReflectionTestUtils;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class DeleteUserByIdTest {

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

    private static final Logger log = LoggerFactory.getLogger(DeleteUserByIdTest.class);

    @BeforeEach
    void setUp() {
        when(keycloakService.getKeycloakInstance()).thenReturn(keycloak);
        lenient().when(keycloak.realm(realm)).thenReturn(realmResource);
        lenient().when(realmResource.users()).thenReturn(usersResource);
        ReflectionTestUtils.setField(userServiceImpl, "realm", realm);
    }

    @Test
    void testDeleteUserSuccess() {
        // Given
        String userId = "12345";
        when(usersResource.get(userId)).thenReturn(userResource);

        // When
        userServiceImpl.deleteUser(userId);

        // Then
        verify(userResource).remove();
    }

    @Test
    void testDeleteUserRemovalError() {
        // Given
        String userId = "12345";
        when(keycloakService.getKeycloakInstance()).thenReturn(keycloak);
        when(keycloak.realm(realm)).thenReturn(realmResource);
        when(realmResource.users()).thenReturn(usersResource);
        when(usersResource.get(userId)).thenReturn(userResource);
        doThrow(new RuntimeException("Removal error")).when(userResource).remove();

        // When / Then
        RuntimeException thrown = assertThrows(RuntimeException.class, () -> {
            userServiceImpl.deleteUser(userId);
        });
        assertEquals("Failed to delete user", thrown.getMessage());
    }

    @Test
    void testDeleteUserKeycloakError() {
        // Given
        String userId = "12345";
        when(keycloakService.getKeycloakInstance()).thenThrow(new RuntimeException("Keycloak instance error"));

        // When / Then
        RuntimeException thrown = assertThrows(RuntimeException.class, () -> {
            userServiceImpl.deleteUser(userId);
        });
        assertEquals("Failed to delete user", thrown.getMessage());
    }
}
