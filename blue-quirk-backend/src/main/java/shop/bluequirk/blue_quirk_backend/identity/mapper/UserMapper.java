package shop.bluequirk.blue_quirk_backend.identity.mapper;

import java.util.stream.Collectors;

import org.springframework.stereotype.Component;

import shop.bluequirk.blue_quirk_backend.entity.User;
import shop.bluequirk.blue_quirk_backend.identity.dto.UserResponse;
import shop.bluequirk.blue_quirk_backend.identity.role.Role;

@Component
public class UserMapper {

    public UserResponse toResponse(User user) {
        return new UserResponse(
                user.getId(),
                user.getEmail(),
                user.getName(),
                user.isEmailVerified(),
                user.getRoles().stream().map(Role::getName).collect(Collectors.toSet()));
    }
}
