package shop.bluequirk.blue_quirk_backend.config;

import org.springframework.core.convert.converter.Converter;
import org.springframework.security.authentication.AbstractAuthenticationToken;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.security.oauth2.server.resource.authentication.JwtGrantedAuthoritiesConverter;
import org.springframework.stereotype.Component;

import java.util.Collection;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;
import java.util.stream.Stream;

@Component
public class JwtAuthConverter implements Converter<Jwt, AbstractAuthenticationToken> {
    private final JwtGrantedAuthoritiesConverter jwtGrantedAuthoritiesConverter=new JwtGrantedAuthoritiesConverter();


    @Override
    public AbstractAuthenticationToken convert(Jwt jwt) {
        Collection<GrantedAuthority> authorities = Stream.of(
                jwtGrantedAuthoritiesConverter.convert(jwt).stream(),
                extractResourceRoles(jwt).stream(),   // legacy Keycloak realm_access.roles
                extractNativeAuthorities(jwt).stream() // native identity tokens
        ).flatMap(s -> s).collect(Collectors.toSet());

        String principalName = jwt.getClaimAsString("preferred_username");
        if (principalName == null) {
            // Native tokens don't carry preferred_username; fall back to email/subject.
            principalName = jwt.getClaimAsString("email");
            if (principalName == null) {
                principalName = jwt.getSubject();
            }
        }
        return new JwtAuthenticationToken(jwt, authorities, principalName);
    }

    /** Legacy Keycloak tokens: {@code realm_access.roles}. */
    private Collection<GrantedAuthority> extractResourceRoles(Jwt jwt) {
        Object claim = jwt.getClaim("realm_access");
        if (!(claim instanceof Map<?, ?> realmAccess)) {
            return Set.of();
        }
        Object roles = realmAccess.get("roles");
        if (!(roles instanceof Collection<?> roleList)) {
            return Set.of();
        }
        return roleList.stream()
                .map(Object::toString)
                .map(SimpleGrantedAuthority::new)
                .collect(Collectors.toSet());
    }

    /**
     * Native identity tokens: role names live in {@code roles}, and role names +
     * fine-grained permissions in {@code authorities}. Both are mapped verbatim.
     */
    private Collection<GrantedAuthority> extractNativeAuthorities(Jwt jwt) {
        Set<GrantedAuthority> result = new java.util.HashSet<>();
        addStringClaim(jwt, "roles", result);
        addStringClaim(jwt, "authorities", result);
        return result;
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
