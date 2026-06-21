package shop.bluequirk.blue_quirk_backend.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import shop.bluequirk.blue_quirk_backend.entity.User;
import shop.bluequirk.blue_quirk_backend.repository.UserRepository;

/**
 * Just-in-time (JIT) provisioning of the local {@code users} row from a Keycloak
 * JWT. Keycloak stays the source of truth for identity/credentials; this keeps a
 * local row (keyed by the JWT {@code sub}) so the shop backend can hang app data
 * — orders, etc. — off a stable user reference.
 *
 * <p>Called on the first authenticated request that carries a valid token (see
 * {@code JitUserProvisioningFilter}). Existing rows that match by email but were
 * created without a Keycloak link (e.g. seed/admin rows) get linked in place
 * rather than duplicated.
 */
@Service
public class UserProvisioningService {

    private static final Logger LOG = LoggerFactory.getLogger(UserProvisioningService.class);

    private final UserRepository userRepository;

    public UserProvisioningService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @Transactional
    public void provisionFromJwt(Jwt jwt) {
        String keycloakId = jwt.getSubject();
        if (keycloakId == null || keycloakId.isBlank()) {
            return;
        }
        // Fast path: already linked.
        if (userRepository.findByKeycloakId(keycloakId).isPresent()) {
            return;
        }

        String email = jwt.getClaimAsString("email");
        String name = resolveName(jwt);

        // Link an existing row by email if one exists; otherwise create a new one.
        User user = (email != null ? userRepository.findByEmail(email) : java.util.Optional.<User>empty())
                .orElseGet(User::new);

        user.setKeycloakId(keycloakId);
        if (user.getEmail() == null && email != null) {
            user.setEmail(email);
        }
        if (user.getName() == null) {
            user.setName(name != null ? name : (email != null ? email : keycloakId));
        }

        try {
            userRepository.save(user);
            LOG.info("JIT-provisioned local user for keycloakId={} (email={})", keycloakId, email);
        } catch (DataIntegrityViolationException e) {
            // Another concurrent request provisioned the same user — harmless.
            LOG.debug("Concurrent provisioning for keycloakId={} ignored", keycloakId);
        }
    }

    private String resolveName(Jwt jwt) {
        String name = jwt.getClaimAsString("name");
        if (name != null && !name.isBlank()) {
            return name;
        }
        String given = jwt.getClaimAsString("given_name");
        String family = jwt.getClaimAsString("family_name");
        String combined = ((given != null ? given : "") + " " + (family != null ? family : "")).trim();
        if (!combined.isBlank()) {
            return combined;
        }
        return jwt.getClaimAsString("preferred_username");
    }
}
