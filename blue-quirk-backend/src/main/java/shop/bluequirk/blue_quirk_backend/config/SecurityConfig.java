package shop.bluequirk.blue_quirk_backend.config;

import java.util.Arrays;

import jakarta.servlet.DispatcherType;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationConverter;
import org.springframework.security.oauth2.server.resource.web.authentication.BearerTokenAuthenticationFilter;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

@Configuration
@EnableMethodSecurity
public class SecurityConfig {

    private final JwtAuthConverter jwtAuthConverter;
    private final JitUserProvisioningFilter jitUserProvisioningFilter;

    public SecurityConfig(JwtAuthConverter jwtAuthConverter,
                          JitUserProvisioningFilter jitUserProvisioningFilter) {
        this.jwtAuthConverter = jwtAuthConverter;
        this.jitUserProvisioningFilter = jitUserProvisioningFilter;
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
        	.csrf(csrf -> csrf.disable())
        	.cors(cors -> cors.configurationSource(corsConfigurationSource())) // Use custom CORS configuration
	        // Access policy. Realm roles from Keycloak are mapped verbatim by
	        // JwtAuthConverter, so the admin authority is the realm role "admin".
	        // Default is admin-only (anyRequest at the bottom): any NEW endpoint is
	        // locked down unless explicitly opened here — fail closed, not open.
	        .authorizeHttpRequests(auth -> auth
	                // Spring Security 6 authorizes every dispatch type. Without
	                // this, any request that errors (e.g. a 400 on the public
	                // guest-checkout POST) is re-dispatched to /error, denied
	                // there, and surfaces as a misleading 401.
	                .dispatcherTypeMatchers(DispatcherType.ERROR, DispatcherType.FORWARD).permitAll()
	                // CORS preflights never carry credentials
	                .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
	                // Public storefront reads (catalog, config, media)
	                .requestMatchers(HttpMethod.GET,
	                        "/api/products/**",
	                        "/api/categories/**",
	                        "/api/attributes/**",
	                        "/api/shop/config",
	                        "/uploads/**").permitAll()
	                // Guest checkout (COD, open to non-registered visitors by design)
	                // and public order tracking by reference number
	                .requestMatchers(HttpMethod.POST, "/api/orders").permitAll()
	                .requestMatchers(HttpMethod.GET, "/api/orders/track/*").permitAll()
	                // Storefront analytics beacon
	                .requestMatchers(HttpMethod.POST, "/api/analytics/event").permitAll()
	                // Todify webhook — authenticated by HMAC signature in the controller
	                .requestMatchers("/api/todify/webhook").permitAll()
	                // API docs (dev convenience; consider locking down in production)
	                .requestMatchers("/swagger-ui/**", "/v3/api-docs/**").permitAll()
	                // Signed-in customer endpoints. Ownership (own userId only,
	                // unless admin) is enforced in the controllers.
	                .requestMatchers("/api/preferences/**").authenticated()
	                .requestMatchers(HttpMethod.GET, "/api/orders/user/*").authenticated()
	                // Everything else (admin dashboards, catalog/order/settings
	                // writes, emails, images, users, Todify admin, analytics admin)
	                .anyRequest().hasAuthority("admin")
	        )
            .oauth2ResourceServer(oauth2 ->
                oauth2.jwt(jwt -> jwt.jwtAuthenticationConverter(jwtAuthConverter))
            )
            // After a token is authenticated, lazily create the local users row.
            .addFilterAfter(jitUserProvisioningFilter, BearerTokenAuthenticationFilter.class);

        return http.build();
    }
    
    @Bean
    CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        // Use allowedOriginPatterns (not allowedOrigins) so the storefront can be
        // reached over the LAN by a phone/other device via the machine's IP
        // (e.g. http://192.168.0.101:3000) — otherwise every client-side call is
        // blocked by CORS and only same-machine "localhost" works. Patterns still
        // work with allowCredentials(true), unlike a bare "*". Port is wildcarded
        // with :[*]; the no-port variant covers a frontend served on port 80.
        // This CORS source (used by Spring Security's .cors filter) is the one
        // that actually takes effect; keep it in sync with CorsConfig.
        configuration.setAllowedOriginPatterns(Arrays.asList(
            "http://localhost:[*]",             // frontend on host (any port)
            "http://127.0.0.1:[*]",
            "http://host.docker.internal:[*]",  // frontend from host when backend in Docker
            "http://192.168.*.*:[*]", "http://192.168.*.*", // LAN (home/office)
            "http://10.*.*.*:[*]",     "http://10.*.*.*",   // LAN
            "http://172.*.*.*:[*]",    "http://172.*.*.*"   // LAN (incl. Docker bridges)
        ));
        configuration.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        configuration.setAllowedHeaders(Arrays.asList("Authorization", "Content-Type", "Accept-Encoding", "Connection"));
        configuration.setAllowCredentials(true);
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }
}
