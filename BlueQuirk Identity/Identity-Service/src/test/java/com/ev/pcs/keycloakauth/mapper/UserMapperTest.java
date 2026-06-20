package com.ev.pcs.keycloakauth.mapper;

import com.ev.pcs.keycloakauth.dto.UserDto;
import org.assertj.core.api.AssertionsForClassTypes;
import org.junit.jupiter.api.Test;
import org.keycloak.representations.idm.UserRepresentation;

import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.AssertionsForClassTypes.assertThat;
import static org.assertj.core.api.AssertionsForClassTypes.assertThatThrownBy;
import static org.junit.jupiter.api.Assertions.*;

class UserMapperTest {

    UserMapper underTest = new UserMapper();

    @Test
    void shouldMapUserRepresentationToUserDto() {
        UserRepresentation givenUserRepresentation = new UserRepresentation();
        givenUserRepresentation.setId("14550774-22b2-4513-b4eb-10fc5452979a");
        givenUserRepresentation.setFirstName("houcine");
        givenUserRepresentation.setLastName("chakra");
        givenUserRepresentation.setUsername("chakraHs");
        givenUserRepresentation.setEmail("chakra@gmail.com");
        // Initialize attributes map
        Map<String, List<String>> attributes = new HashMap<>();
        attributes.put("imageUrl", Collections.singletonList("image.jpeg"));
        givenUserRepresentation.setAttributes(attributes);
        givenUserRepresentation.setEmailVerified(true);

        UserDto expectedUserDto = UserDto.builder()
                .id("14550774-22b2-4513-b4eb-10fc5452979a").firstName("houcine").lastName("chakra").username("chakraHs").email("chakra@gmail.com")
                .imageUrl("image.jpeg").activated(true)
                .build();
        UserDto actualUserDto = underTest.toUserDto(givenUserRepresentation);;

        assertThat(expectedUserDto).isNotNull();
        assertThat(actualUserDto).usingRecursiveComparison().isEqualTo(expectedUserDto);
    }

    @Test
    void shouldNotMapUserRepresentationToUserDto() {
        UserRepresentation givenUserRepresentation = null;
        assertThatThrownBy(()->underTest.toUserDto(givenUserRepresentation))
                .isInstanceOf(IllegalArgumentException.class);
    }
}