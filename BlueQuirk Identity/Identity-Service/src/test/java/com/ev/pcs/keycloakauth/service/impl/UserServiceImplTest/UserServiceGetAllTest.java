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
import org.mockito.Mockito;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.Arrays;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class UserServiceGetAllTest {

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

    @BeforeEach
    void setUp() {
        when(keycloakService.getKeycloakInstance()).thenReturn(keycloak);
        doReturn(realmResource).when(keycloak).realm("ec-realm");
        when(realmResource.users()).thenReturn(usersResource);
        ReflectionTestUtils.setField(userServiceImpl, "realm", "ec-realm");
    }

    @Test
    void testGetUsers() {
        UserRepresentation userRepresentation1 = new UserRepresentation();
        userRepresentation1.setId("1");
        userRepresentation1.setUsername("user1");

        UserRepresentation userRepresentation2 = new UserRepresentation();
        userRepresentation2.setId("2");
        userRepresentation2.setUsername("user2");

        List<UserRepresentation> userRepresentations = Arrays.asList(userRepresentation1, userRepresentation2);

        when(usersResource.list()).thenReturn(userRepresentations);

        // Call the method under test
        List<UserDto> result = userServiceImpl.getUsers();

        // Validate the results
        assertEquals(2, result.size());
        assertEquals("1", result.get(0).getId());
        assertEquals("user1", result.get(0).getUsername());
        assertEquals("2", result.get(1).getId());
        assertEquals("user2", result.get(1).getUsername());
    }
}
