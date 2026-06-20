package com.ev.pcs.keycloakauth.service;

import com.ev.pcs.keycloakauth.dto.RegisterRequest;
import com.ev.pcs.keycloakauth.dto.RegisterResponse;
import com.ev.pcs.keycloakauth.dto.UpdateRequest;
import com.ev.pcs.keycloakauth.dto.UserDto;

import java.util.List;

public interface UserService {
    RegisterResponse createUser(RegisterRequest registerRequest);
    List<UserDto> getUsers();
    UserDto getUserById(String id);
    void deleteUser(String id);
    UserDto updateUser(String id, UpdateRequest updateRequest);
    void emailVerification(String userId);
}

