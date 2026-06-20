package com.ev.pcs.keycloakauth.mapper;

import com.ev.pcs.keycloakauth.dto.RegisterRequest;
import com.ev.pcs.keycloakauth.dto.UpdateRequest;
import com.ev.pcs.keycloakauth.dto.UserDto;
import org.keycloak.representations.idm.CredentialRepresentation;
import org.keycloak.representations.idm.UserRepresentation;
import org.modelmapper.ModelMapper;
import org.springframework.stereotype.Service;

import java.security.SecureRandom;
import java.time.Instant;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class UserMapper {
    private ModelMapper modelMapper = new ModelMapper();

    public UserDto toUserDto(UserRepresentation user) {
        UserDto userDto = modelMapper.map(user, UserDto.class);
        // Map emailVerified to activated
        userDto.setActivated(user.isEmailVerified());

        // Map imageUrl from attributes
        Map<String, List<String>> attributes = user.getAttributes();
        if (attributes != null && attributes.containsKey("imageUrl")) {
            List<String> imageUrls = attributes.get("imageUrl");
            if (imageUrls != null && !imageUrls.isEmpty()) {
                userDto.setImageUrl(imageUrls.get(0));
            }
        }

        // Extract createdDate from attributes
        if (attributes != null &&attributes.containsKey("createdDate")) {
            List<String> createdDateList = attributes.get("createdDate");
            if (createdDateList != null && !createdDateList.isEmpty()) {
                userDto.setCreatedDate(createdDateList.get(0)); // Assuming only one date
            }
        }

        return userDto;
    }


    public List<UserDto> toUserDtos(List<UserRepresentation> users) {
        return users.stream().map(u->modelMapper.map(u,UserDto.class)).collect(Collectors.toList());
    }

    public UserRepresentation toUserRepresentation(RegisterRequest registerRequest){
        UserRepresentation userRepresentation = new UserRepresentation();
        modelMapper.map(registerRequest,userRepresentation);
        userRepresentation.setEnabled(true);
        userRepresentation.setEmailVerified(false);

        // Initialize attributes map
        Map<String, List<String>> attributes = new HashMap<>();

        // Set createdDate to the current time
        String createdDate = Instant.now().toString();
        attributes.put("createdDate", Collections.singletonList(createdDate));

        String activationKey = generateMixedActivationKey();
        attributes.put("activationKey", Collections.singletonList(activationKey));

        userRepresentation.setAttributes(attributes);

        // Set password
        if (registerRequest.getPassword() != null) {
            CredentialRepresentation credential = new CredentialRepresentation();
            credential.setTemporary(false);
            credential.setType(CredentialRepresentation.PASSWORD);
            credential.setValue(registerRequest.getPassword());
            userRepresentation.setCredentials(Collections.singletonList(credential));
        }
        return userRepresentation;
    }

    public String generateMixedActivationKey() {
        final String CHARACTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
        final int KEY_LENGTH = 6; // Length of the activation key

        SecureRandom random = new SecureRandom();
        StringBuilder sb = new StringBuilder(KEY_LENGTH);

        for (int i = 0; i < KEY_LENGTH; i++) {
            int index = random.nextInt(CHARACTERS.length());
            sb.append(CHARACTERS.charAt(index));
        }
        return sb.toString();
    }

    public void updateUserRepresentation(UserRepresentation userRepresentation, UpdateRequest updateRequest) {
        if (updateRequest.getEmail() != null) {
            userRepresentation.setEmail(updateRequest.getEmail());
        }
        if (updateRequest.getFirstName() != null) {
            userRepresentation.setFirstName(updateRequest.getFirstName());
        }
        if (updateRequest.getLastName() != null) {
            userRepresentation.setLastName(updateRequest.getLastName());
        }
    }

}
