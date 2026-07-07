package shop.bluequirk.blue_quirk_backend.identity.config;

import java.util.List;
import java.util.Set;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import shop.bluequirk.blue_quirk_backend.entity.User;
import shop.bluequirk.blue_quirk_backend.identity.permission.Permission;
import shop.bluequirk.blue_quirk_backend.identity.permission.PermissionRepository;
import shop.bluequirk.blue_quirk_backend.identity.role.Role;
import shop.bluequirk.blue_quirk_backend.identity.role.RoleRepository;
import shop.bluequirk.blue_quirk_backend.identity.user.UserAccountService;
import shop.bluequirk.blue_quirk_backend.repository.UserRepository;

/**
 * Idempotent bootstrap for the Identity Domain: seeds the baseline roles and
 * permissions, backfills legacy user rows (assign the customer role, mark them
 * verified since Keycloak already verified them), and provisions an admin account
 * from AUTH_ADMIN_EMAIL / AUTH_ADMIN_PASSWORD so admin access never depends on the
 * Keycloak migration succeeding.
 */
@Component
@Order(1)
public class IdentityDataInitializer implements ApplicationRunner {

    private static final Logger LOG = LoggerFactory.getLogger(IdentityDataInitializer.class);

    // Baseline permission catalogue. Extend as business modules adopt @PreAuthorize.
    private static final List<String> ADMIN_PERMISSIONS = List.of(
            "PRODUCT_READ", "PRODUCT_WRITE",
            "ORDER_READ", "ORDER_WRITE",
            "USER_READ", "USER_WRITE",
            "SETTINGS_WRITE", "ANALYTICS_READ");
    private static final List<String> CUSTOMER_PERMISSIONS = List.of(
            "PRODUCT_READ", "ORDER_READ", "ORDER_WRITE");

    private final RoleRepository roleRepository;
    private final PermissionRepository permissionRepository;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Value("${bluequirk.security.bootstrap.admin-email:}")
    private String adminEmail;

    @Value("${bluequirk.security.bootstrap.admin-password:}")
    private String adminPassword;

    @Value("${bluequirk.security.bootstrap.admin-name:BlueQuirk Admin}")
    private String adminName;

    public IdentityDataInitializer(RoleRepository roleRepository, PermissionRepository permissionRepository,
                                   UserRepository userRepository, PasswordEncoder passwordEncoder) {
        this.roleRepository = roleRepository;
        this.permissionRepository = permissionRepository;
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        Role adminRole = seedRole(UserAccountService.ROLE_ADMIN, "Full administrative access", ADMIN_PERMISSIONS);
        Role customerRole = seedRole(UserAccountService.ROLE_CUSTOMER, "Storefront customer", CUSTOMER_PERMISSIONS);
        backfillLegacyUsers(customerRole);
        bootstrapAdmin(adminRole);
    }

    private Role seedRole(String name, String description, List<String> permissionNames) {
        Role role = roleRepository.findByName(name).orElseGet(() -> new Role(name, description));
        for (String pName : permissionNames) {
            Permission permission = permissionRepository.findByName(pName)
                    .orElseGet(() -> permissionRepository.save(new Permission(pName)));
            role.getPermissions().add(permission);
        }
        return roleRepository.save(role);
    }

    /** Legacy (Keycloak-provisioned) rows: give them the customer role + verified flag. */
    private void backfillLegacyUsers(Role customerRole) {
        int updated = 0;
        for (User user : userRepository.findAll()) {
            boolean changed = false;
            if (user.getRoles().isEmpty()) {
                user.addRole(customerRole);
                changed = true;
            }
            if (user.getKeycloakId() != null && !user.isEmailVerified()) {
                user.setEmailVerified(true); // already verified in Keycloak
                changed = true;
            }
            if (changed) {
                userRepository.save(user);
                updated++;
            }
        }
        if (updated > 0) {
            LOG.info("Identity backfill: updated {} legacy user row(s)", updated);
        }
    }

    private void bootstrapAdmin(Role adminRole) {
        if (!StringUtils.hasText(adminEmail)) {
            return;
        }
        String email = adminEmail.trim().toLowerCase();
        User admin = userRepository.findByEmail(email).orElse(null);
        if (admin == null) {
            if (!StringUtils.hasText(adminPassword)) {
                LOG.warn("bootstrap.admin-email set but admin-password missing; skipping admin creation");
                return;
            }
            admin = new User();
            admin.setEmail(email);
            admin.setName(adminName);
            admin.setPasswordHash(passwordEncoder.encode(adminPassword));
            admin.setEnabled(true);
            admin.setEmailVerified(true);
            admin.setRoles(Set.of(adminRole));
            userRepository.save(admin);
            LOG.info("Bootstrapped admin account {}", email);
        } else if (admin.getRoles().stream().noneMatch(r -> r.getName().equals(UserAccountService.ROLE_ADMIN))) {
            admin.addRole(adminRole);
            userRepository.save(admin);
            LOG.info("Granted admin role to existing account {}", email);
        }
    }
}
