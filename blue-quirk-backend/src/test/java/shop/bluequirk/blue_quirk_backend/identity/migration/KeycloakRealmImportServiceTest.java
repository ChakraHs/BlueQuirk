package shop.bluequirk.blue_quirk_backend.identity.migration;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.io.File;
import java.nio.file.Path;
import java.util.Base64;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;

import shop.bluequirk.blue_quirk_backend.entity.User;
import shop.bluequirk.blue_quirk_backend.identity.config.IdentityProperties;
import shop.bluequirk.blue_quirk_backend.identity.role.Role;
import shop.bluequirk.blue_quirk_backend.identity.role.RoleRepository;
import shop.bluequirk.blue_quirk_backend.identity.security.TokenGenerator;
import shop.bluequirk.blue_quirk_backend.identity.token.PasswordResetTokenRepository;
import shop.bluequirk.blue_quirk_backend.identity.user.UserAccountService;
import shop.bluequirk.blue_quirk_backend.repository.UserRepository;

class KeycloakRealmImportServiceTest {

    @Mock UserRepository userRepository;
    @Mock RoleRepository roleRepository;
    @Mock PasswordResetTokenRepository resetTokenRepository;

    TokenGenerator tokenGenerator = new TokenGenerator();
    IdentityProperties props = new IdentityProperties();
    ObjectMapper objectMapper = new ObjectMapper();
    KeycloakRealmImportService service;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        service = new KeycloakRealmImportService(userRepository, roleRepository, resetTokenRepository,
                tokenGenerator, props, objectMapper);
        when(userRepository.findByEmail(anyString())).thenReturn(Optional.empty());
        when(userRepository.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));
        when(roleRepository.findByName(UserAccountService.ROLE_CUSTOMER))
                .thenReturn(Optional.of(new Role("user", "Customer")));
    }

    private File writeExport(Path dir) throws Exception {
        String b64 = Base64.getEncoder().encodeToString("dummy".getBytes());

        ObjectNode root = objectMapper.createObjectNode();
        ArrayNode users = root.putArray("users");

        // User WITH an importable PBKDF2 password.
        ObjectNode withPw = users.addObject();
        withPw.put("email", "haspw@x.com");
        withPw.put("firstName", "Has");
        withPw.put("lastName", "Password");
        withPw.put("enabled", true);
        withPw.put("emailVerified", true);
        ArrayNode creds = withPw.putArray("credentials");
        ObjectNode cred = creds.addObject();
        cred.put("type", "password");
        // Keycloak stores these as JSON strings.
        cred.put("secretData", "{\"value\":\"" + b64 + "\",\"salt\":\"" + b64 + "\"}");
        cred.put("credentialData", "{\"hashIterations\":27500,\"algorithm\":\"pbkdf2-sha256\"}");

        // User WITHOUT credentials → must be flagged for password reset.
        ObjectNode noPw = users.addObject();
        noPw.put("email", "nopw@x.com");
        noPw.put("username", "nopw");
        noPw.put("enabled", true);

        File file = dir.resolve("realm-export.json").toFile();
        objectMapper.writeValue(file, root);
        return file;
    }

    @Test
    void importsUsersWithAndWithoutPasswords(@TempDir Path dir) throws Exception {
        KeycloakRealmImportService.ImportResult result = service.importFromFile(writeExport(dir));

        assertThat(result.total()).isEqualTo(2);
        assertThat(result.withPassword()).isEqualTo(1);
        assertThat(result.requiresReset()).isEqualTo(1);

        verify(userRepository, times(2)).save(any(User.class));
        // A reset token is generated only for the passwordless account.
        verify(resetTokenRepository, times(1)).save(any());
    }

    @Test
    void isIdempotentForAlreadyBcryptUsers(@TempDir Path dir) throws Exception {
        User existing = new User();
        existing.setId(1L);
        existing.setEmail("haspw@x.com");
        existing.setName("Has Password");
        existing.setPasswordHash("{bcrypt}alreadyset");
        when(userRepository.findByEmail("haspw@x.com")).thenReturn(Optional.of(existing));

        service.importFromFile(writeExport(dir));

        // Never overwrite a user who already set a native (bcrypt) password.
        assertThat(existing.getPasswordHash()).isEqualTo("{bcrypt}alreadyset");
    }
}
