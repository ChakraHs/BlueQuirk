package shop.bluequirk.blue_quirk_backend.identity.auth;

import java.time.Instant;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import shop.bluequirk.blue_quirk_backend.entity.User;
import shop.bluequirk.blue_quirk_backend.identity.audit.AuditAction;
import shop.bluequirk.blue_quirk_backend.identity.audit.AuditService;
import shop.bluequirk.blue_quirk_backend.identity.config.IdentityProperties;
import shop.bluequirk.blue_quirk_backend.identity.dto.LoginRequest;
import shop.bluequirk.blue_quirk_backend.identity.dto.RegisterRequest;
import shop.bluequirk.blue_quirk_backend.identity.dto.TokenResponse;
import shop.bluequirk.blue_quirk_backend.identity.exception.IdentityExceptions;
import shop.bluequirk.blue_quirk_backend.identity.jwt.JwtService;
import shop.bluequirk.blue_quirk_backend.identity.mapper.UserMapper;
import shop.bluequirk.blue_quirk_backend.identity.token.TokenPair;
import shop.bluequirk.blue_quirk_backend.identity.token.TokenService;
import shop.bluequirk.blue_quirk_backend.identity.user.UserAccountService;
import shop.bluequirk.blue_quirk_backend.identity.validator.PasswordPolicy;
import shop.bluequirk.blue_quirk_backend.identity.verification.EmailVerificationService;
import shop.bluequirk.blue_quirk_backend.repository.UserRepository;

/**
 * Orchestrates the core authentication flows: register, login (with lockout + lazy
 * password re-hash), refresh (rotation) and logout. Delegates token mechanics to
 * {@link TokenService} and account mutations to {@link UserAccountService}.
 */
@Service
public class AuthService {

    private final UserRepository userRepository;
    private final UserAccountService userAccountService;
    private final PasswordEncoder passwordEncoder;
    private final PasswordPolicy passwordPolicy;
    private final TokenService tokenService;
    private final JwtService jwtService;
    private final EmailVerificationService verificationService;
    private final AuditService auditService;
    private final IdentityProperties props;
    private final UserMapper userMapper;

    public AuthService(UserRepository userRepository, UserAccountService userAccountService,
                       PasswordEncoder passwordEncoder, PasswordPolicy passwordPolicy, TokenService tokenService,
                       JwtService jwtService, EmailVerificationService verificationService,
                       AuditService auditService, IdentityProperties props, UserMapper userMapper) {
        this.userRepository = userRepository;
        this.userAccountService = userAccountService;
        this.passwordEncoder = passwordEncoder;
        this.passwordPolicy = passwordPolicy;
        this.tokenService = tokenService;
        this.jwtService = jwtService;
        this.verificationService = verificationService;
        this.auditService = auditService;
        this.props = props;
        this.userMapper = userMapper;
    }

    @Transactional
    public TokenResponse register(RegisterRequest req, String ip, String userAgent) {
        passwordPolicy.validate(req.password());
        User user = userAccountService.registerCustomer(req.email(), req.name(), req.password());
        verificationService.sendVerification(user);
        auditService.record(AuditAction.REGISTER, user.getId(), user.getEmail(), null, ip, userAgent);

        TokenPair pair = tokenService.issue(user, false, ip, userAgent);
        return toTokenResponse(pair);
    }

    @Transactional
    public TokenResponse login(LoginRequest req, String ip, String userAgent) {
        String email = req.email().trim().toLowerCase();
        User user = userRepository.findByEmail(email).orElse(null);

        if (user == null || user.getPasswordHash() == null) {
            // Generic failure — never reveal whether the email exists or is Keycloak-only.
            auditService.record(AuditAction.LOGIN_FAILURE, user == null ? null : user.getId(), email,
                    "unknown account or no local password", ip, userAgent);
            throw new IdentityExceptions.InvalidCredentials();
        }
        if (user.isLocked()) {
            throw new IdentityExceptions.AccountLocked();
        }
        if (!user.isEnabled()) {
            throw new IdentityExceptions.AccountDisabled();
        }

        if (!passwordEncoder.matches(req.password(), user.getPasswordHash())) {
            registerFailedAttempt(user, ip, userAgent);
            throw new IdentityExceptions.InvalidCredentials();
        }

        // Success: reset lockout counters and lazily upgrade a legacy hash to BCrypt.
        user.setFailedLoginCount(0);
        user.setLockedUntil(null);
        if (passwordEncoder.upgradeEncoding(user.getPasswordHash())) {
            user.setPasswordHash(passwordEncoder.encode(req.password()));
        }
        userRepository.save(user);

        auditService.record(AuditAction.LOGIN_SUCCESS, user.getId(), user.getEmail(), null, ip, userAgent);
        TokenPair pair = tokenService.issue(user, req.rememberMe(), ip, userAgent);
        return toTokenResponse(pair);
    }

    @Transactional
    public TokenResponse refresh(String rawRefreshToken, String ip, String userAgent) {
        TokenPair pair = tokenService.rotate(rawRefreshToken, ip, userAgent);
        auditService.record(AuditAction.TOKEN_REFRESH, pair.user().getId(), pair.user().getEmail(),
                null, ip, userAgent);
        return toTokenResponse(pair);
    }

    @Transactional
    public void logout(String rawRefreshToken, Long userId, String email, String ip, String userAgent) {
        tokenService.revoke(rawRefreshToken);
        auditService.record(AuditAction.LOGOUT, userId, email, null, ip, userAgent);
    }

    @Transactional
    public void changePassword(User user, String currentPassword, String newPassword, String ip, String userAgent) {
        if (user.getPasswordHash() == null
                || !passwordEncoder.matches(currentPassword, user.getPasswordHash())) {
            throw new IdentityExceptions.InvalidCredentials();
        }
        passwordPolicy.validate(newPassword);
        userAccountService.updatePassword(user, newPassword);
        auditService.record(AuditAction.PASSWORD_CHANGED, user.getId(), user.getEmail(), null, ip, userAgent);
    }

    private void registerFailedAttempt(User user, String ip, String userAgent) {
        int attempts = user.getFailedLoginCount() + 1;
        user.setFailedLoginCount(attempts);
        if (attempts >= props.getLockout().getMaxAttempts()) {
            user.setLockedUntil(Instant.now().plus(props.getLockout().getDuration()));
            user.setFailedLoginCount(0);
            auditService.record(AuditAction.ACCOUNT_LOCKED, user.getId(), user.getEmail(),
                    "too many failed logins", ip, userAgent);
        } else {
            auditService.record(AuditAction.LOGIN_FAILURE, user.getId(), user.getEmail(),
                    "bad password", ip, userAgent);
        }
        userRepository.save(user);
    }

    private TokenResponse toTokenResponse(TokenPair pair) {
        return TokenResponse.bearer(
                pair.accessToken(),
                pair.rawRefreshToken(),
                jwtService.getAccessTokenTtlSeconds(),
                userMapper.toResponse(pair.user()));
    }
}
