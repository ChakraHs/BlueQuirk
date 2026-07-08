package shop.bluequirk.blue_quirk_backend.identity.auth;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyBoolean;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;

import shop.bluequirk.blue_quirk_backend.entity.User;
import shop.bluequirk.blue_quirk_backend.identity.audit.AuditService;
import shop.bluequirk.blue_quirk_backend.identity.config.IdentityProperties;
import shop.bluequirk.blue_quirk_backend.identity.dto.LoginRequest;
import shop.bluequirk.blue_quirk_backend.identity.dto.RegisterRequest;
import shop.bluequirk.blue_quirk_backend.identity.dto.TokenResponse;
import shop.bluequirk.blue_quirk_backend.identity.exception.IdentityException;
import shop.bluequirk.blue_quirk_backend.identity.exception.IdentityExceptions;
import shop.bluequirk.blue_quirk_backend.identity.jwt.JwtService;
import shop.bluequirk.blue_quirk_backend.identity.mapper.UserMapper;
import shop.bluequirk.blue_quirk_backend.identity.role.Role;
import shop.bluequirk.blue_quirk_backend.identity.token.TokenPair;
import shop.bluequirk.blue_quirk_backend.identity.token.TokenService;
import shop.bluequirk.blue_quirk_backend.identity.user.UserAccountService;
import shop.bluequirk.blue_quirk_backend.identity.validator.PasswordPolicy;
import shop.bluequirk.blue_quirk_backend.identity.verification.EmailVerificationService;
import shop.bluequirk.blue_quirk_backend.repository.UserRepository;

class AuthServiceTest {

    @Mock UserRepository userRepository;
    @Mock UserAccountService userAccountService;
    @Mock org.springframework.security.crypto.password.PasswordEncoder passwordEncoder;
    @Mock TokenService tokenService;
    @Mock JwtService jwtService;
    @Mock EmailVerificationService verificationService;
    @Mock AuditService auditService;

