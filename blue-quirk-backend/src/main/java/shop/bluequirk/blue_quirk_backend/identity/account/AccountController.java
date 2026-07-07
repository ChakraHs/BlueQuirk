package shop.bluequirk.blue_quirk_backend.identity.account;

import java.time.Duration;
import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import shop.bluequirk.blue_quirk_backend.entity.User;
import shop.bluequirk.blue_quirk_backend.identity.auth.AuthService;
import shop.bluequirk.blue_quirk_backend.identity.config.IdentityProperties;
import shop.bluequirk.blue_quirk_backend.identity.dto.ChangePasswordRequest;
import shop.bluequirk.blue_quirk_backend.identity.dto.ForgotPasswordRequest;
import shop.bluequirk.blue_quirk_backend.identity.dto.MessageResponse;
import shop.bluequirk.blue_quirk_backend.identity.dto.ResetPasswordRequest;
import shop.bluequirk.blue_quirk_backend.identity.dto.UpdateProfileRequest;
import shop.bluequirk.blue_quirk_backend.identity.dto.UserResponse;
import shop.bluequirk.blue_quirk_backend.identity.exception.IdentityExceptions;
import shop.bluequirk.blue_quirk_backend.identity.mapper.UserMapper;
import shop.bluequirk.blue_quirk_backend.identity.password.PasswordResetService;
import shop.bluequirk.blue_quirk_backend.identity.security.RateLimiter;
import shop.bluequirk.blue_quirk_backend.identity.security.RequestContext;
import shop.bluequirk.blue_quirk_backend.identity.token.RefreshToken;
import shop.bluequirk.blue_quirk_backend.identity.token.TokenService;
import shop.bluequirk.blue_quirk_backend.identity.user.CurrentUserService;
import shop.bluequirk.blue_quirk_backend.identity.user.UserAccountService;
import shop.bluequirk.blue_quirk_backend.identity.verification.EmailVerificationService;

/**
 * Authenticated profile/account endpoints plus the public password-recovery and
 * email-verification flows (those specific paths are opened in SecurityConfig).
 */
@RestController
@RequestMapping("/api/account")
public class AccountController {

    private final CurrentUserService currentUserService;
    private final UserAccountService userAccountService;
    private final AuthService authService;
    private final PasswordResetService passwordResetService;
    private final EmailVerificationService verificationService;
    private final TokenService tokenService;
    private final UserMapper userMapper;
    private final RateLimiter rateLimiter;
    private final IdentityProperties props;

    public AccountController(CurrentUserService currentUserService, UserAccountService userAccountService,
                            AuthService authService, PasswordResetService passwordResetService,
                            EmailVerificationService verificationService, TokenService tokenService,
                            UserMapper userMapper, RateLimiter rateLimiter, IdentityProperties props) {
        this.currentUserService = currentUserService;
        this.userAccountService = userAccountService;
        this.authService = authService;
        this.passwordResetService = passwordResetService;
        this.verificationService = verificationService;
        this.tokenService = tokenService;
        this.userMapper = userMapper;
        this.rateLimiter = rateLimiter;
        this.props = props;
    }

    // --- Authenticated ---

    @GetMapping("/me")
    public ResponseEntity<UserResponse> me() {
        return ResponseEntity.ok(userMapper.toResponse(currentUserService.require()));
    }

    @PutMapping("/profile")
    public ResponseEntity<UserResponse> updateProfile(@Valid @RequestBody UpdateProfileRequest req) {
        User user = userAccountService.updateProfile(currentUserService.require(), req.name());
        return ResponseEntity.ok(userMapper.toResponse(user));
    }

    @PostMapping("/change-password")
    public ResponseEntity<MessageResponse> changePassword(@Valid @RequestBody ChangePasswordRequest req,
                                                          HttpServletRequest http) {
        authService.changePassword(currentUserService.require(), req.currentPassword(), req.newPassword(),
                RequestContext.clientIp(http), RequestContext.userAgent(http));
        return ResponseEntity.ok(MessageResponse.of("Password updated."));
    }

    @PostMapping("/resend-verification")
    public ResponseEntity<MessageResponse> resendVerification() {
        verificationService.sendVerification(currentUserService.require());
        return ResponseEntity.ok(MessageResponse.of("Verification email sent."));
    }

    @GetMapping("/sessions")
    public ResponseEntity<List<SessionView>> sessions() {
        List<SessionView> sessions = tokenService.activeSessions(currentUserService.require()).stream()
                .map(SessionView::from)
                .toList();
        return ResponseEntity.ok(sessions);
    }

    @DeleteMapping("/sessions")
    public ResponseEntity<MessageResponse> revokeAllSessions() {
        tokenService.revokeAll(currentUserService.require());
        return ResponseEntity.ok(MessageResponse.of("All sessions revoked."));
    }

    // --- Public recovery/verification flows (opened in SecurityConfig) ---

    @PostMapping("/forgot-password")
    public ResponseEntity<MessageResponse> forgotPassword(@Valid @RequestBody ForgotPasswordRequest req,
                                                          HttpServletRequest http) {
        String ip = RequestContext.clientIp(http);
        if (!rateLimiter.tryAcquire("forgot:" + ip, props.getRateLimit().getForgotPasswordMaxPerMinute(),
                Duration.ofMinutes(1))) {
            throw new IdentityExceptions.RateLimited();
        }
        passwordResetService.requestReset(req.email(), ip, RequestContext.userAgent(http));
        // Always generic — never reveal whether the email exists.
        return ResponseEntity.ok(MessageResponse.of(
                "If an account exists for that email, a reset link has been sent."));
    }

    @PostMapping("/reset-password")
    public ResponseEntity<MessageResponse> resetPassword(@Valid @RequestBody ResetPasswordRequest req,
                                                         HttpServletRequest http) {
        passwordResetService.reset(req.token(), req.newPassword(),
                RequestContext.clientIp(http), RequestContext.userAgent(http));
        return ResponseEntity.ok(MessageResponse.of("Password has been reset. You can now sign in."));
    }

    @PostMapping("/verify-email")
    public ResponseEntity<MessageResponse> verifyEmail(@RequestParam("token") String token) {
        verificationService.verify(token);
        return ResponseEntity.ok(MessageResponse.of("Email verified."));
    }

    /** Read-only projection of a refresh-token row as a device session. */
    public record SessionView(Long id, String ipAddress, String userAgent,
                              String createdAt, String lastUsedAt, boolean rememberMe) {
        static SessionView from(RefreshToken t) {
            return new SessionView(
                    t.getId(), t.getIpAddress(), t.getUserAgent(),
                    t.getCreatedAt() == null ? null : t.getCreatedAt().toString(),
                    t.getLastUsedAt() == null ? null : t.getLastUsedAt().toString(),
                    t.isRememberMe());
        }
    }
}
