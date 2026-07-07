package shop.bluequirk.blue_quirk_backend.identity.token;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import shop.bluequirk.blue_quirk_backend.entity.User;
import shop.bluequirk.blue_quirk_backend.identity.audit.AuditAction;
import shop.bluequirk.blue_quirk_backend.identity.audit.AuditService;
import shop.bluequirk.blue_quirk_backend.identity.config.IdentityProperties;
import shop.bluequirk.blue_quirk_backend.identity.exception.IdentityExceptions;
import shop.bluequirk.blue_quirk_backend.identity.jwt.JwtService;
import shop.bluequirk.blue_quirk_backend.identity.security.TokenGenerator;

/**
 * Issues, rotates and revokes refresh tokens (which double as device sessions) and
 * mints the paired access token. Implements rotation with reuse detection: replaying
 * a rotated (revoked) token revokes the entire token family.
 */
@Service
public class TokenService {

    private final RefreshTokenRepository refreshTokenRepository;
    private final RefreshTokenRevoker refreshTokenRevoker;
    private final JwtService jwtService;
    private final TokenGenerator tokenGenerator;
    private final IdentityProperties props;
    private final AuditService auditService;

    public TokenService(RefreshTokenRepository refreshTokenRepository, RefreshTokenRevoker refreshTokenRevoker,
                        JwtService jwtService, TokenGenerator tokenGenerator, IdentityProperties props,
                        AuditService auditService) {
        this.refreshTokenRepository = refreshTokenRepository;
        this.refreshTokenRevoker = refreshTokenRevoker;
        this.jwtService = jwtService;
        this.tokenGenerator = tokenGenerator;
        this.props = props;
        this.auditService = auditService;
    }

    @Transactional
    public TokenPair issue(User user, boolean rememberMe, String ip, String userAgent) {
        String familyId = UUID.randomUUID().toString();
        return createToken(user, familyId, rememberMe, ip, userAgent);
    }

    @Transactional
    public TokenPair rotate(String rawRefreshToken, String ip, String userAgent) {
        String hash = tokenGenerator.hash(rawRefreshToken);
        RefreshToken current = refreshTokenRepository.findByTokenHash(hash)
                .orElseThrow(() -> new IdentityExceptions.InvalidToken("refresh token"));

        // Reuse detection: a revoked-but-presented token means the family is compromised.
        if (current.isRevoked()) {
            // Commit the revocation in its own transaction — this method throws below,
            // which would otherwise roll back the containment.
            refreshTokenRevoker.revokeFamily(current.getFamilyId());
            auditService.record(AuditAction.REFRESH_REUSE_DETECTED, current.getUser().getId(),
                    current.getUser().getEmail(), "Refresh token reuse; family revoked", ip, userAgent);
            throw new IdentityExceptions.InvalidToken("refresh token");
        }
        if (current.isExpired()) {
            throw new IdentityExceptions.InvalidToken("refresh token");
        }

        current.setRevoked(true);
        current.setLastUsedAt(Instant.now());
        refreshTokenRepository.save(current);

        return createToken(current.getUser(), current.getFamilyId(), current.isRememberMe(), ip, userAgent);
    }

    @Transactional
    public void revoke(String rawRefreshToken) {
        refreshTokenRepository.findByTokenHash(tokenGenerator.hash(rawRefreshToken)).ifPresent(token -> {
            token.setRevoked(true);
            refreshTokenRepository.save(token);
        });
    }

    @Transactional
    public void revokeAll(User user) {
        refreshTokenRepository.revokeAllForUser(user);
    }

    @Transactional(readOnly = true)
    public List<RefreshToken> activeSessions(User user) {
        return refreshTokenRepository.findByUserAndRevokedFalse(user);
    }

    private TokenPair createToken(User user, String familyId, boolean rememberMe, String ip, String userAgent) {
        String rawRefresh = tokenGenerator.generateRawToken();
        Instant ttlBase = Instant.now();
        Instant expiresAt = ttlBase.plus(rememberMe
                ? props.getRefresh().getRememberMeTtl()
                : props.getRefresh().getTtl());

        RefreshToken token = new RefreshToken();
        token.setUser(user);
        token.setTokenHash(tokenGenerator.hash(rawRefresh));
        token.setFamilyId(familyId);
        token.setExpiresAt(expiresAt);
        token.setRememberMe(rememberMe);
        token.setIpAddress(ip);
        token.setUserAgent(userAgent);
        refreshTokenRepository.save(token);

        String accessToken = jwtService.generateAccessToken(user);
        return new TokenPair(accessToken, rawRefresh, user);
    }
}