    PasswordPolicy passwordPolicy = new PasswordPolicy();
    IdentityProperties props = new IdentityProperties();
    UserMapper userMapper = new UserMapper();
    AuthService authService;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        authService = new AuthService(userRepository, userAccountService, passwordEncoder, passwordPolicy,
                tokenService, jwtService, verificationService, auditService, props, userMapper);
        when(jwtService.getAccessTokenTtlSeconds()).thenReturn(900L);
    }

    private User customer(String hash) {
        User u = new User();
        u.setId(7L);
        u.setEmail("c@x.com");
        u.setName("Customer");
        u.setPasswordHash(hash);
        u.setEnabled(true);
        u.addRole(new Role("user", "Customer"));
        return u;
    }

    @Test
    void loginSucceedsAndResetsCounters() {
        User u = customer("{bcrypt}hash");
        u.setFailedLoginCount(3);
        when(userRepository.findByEmail("c@x.com")).thenReturn(Optional.of(u));
        when(passwordEncoder.matches("pw", "{bcrypt}hash")).thenReturn(true);
        when(passwordEncoder.upgradeEncoding("{bcrypt}hash")).thenReturn(false);
        when(tokenService.issue(any(), anyBoolean(), any(), any()))
                .thenReturn(new TokenPair("acc", "ref", u));

        TokenResponse res = authService.login(new LoginRequest("c@x.com", "pw", false), "ip", "agent");

        assertThat(res.accessToken()).isEqualTo("acc");
        assertThat(res.refreshToken()).isEqualTo("ref");
        assertThat(res.user().email()).isEqualTo("c@x.com");
        assertThat(u.getFailedLoginCount()).isZero();
    }

    @Test
    void loginLazilyUpgradesLegacyHash() {
        User u = customer("{keycloak-pbkdf2-sha256}27500$salt$hash");
        when(userRepository.findByEmail("c@x.com")).thenReturn(Optional.of(u));
        when(passwordEncoder.matches(eq("pw"), anyString())).thenReturn(true);
        when(passwordEncoder.upgradeEncoding(anyString())).thenReturn(true);
        when(passwordEncoder.encode("pw")).thenReturn("{bcrypt}new");
        when(tokenService.issue(any(), anyBoolean(), any(), any()))
                .thenReturn(new TokenPair("acc", "ref", u));

        authService.login(new LoginRequest("c@x.com", "pw", false), "ip", "agent");

        assertThat(u.getPasswordHash()).isEqualTo("{bcrypt}new");
    }

    @Test
    void loginWithWrongPasswordIncrementsFailures() {
        User u = customer("{bcrypt}hash");
        when(userRepository.findByEmail("c@x.com")).thenReturn(Optional.of(u));
        when(passwordEncoder.matches("bad", "{bcrypt}hash")).thenReturn(false);

        assertThatThrownBy(() -> authService.login(new LoginRequest("c@x.com", "bad", false), "ip", "a"))
                .isInstanceOf(IdentityExceptions.InvalidCredentials.class);
        assertThat(u.getFailedLoginCount()).isEqualTo(1);
    }

    @Test
    void loginLocksAccountAfterMaxFailures() {
        User u = customer("{bcrypt}hash");
        u.setFailedLoginCount(props.getLockout().getMaxAttempts() - 1);
        when(userRepository.findByEmail("c@x.com")).thenReturn(Optional.of(u));
        when(passwordEncoder.matches(anyString(), anyString())).thenReturn(false);

        assertThatThrownBy(() -> authService.login(new LoginRequest("c@x.com", "bad", false), "ip", "a"))
                .isInstanceOf(IdentityExceptions.InvalidCredentials.class);
        assertThat(u.getLockedUntil()).isNotNull();
    }

    @Test
    void loginRejectsLockedAccount() {
        User u = customer("{bcrypt}hash");
        u.setLockedUntil(Instant.now().plus(10, ChronoUnit.MINUTES));
        when(userRepository.findByEmail("c@x.com")).thenReturn(Optional.of(u));

        assertThatThrownBy(() -> authService.login(new LoginRequest("c@x.com", "pw", false), "ip", "a"))
                .isInstanceOf(IdentityExceptions.AccountLocked.class);
    }

    @Test
    void loginRejectsDisabledAccount() {
        User u = customer("{bcrypt}hash");
        u.setEnabled(false);
        when(userRepository.findByEmail("c@x.com")).thenReturn(Optional.of(u));

        assertThatThrownBy(() -> authService.login(new LoginRequest("c@x.com", "pw", false), "ip", "a"))
                .isInstanceOf(IdentityExceptions.AccountDisabled.class);
    }

    @Test
    void loginRejectsUnknownOrPasswordlessAccount() {
        when(userRepository.findByEmail("missing@x.com")).thenReturn(Optional.empty());
        assertThatThrownBy(() -> authService.login(new LoginRequest("missing@x.com", "pw", false), "ip", "a"))
                .isInstanceOf(IdentityExceptions.InvalidCredentials.class);
    }

    @Test
    void registerCreatesUserSendsVerificationAndIssuesTokens() {
        User created = customer("{bcrypt}hash");
        created.setEmailVerified(false);
        when(userAccountService.registerCustomer("c@x.com", "Customer", "Password1")).thenReturn(created);
        when(tokenService.issue(any(), anyBoolean(), any(), any()))
                .thenReturn(new TokenPair("acc", "ref", created));

        TokenResponse res = authService.register(
                new RegisterRequest("c@x.com", "Password1", "Customer"), "ip", "agent");

        assertThat(res.accessToken()).isEqualTo("acc");
        verify(verificationService).sendVerification(created);
    }

    @Test
    void registerRejectsWeakPassword() {
        assertThatThrownBy(() -> authService.register(
                new RegisterRequest("c@x.com", "short", "Customer"), "ip", "a"))
                .isInstanceOf(IdentityException.class);
    }
}
