package shop.bluequirk.blue_quirk_backend.config;

import java.util.Collection;
import java.util.HashSet;
import java.util.Set;

import org.springframework.core.convert.converter.Converter;
import org.springframework.security.authentication.AbstractAuthenticationToken;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.stereotype.Component;

/**
 * Maps a native Identity Domain JWT into Spring authorities. Role names live in the
 * {@code roles} claim and role names + fine-grained permissions in {@code authorities};
 * both are mapped verbatim so rules like {@code hasAuthority("admin")} and
 * {@code hasAuthority("PRODUCT_WRITE")} work. The principal name is the user's email,
 * falling back to the subject (local user id).
 */
@Component
public class JwtAuthConverter implements Converter<Jwt, AbstractAuthenticationToken> {

    @Override
    public AbstractAuthenticationToken convert(Jwt jwt) {
        Set<GrantedAuthority> authorities = new HashSet<>();
        addStringClaim(jwt, "roles", authorities);
        addStringClaim(jwt, "authorities", authorities);

        String principalName = jwt.getClaimAsString("email");
        if (principalName == null) {
            principalName = jwt.getSubject();
        }
        return new JwtAuthenticationToken(jwt, authorities, principalName);
    }

    private void addStringClaim(Jwt jwt, String claimName, Set<GrantedAuthority> sink) {
        Object claim = jwt.getClaim(claimName);
        if (claim instanceof Collection<?> values) {
            for (Object v : values) {
                sink.add(new SimpleGrantedAuthority(v.toString()));
            }
        }
    }
}
