package shop.bluequirk.blue_quirk_backend.identity.user;

import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import shop.bluequirk.blue_quirk_backend.entity.User;
import shop.bluequirk.blue_quirk_backend.identity.exception.IdentityExceptions;
import shop.bluequirk.blue_quirk_backend.identity.role.Role;
import shop.bluequirk.blue_quirk_backend.identity.role.RoleRepository;
import shop.bluequirk.blue_quirk_backend.repository.UserRepository;

/** Admin operations over the user directory (replaces the Keycloak user CRUD). */
@Service
public class UserAdminService {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;

    public UserAdminService(UserRepository userRepository, RoleRepository roleRepository) {
        this.userRepository = userRepository;
        this.roleRepository = roleRepository;
    }

    @Transactional(readOnly = true)
    public List<AdminUserView> listAll() {
        return userRepository.findAll().stream().map(this::toView).toList();
    }

    @Transactional(readOnly = true)
    public AdminUserView getById(Long id) {
        return toView(load(id));
    }

    @Transactional
    public AdminUserView update(Long id, UpdateUserRequest req) {
        User user = load(id);
        if (req.name() != null && !req.name().isBlank()) {
            user.setName(req.name().trim());
        }
        if (req.enabled() != null) {
            user.setEnabled(req.enabled());
        }
        if (req.roles() != null) {
            Set<Role> resolved = new HashSet<>();
            for (String roleName : req.roles()) {
                resolved.add(roleRepository.findByName(roleName)
                        .orElseThrow(() -> new IdentityExceptions.NotFound("Role '" + roleName + "'")));
            }
            user.setRoles(resolved);
        }
        return toView(userRepository.save(user));
    }

    @Transactional
    public void delete(Long id) {
        User user = load(id);
        userRepository.delete(user);
    }

    private User load(Long id) {
        return userRepository.findById(id).orElseThrow(() -> new IdentityExceptions.NotFound("User"));
    }

    private AdminUserView toView(User u) {
        return new AdminUserView(
                u.getId(), u.getEmail(), u.getName(), u.isEnabled(), u.isEmailVerified(),
                u.getRoles().stream().map(Role::getName).collect(Collectors.toSet()),
                u.getCreatedAt() == null ? null : u.getCreatedAt().toString());
    }
}
