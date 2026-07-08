package shop.bluequirk.blue_quirk_backend.identity.password;

import java.time.Instant;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import shop.bluequirk.blue_quirk_backend.entity.User;
import shop.bluequirk.blue_quirk_backend.identity.audit.AuditAction;
import shop.bluequirk.blue_quirk_backend.identity.audit.AuditService;
import shop.bluequirk.blue_quirk_backend.identity.config.IdentityProperties;
import shop.bluequirk.blue_quirk_backend.identity.email.IdentityEmailService;
import shop.bluequirk.blue_quirk_backend.identity.exception.IdentityExceptions;
import shop.bluequirk.blue_quirk_backend.identity.security.TokenGenerator;
import shop.bluequirk.blue_quirk_backend.identity.token.PasswordResetToken;
import shop.bluequirk.blue_quirk_backend.identity.token.PasswordResetTokenRepository;
import shop.bluequirk.blue_quirk_backend.identity.token.TokenService;
import shop.bluequirk.blue_quirk_backend.identity.user.UserAccountService;
import shop.bluequirk.blue_quirk_backend.identity.validator.PasswordPolicy;
import shop.bluequirk.blue_quirk_backend.repository.UserRepository;

@Service
public class PasswordResetService {

    private final PasswordResetTokenRepository tokenRepository;
    private final UserRepository userRepository;
    private final TokenGenerator tokenGenerator;
    private final IdentityEmailService emailService;
    private final IdentityProperties props;
    private final PasswordPolicy passwordPolicy;
    private final UserAccountService userAccountService;
    private final TokenService tokenService;
    private final AuditService auditService;

    public PasswordResetService(PasswordResetTokenRepository tokenRepository, UserRepository userRepository,
                                TokenGenerator tokenGenerator, IdentityEmailService emailService,
                                IdentityProperties props, PasswordPolicy passwordPolicy,
                                UserAccountService userAccountService, TokenService tokenService,
                                AuditService auditService) {
        this.tokenRepository = tokenRepository;
        this.userRepository = userRepository;
        this.tokenGenerator = tokenGenerator;
        this.emailService = emailService;
        this.props = props;
        this.passwordPolicy = passwordPolicy;
        this.userAccountService = userAccountService;
        this.tokenService = tokenService;
        this.auditService = auditService;
    }

    /**
     * Issues a reset token if the email exists. Callers MUST respond generically
     * regardless of outcome to avoid account enumeration.
     */
    @Transactional
    public void requestReset(String email, String ip, String userAgent) {
        userRepository.findByEmail(email.trim().toLowerCase()).ifPresent(user -> {
            tokenRepository.invalidateAllForUser(user);
            String raw = tokenGenerator.generateRawToken();
            PasswordResetToken token = new PasswordResetToken();
            token.setUser(user);
            token.setTokenHash(tokenGenerator.hash(raw));
            token.setExpiresAt(Instant.now().plus(props.getTokens().getResetTtl()));
            tokenRepository.save(token);

            emailService.sendPasswordResetEmail(user.getEmail(), user.getName(), raw);
            auditService.record(AuditAction.PASSWORD_RESET_REQUESTED, user.getId(), user.getEmail(),
                    null, ip, userAgent);
        });
    }

    @Transactional
    public void reset(String rawToken, String newPassword, String ip, String userAgent) {
        passwordPolicy.validate(newPassword);
        PasswordResetToken token = tokenRepository.findByTokenHash(tokenGenerator.hash(rawToken))
                .orElseThrow(() -> new IdentityExceptions.InvalidToken("reset link"));
        if (!token.isValid()) {
            throw new IdentityExceptions.InvalidToken("reset link");
        }
        token.setUsed(true);
        tokenRepository.save(token);

        User user = token.getUser();
        userAccountService.updatePassword(user, newPassword);
        // A password reset ends every existing session (defence in depth).
        tokenService.revokeAll(user);
        auditService.record(AuditAction.PASSWORD_RESET_COMPLETED, user.getId(), user.getEmail(),
                null, ip, userAgent);
    }
}
