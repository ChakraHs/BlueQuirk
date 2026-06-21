package shop.bluequirk.blue_quirk_backend.config;

import java.io.IOException;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import shop.bluequirk.blue_quirk_backend.service.UserProvisioningService;

/**
 * After the resource server has authenticated a request, ensure a local
 * {@code users} row exists for the Keycloak account (JIT provisioning). Runs once
 * per request; anonymous requests (no JWT) are skipped, so public catalog browsing
 * is unaffected. Provisioning failures never block the request.
 */
@Component
public class JitUserProvisioningFilter extends OncePerRequestFilter {

    private static final Logger LOG = LoggerFactory.getLogger(JitUserProvisioningFilter.class);

    private final UserProvisioningService provisioningService;

    public JitUserProvisioningFilter(UserProvisioningService provisioningService) {
        this.provisioningService = provisioningService;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {

        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication instanceof JwtAuthenticationToken jwtAuth) {
            try {
                provisioningService.provisionFromJwt(jwtAuth.getToken());
            } catch (Exception e) {
                // Never let provisioning break the actual request.
                LOG.warn("JIT user provisioning failed: {}", e.getMessage());
            }
        }

        filterChain.doFilter(request, response);
    }
}
