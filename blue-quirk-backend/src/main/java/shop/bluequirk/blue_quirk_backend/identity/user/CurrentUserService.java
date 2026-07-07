package shop.bluequirk.blue_quirk_backend.identity.user;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.stereotype.Service;

import shop.bluequirk.blue_quirk_backend.entity.User;
import shop.bluequirk.blue_quirk_backend.identity.exception.IdentityException;
import shop.bluequirk.blue_quirk_backend.repository.UserRepository;

/**
 * Resolves the authenticated {@link User} from the JWT in the security context.
 * Handles both native tokens (numeric {@code sub} = local user id) and legacy
 * Keycloak tokens (UUID {@code sub}, resolved by keycloak_id or email) so account
 * endpoints work for either issuer during the coexistence window.
 */
@Service
public class CurrentUserService {

    private final UserRepository userRepository;

    public CurrentUserService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    public User require() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (!(auth instanceof JwtAuthenticationToken jwtAuth)) {
            throw new IdentityException(HttpStatus.UNAUTHORIZED, "Authentication required.");
        }
        Jwt token = jwtAuth.getToken();
        String sub = token.getSubject();

        if (sub != null && sub.matches("\\d+")) {
            var byId = userRepository.findById(Long.valueOf(sub));
            if (byId.isPresent()) return byId.get();
        }
        if (sub != null) {
            var byKeycloak = userRepository.findByKeycloakId(sub);
            if (byKeycloak.isPresent()) return byKeycloak.get();
        }
        String email = token.getClaimAsString("email");
        if (email != null) {
            var byEmail = userRepository.findByEmail(email.trim().toLowerCase());
            if (byEmail.isPresent()) return byEmail.get();
        }
        throw new IdentityException(HttpStatus.UNAUTHORIZED, "No account matches the current token.");
    }
}
