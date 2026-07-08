package shop.bluequirk.blue_quirk_backend.identity.migration;

import java.io.File;
import java.time.Instant;
import java.util.Optional;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import shop.bluequirk.blue_quirk_backend.entity.User;
import shop.bluequirk.blue_quirk_backend.identity.config.IdentityProperties;
import shop.bluequirk.blue_quirk_backend.identity.role.Role;
import shop.bluequirk.blue_quirk_backend.identity.role.RoleRepository;
import shop.bluequirk.blue_quirk_backend.identity.security.KeycloakPbkdf2PasswordEncoder;
import shop.bluequirk.blue_quirk_backend.identity.security.TokenGenerator;
import shop.bluequirk.blue_quirk_backend.identity.token.PasswordResetToken;
import shop.bluequirk.blue_quirk_backend.identity.token.PasswordResetTokenRepository;
import shop.bluequirk.blue_quirk_backend.identity.user.UserAccountService;
import shop.bluequirk.blue_quirk_backend.repository.UserRepository;

/**
 * Imports users from a Keycloak realm export JSON into the native Identity Domain.
 *
 * <p>Strategy (Phase 7):
 * <ul>
 *   <li>If a user's PBKDF2 credential is present, store it in a format the
 *       {@link KeycloakPbkdf2PasswordEncoder} can verify — the password is then
 *       lazily re-hashed to BCrypt on the user's next login (no reset needed).</li>
 *   <li>Otherwise migrate the account, flag {@code passwordResetRequired}, and
 *       generate a password-reset token so the operator can invite the user to set
 *       a new password.</li>
 * </ul>
 *
 * <p>Idempotent: users are matched by email; an account that already has a BCrypt
 * password (the user set their own) is never overwritten. Roles and profile are
 * preserved. Re-running produces the same state.
 */
@Service
public class KeycloakRealmImportService {

    private static final Logger LOG = LoggerFactory.getLogger(KeycloakRealmImportService.class);

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final PasswordResetTokenRepository resetTokenRepository;
    private final TokenGenerator tokenGenerator;
    private final IdentityProperties props;
    private final ObjectMapper objectMapper;

    public KeycloakRealmImportService(UserRepository userRepository, RoleRepository roleRepository,
                                      PasswordResetTokenRepository resetTokenRepository,
                                      TokenGenerator tokenGenerator, IdentityProperties props,
                                      ObjectMapper objectMapper) {
        this.userRepository = userRepository;
        this.roleRepository = roleRepository;
        this.resetTokenRepository = resetTokenRepository;
        this.tokenGenerator = tokenGenerator;
        this.props = props;
        this.objectMapper = objectMapper;
    }

    public record ImportResult(int total, int withPassword, int requiresReset, int skipped) {}

    @Transactional
    public ImportResult importFromFile(File exportFile) throws Exception {
        JsonNode root = objectMapper.readTree(exportFile);
        JsonNode users = root.path("users");
        if (!users.isArray()) {
            LOG.warn("Keycloak export {} has no 'users' array; nothing to import", exportFile.getName());
            return new ImportResult(0, 0, 0, 0);
        }

        int withPassword = 0, requiresReset = 0, skipped = 0;
        for (JsonNode ku : users) {
            String email = text(ku, "email");
            if (email == null || email.isBlank()) {
                skipped++;
                continue;
            }
            email = email.trim().toLowerCase();

            User user = userRepository.findByEmail(email).orElseGet(User::new);
            boolean alreadyBcrypt = user.getPasswordHash() != null
                    && user.getPasswordHash().startsWith("{bcrypt}");

            if (user.getId() == null) {
                user.setEmail(email);
            }
            user.setName(resolveName(ku, email));
            if (user.getKeycloakId() == null) {
                user.setKeycloakId(text(ku, "id"));
            }
            user.setEnabled(ku.path("enabled").asBoolean(true));
            user.setEmailVerified(ku.path("emailVerified").asBoolean(true));
            assignRoles(user, ku);

            if (alreadyBcrypt) {
                // User already set a native password; never clobber it.
                userRepository.save(user);
                skipped++;
                continue;
            }

            String importedHash = extractPbkdf2Hash(ku);
            if (importedHash != null) {
                user.setPasswordHash(importedHash);
                user.setPasswordResetRequired(false);
                userRepository.save(user);
                withPassword++;
            } else {
                user.setPasswordHash(null);
                user.setPasswordResetRequired(true);
                userRepository.save(user);
                issueResetToken(user);
                requiresReset++;
            }
        }

        ImportResult result = new ImportResult(withPassword + requiresReset + skipped,
                withPassword, requiresReset, skipped);
        LOG.info("Keycloak import complete: {} total, {} with password (lazy re-hash), {} require reset, {} skipped",
                result.total(), result.withPassword(), result.requiresReset(), result.skipped());
        return result;
    }

