package shop.bluequirk.blue_quirk_backend.identity.auth;

import java.time.Duration;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.web.bind.annotation.*;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import shop.bluequirk.blue_quirk_backend.identity.config.IdentityProperties;
import shop.bluequirk.blue_quirk_backend.identity.dto.LoginRequest;
import shop.bluequirk.blue_quirk_backend.identity.dto.MessageResponse;
import shop.bluequirk.blue_quirk_backend.identity.dto.RefreshRequest;
import shop.bluequirk.blue_quirk_backend.identity.dto.RegisterRequest;
import shop.bluequirk.blue_quirk_backend.identity.dto.TokenResponse;
import shop.bluequirk.blue_quirk_backend.identity.exception.IdentityExceptions;
import shop.bluequirk.blue_quirk_backend.identity.security.RateLimiter;
import shop.bluequirk.blue_quirk_backend.identity.security.RequestContext;

/**
 * Public authentication endpoints. All are permitted in SecurityConfig; protection
 * here is via rate limiting, lockout and credential checks in the service layer.
 */
@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;
    private final RateLimiter rateLimiter;
    private final IdentityProperties props;

    public AuthController(AuthService authService, RateLimiter rateLimiter, IdentityProperties props) {
        this.authService = authService;
        this.rateLimiter = rateLimiter;
        this.props = props;
    }

    @PostMapping("/register")
    public ResponseEntity<TokenResponse> register(@Valid @RequestBody RegisterRequest req,
                                                  HttpServletRequest http) {
        String ip = RequestContext.clientIp(http);
        rateLimit("register:" + ip, props.getRateLimit().getRegisterMaxPerMinute());
        return ResponseEntity.ok(authService.register(req, ip, RequestContext.userAgent(http)));
    }

    @PostMapping("/login")
    public ResponseEntity<TokenResponse> login(@Valid @RequestBody LoginRequest req,
                                               HttpServletRequest http) {
        String ip = RequestContext.clientIp(http);
        rateLimit("login:" + ip, props.getRateLimit().getLoginMaxPerMinute());
        return ResponseEntity.ok(authService.login(req, ip, RequestContext.userAgent(http)));
    }

    @PostMapping("/refresh")
    public ResponseEntity<TokenResponse> refresh(@Valid @RequestBody RefreshRequest req,
                                                 HttpServletRequest http) {
        return ResponseEntity.ok(authService.refresh(
                req.refreshToken(), RequestContext.clientIp(http), RequestContext.userAgent(http)));
    }

    @PostMapping("/logout")
    public ResponseEntity<MessageResponse> logout(@Valid @RequestBody RefreshRequest req,
                                                  Authentication authentication, HttpServletRequest http) {
        Long userId = null;
        String email = null;
        if (authentication instanceof JwtAuthenticationToken jwt) {
            String sub = jwt.getToken().getSubject();
            if (sub != null && sub.matches("\\d+")) userId = Long.valueOf(sub);
            email = jwt.getToken().getClaimAsString("email");
        }
        authService.logout(req.refreshToken(), userId, email,
                RequestContext.clientIp(http), RequestContext.userAgent(http));
        return ResponseEntity.ok(MessageResponse.of("Logged out."));
    }

    private void rateLimit(String key, int maxPerMinute) {
        if (!rateLimiter.tryAcquire(key, maxPerMinute, Duration.ofMinutes(1))) {
            throw new IdentityExceptions.RateLimited();
        }
    }
}
