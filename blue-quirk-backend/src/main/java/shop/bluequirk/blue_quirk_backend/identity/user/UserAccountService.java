package shop.bluequirk.blue_quirk_backend.identity.user;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import shop.bluequirk.blue_quirk_backend.entity.User;
import shop.bluequirk.blue_quirk_backend.identity.exception.IdentityExceptions;
import shop.bluequirk.blue_quirk_backend.identity.role.Role;
import shop.bluequirk.blue_quirk_backend.identity.role.RoleRepository;
import shop.bluequirk.blue_quirk_backend.repository.UserRepository;

/**
 * Owns the lifecycle of the {@link User} account: creation, role assignment, profile
 * and password mutations. Business modules never touch this — they only read the
 * authenticated principal from the security context.
 */
@Service
public class UserAccountService {

    public static final String ROLE_CUSTOMER = "user";
    public static final String ROLE_ADMIN = "admin";

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;

    public UserAccountService(UserRepository userRepository, RoleRepository roleRepository,
                              PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.roleRepository = roleRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Transactional(readOnly = true)
    public User getById(Long id) {
        return userRepository.findById(id).orElseThrow(() -> new IdentityExceptions.NotFound("User"));
    }

    @Transactional
    public User registerCustomer(String email, String name, String rawPassword) {
        String normalizedEmail = email.trim().toLowerCase();
        if (userRepository.findByEmail(normalizedEmail).isPresent()) {
            throw new IdentityExceptions.EmailAlreadyExists();
        }
        User user = new User();
        user.setEmail(normalizedEmail);
        user.setName(name.trim());
        user.setPasswordHash(passwordEncoder.encode(rawPassword));
        user.setEnabled(true);
        user.setEmailVerified(false);
        user.addRole(requireRole(ROLE_CUSTOMER));
        return userRepository.save(user);
    }

    @Transactional
    public User updateProfile(User user, String name) {
        user.setName(name.trim());
        return userRepository.save(user);
    }

    @Transactional
    public void updatePassword(User user, String newRawPassword) {
        user.setPasswordHash(passwordEncoder.encode(newRawPassword));
        userRepository.save(user);
    }

    private Role requireRole(String name) {
        return roleRepository.findByName(name)
                .orElseThrow(() -> new IllegalStateException("Role '" + name + "' is not seeded"));
    }
}
