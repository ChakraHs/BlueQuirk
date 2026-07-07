package shop.bluequirk.blue_quirk_backend.identity.token;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;

import shop.bluequirk.blue_quirk_backend.entity.User;
import shop.bluequirk.blue_quirk_backend.identity.audit.AuditAction;
import shop.bluequirk.blue_quirk_backend.identity.audit.AuditService;
import shop.bluequirk.blue_quirk_backend.identity.config.IdentityProperties;
import shop.bluequirk.blue_quirk_backend.identity.exception.IdentityException;
import shop.bluequirk.blue_quirk_backend.identity.jwt.JwtService;
import shop.bluequirk.blue_quirk_backend.identity.security.TokenGenerator;

class TokenServiceTest {

    @Mock RefreshTokenRepository refreshTokenRepository;
    @Mock RefreshTokenRevoker refreshTokenRevoker;
    @Mock JwtService jwtService;
    @Mock AuditService auditService;

    TokenGenerator tokenGenerator = new TokenGenerator();
    IdentityProperties props = new IdentityProperties();
    TokenService tokenService;

    private User user;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        tokenService = new TokenService(refreshTokenRepository, refreshTokenRevoker, jwtService, tokenGenerator,
                props, auditService);
        when(jwtService.generateAccessToken(any())).thenReturn("access-token");
        user = new User();
        user.setId(1L);
        user.setEmail("u@x.com");
        user.setName("U");
    }

    @Test
    void issuePersistsRefreshTokenAndReturnsPair() {
        TokenPair pair = tokenService.issue(user, false, "1.2.3.4", "agent");

        assertThat(pair.accessToken()).isEqualTo("access-token");
        assertThat(pair.rawRefreshToken()).isNotBlank();

        ArgumentCaptor<RefreshToken> captor = ArgumentCaptor.forClass(RefreshToken.class);
        verify(refreshTokenRepository).save(captor.capture());
        RefreshToken saved = captor.getValue();
        assertThat(saved.getFamilyId()).isNotBlank();
        assertThat(saved.getTokenHash()).isNotBlank();
        assertThat(saved.getExpiresAt()).isAfter(Instant.now());
        assertThat(saved.isRememberMe()).isFalse();
    }

    @Test
    void rotateRevokesOldAndKeepsFamily() {
        String raw = "raw-refresh";
        RefreshToken current = new RefreshToken();
        current.setUser(user);
        current.setFamilyId("family-1");
        current.setTokenHash(tokenGenerator.hash(raw));
        current.setExpiresAt(Instant.now().plus(7, ChronoUnit.DAYS));
        current.setRevoked(false);
        when(refreshTokenRepository.findByTokenHash(tokenGenerator.hash(raw))).thenReturn(Optional.of(current));

        tokenService.rotate(raw, "ip", "agent");

        ArgumentCaptor<RefreshToken> captor = ArgumentCaptor.forClass(RefreshToken.class);
        verify(refreshTokenRepository, times(2)).save(captor.capture());
        assertThat(captor.getAllValues().get(0).isRevoked()).isTrue();          // old revoked
        assertThat(captor.getAllValues().get(1).getFamilyId()).isEqualTo("family-1"); // new same family
        assertThat(captor.getAllValues().get(1).isRevoked()).isFalse();
    }

    @Test
    void rotateDetectsReuseAndRevokesFamily() {
        String raw = "raw-reused";
        RefreshToken revoked = new RefreshToken();
        revoked.setUser(user);
        revoked.setFamilyId("family-x");
        revoked.setTokenHash(tokenGenerator.hash(raw));
        revoked.setExpiresAt(Instant.now().plus(7, ChronoUnit.DAYS));
        revoked.setRevoked(true);
        when(refreshTokenRepository.findByTokenHash(tokenGenerator.hash(raw))).thenReturn(Optional.of(revoked));

        assertThatThrownBy(() -> tokenService.rotate(raw, "ip", "agent"))
                .isInstanceOf(IdentityException.class);

        verify(refreshTokenRevoker).revokeFamily("family-x");
        verify(auditService).record(org.mockito.ArgumentMatchers.eq(AuditAction.REFRESH_REUSE_DETECTED),
                any(), any(), any(), any(), any());
        verify(refreshTokenRepository, never()).save(any());
    }

    @Test
    void rotateRejectsExpiredToken() {
        String raw = "raw-expired";
        RefreshToken expired = new RefreshToken();
        expired.setUser(user);
        expired.setFamilyId("family-e");
        expired.setTokenHash(tokenGenerator.hash(raw));
        expired.setExpiresAt(Instant.now().minus(1, ChronoUnit.DAYS));
        expired.setRevoked(false);
        when(refreshTokenRepository.findByTokenHash(tokenGenerator.hash(raw))).thenReturn(Optional.of(expired));

        assertThatThrownBy(() -> tokenService.rotate(raw, "ip", "agent"))
                .isInstanceOf(IdentityException.class);
    }

    @Test
    void rotateRejectsUnknownToken() {
        when(refreshTokenRepository.findByTokenHash(any())).thenReturn(Optional.empty());
        assertThatThrownBy(() -> tokenService.rotate("nope", "ip", "agent"))
                .isInstanceOf(IdentityException.class);
    }
}
