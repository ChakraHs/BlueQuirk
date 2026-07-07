package shop.bluequirk.blue_quirk_backend.identity.jwt;

import java.time.Instant;
import java.util.LinkedHashSet;
import java.util.Set;
import java.util.UUID;

import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.stereotype.Service;

import shop.bluequirk.blue_quirk_backend.entity.User;
import shop.bluequirk.blue_quirk_backend.identity.config.IdentityProperties;
import shop.bluequirk.blue_quirk_backend.identity.permission.Permission;
import shop.bluequirk.blue_quirk_backend.identity.role.Role;

/**
 * Issues native, short-lived HS512 JWT access tokens. Claims mirror what the
 * resource-server converter expects: role names (kept lowercase to match the old
 * Keycloak realm roles) plus fine-grained permission authorities.
 */
@Service
public class JwtService {

    private final JwtEncoder encoder;
    private final IdentityProperties props;

    public JwtService(JwtEncoder encoder, IdentityProperties props) {
        this.encoder = encoder;
        this.props = props;
    }

    public String generateAccessToken(User user) {
        Set<String> roleNames = new LinkedHashSet<>();
        Set<String> authorities = new LinkedHashSet<>();
        for (Role role : user.getRoles()) {
            roleNames.add(role.getName());
            authorities.add(role.getName());
            for (Permission p : role.getPermissions()) {
                authorities.add(p.getName());
            }
        }

        Instant now = Instant.now();
        JwtClaimsSet claims = JwtClaimsSet.builder()
                .issuer(props.getJwt().getIssuer())
                .issuedAt(now)
                .expiresAt(now.plus(props.getJwt().getAccessTokenTtl()))
                .subject(String.valueOf(user.getId()))
                .id(UUID.randomUUID().toString())
                .claim("email", user.getEmail())
                .claim("name", user.getName())
                .claim("email_verified", user.isEmailVerified())
                .claim("roles", roleNames)
                .claim("authorities", authorities)
                .build();

        JwsHeader header = JwsHeader.with(MacAlgorithm.HS512).build();
        return encoder.encode(JwtEncoderParameters.from(header, claims)).getTokenValue();
    }

    public long getAccessTokenTtlSeconds() {
        return props.getJwt().getAccessTokenTtl().toSeconds();
    }
}
