package com.ev.pcs.keycloakauth.controller;

import com.ev.pcs.keycloakauth.dto.RegisterRequest;
import com.ev.pcs.keycloakauth.dto.RegisterResponse;
import com.ev.pcs.keycloakauth.dto.UpdateRequest;
import com.ev.pcs.keycloakauth.dto.UserDto;
import com.ev.pcs.keycloakauth.service.UserService;
import jakarta.validation.Valid;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.util.Collections;
import java.util.List;

@RestController
@Validated
public class UserController {

    private static final Logger log = LoggerFactory.getLogger(UserController.class);

    @Autowired
    private UserService userService;

    @PostMapping("/register")
    public ResponseEntity<RegisterResponse> createUser(@Valid @RequestBody RegisterRequest registerRequest) {
        RegisterResponse createdUserResponse = userService.createUser(registerRequest);
        // Determine the appropriate HTTP status code based on the ApiResponse
        HttpStatus status;
        switch (createdUserResponse.getStatus()) {
            case 201:
                status = HttpStatus.CREATED;
                break;
            case 409:
                status = HttpStatus.CONFLICT;
                break;
            default:
                status = HttpStatus.INTERNAL_SERVER_ERROR; // or any other appropriate status
                break;
        }
        return ResponseEntity.status(status).body(createdUserResponse);
    }

    @GetMapping("/users")
    @PreAuthorize("hasAuthority('admin')")
    public ResponseEntity<List<UserDto>> getUsers() {
        try {
            List<UserDto> userDtos = userService.getUsers();

            // Check if the user list is empty
            if (userDtos.isEmpty()) {
                // Return 204 No Content if no users are found
                return ResponseEntity.noContent().build();
            }

            // Return 200 OK with the user list
            return ResponseEntity.ok(userDtos);

        } catch (Exception e) {
            // Log the error
            log.error("Failed to retrieve users: {}", e.getMessage());

            // Return 500 Internal Server Error with an error message
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Collections.singletonList(null));
        }
    }


    @GetMapping("/user/{id}")
    @PreAuthorize("@customSecurityService.isUserId(authentication, #id) or hasAuthority('admin')")
    public ResponseEntity<UserDto> getUserById(@PathVariable String id) {
        UserDto userDto = userService.getUserById(id);
        if (userDto != null) {
            return ResponseEntity.ok(userDto);
        } else {
            return ResponseEntity.notFound().build();
        }
    }

    @DeleteMapping("/user/{id}")
    @PreAuthorize("@customSecurityService.isUserId(authentication, #id) or hasAuthority('admin')")
    public ResponseEntity<Void> deleteUser(@PathVariable String id) {
        userService.deleteUser(id);
        return ResponseEntity.noContent().build();
    }

    @PutMapping("/user/{id}")
    @PreAuthorize("@customSecurityService.isUserId(authentication, #id) or hasAuthority('admin')")
    public ResponseEntity<UserDto> updateUser(@PathVariable String id, @RequestBody UpdateRequest updateRequest) {
        UserDto updatedUserDto = userService.updateUser(id, updateRequest);
        if (updatedUserDto != null) {
            return ResponseEntity.ok(updatedUserDto);
        } else {
            return ResponseEntity.notFound().build();
        }
    }

    @PutMapping("/user/{id}/send-verifyEmail")
    public void sendVerificationEmail(@PathVariable String id) {
        userService.emailVerification(id);
    }
}