    private void assignRoles(User user, JsonNode ku) {
        JsonNode realmRoles = ku.path("realmRoles");
        boolean assignedAny = false;
        if (realmRoles.isArray()) {
            for (JsonNode r : realmRoles) {
                Optional<Role> role = roleRepository.findByName(r.asText());
                if (role.isPresent()) {
                    user.addRole(role.get());
                    assignedAny = true;
                }
            }
        }
        // Every account is at least a customer.
        if (user.getRoles().isEmpty() || !assignedAny) {
            roleRepository.findByName(UserAccountService.ROLE_CUSTOMER).ifPresent(user::addRole);
        }
    }

    /** Build a verify-able hash string, or null if no supported PBKDF2 credential. */
    private String extractPbkdf2Hash(JsonNode ku) {
        JsonNode credentials = ku.path("credentials");
        if (!credentials.isArray()) {
            return null;
        }
        for (JsonNode cred : credentials) {
            if (!"password".equals(text(cred, "type"))) {
                continue;
            }
            try {
                JsonNode secret = asJson(cred.get("secretData"));
                JsonNode data = asJson(cred.get("credentialData"));
                if (secret == null || data == null) {
                    continue;
                }
                String algorithm = text(data, "algorithm"); // pbkdf2-sha256 / pbkdf2-sha512
                int iterations = data.path("hashIterations").asInt(0);
                String salt = text(secret, "salt");
                String value = text(secret, "value");
                if (algorithm == null || iterations <= 0 || salt == null || value == null) {
                    continue;
                }
                String prefix = switch (algorithm) {
                    case "pbkdf2-sha256" -> KeycloakPbkdf2PasswordEncoder.ID_SHA256;
                    case "pbkdf2-sha512" -> KeycloakPbkdf2PasswordEncoder.ID_SHA512;
                    default -> null;
                };
                if (prefix == null) {
                    return null; // unsupported algorithm (e.g. argon2) → force reset
                }
                return "{" + prefix + "}" + iterations + "$" + salt + "$" + value;
            } catch (Exception e) {
                LOG.debug("Could not parse credential for import: {}", e.getMessage());
            }
        }
        return null;
    }

    private void issueResetToken(User user) {
        resetTokenRepository.invalidateAllForUser(user);
        String raw = tokenGenerator.generateRawToken();
        PasswordResetToken token = new PasswordResetToken();
        token.setUser(user);
        token.setTokenHash(tokenGenerator.hash(raw));
        // Give migrated users a generous window to set their password.
        token.setExpiresAt(Instant.now().plus(props.getTokens().getResetTtl().multipliedBy(48)));
        resetTokenRepository.save(token);
        // Raw token intentionally not logged; operator triggers the reset email flow.
    }

    private String resolveName(JsonNode ku, String email) {
        String first = text(ku, "firstName");
        String last = text(ku, "lastName");
        String combined = ((first != null ? first : "") + " " + (last != null ? last : "")).trim();
        if (!combined.isBlank()) return combined;
        String username = text(ku, "username");
        return username != null ? username : email;
    }

    /** Keycloak stores secretData/credentialData as JSON strings; parse if textual. */
    private JsonNode asJson(JsonNode node) throws Exception {
        if (node == null || node.isNull()) return null;
        return node.isTextual() ? objectMapper.readTree(node.asText()) : node;
    }

    private String text(JsonNode node, String field) {
        JsonNode v = node.get(field);
        return v == null || v.isNull() ? null : v.asText();
    }
}
