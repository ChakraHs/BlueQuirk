package com.ev.pcs.keycloakauth.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.LogoutConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.Arrays;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity(prePostEnabled = true)
public class SecurityConfig {
        JwtAuthConverter jwtAuthConverter;

        public SecurityConfig(JwtAuthConverter jwtAuthConverter) {
            this.jwtAuthConverter = jwtAuthConverter;
        }
    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity httpSecurity) throws Exception {
            httpSecurity
                .cors(cors -> cors.configurationSource(corsConfigurationSource())) // Use custom CORS configuration
                .sessionManagement(sm->sm.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .csrf(csrf->csrf.disable())
//                .authorizeHttpRequests(ar->ar.requestMatchers("/api/**").hasAnyAuthority("user"))
                .authorizeHttpRequests(ar -> ar
                        .requestMatchers("/**","/register","/swagger-ui/**","/v3/api-docs/**","/uaa/**").permitAll()
                        .anyRequest().authenticated()
                )
                .oauth2ResourceServer(ors->ors.jwt(jwt->jwt.jwtAuthenticationConverter(jwtAuthConverter)))
                .formLogin(form -> form
                        .loginPage("/login")
                        .permitAll()
                )
                .logout(LogoutConfigurer::permitAll);

            return httpSecurity.build();
    }

    @Bean
    CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        // Use allowedOriginPatterns (not allowedOrigins) so the login/signup flows
        // can be reached over the LAN by a phone/other device via the machine's IP
        // (e.g. http://192.168.0.102:3000) — otherwise the browser blocks every
        // request with CORS and only same-machine "localhost" works. Patterns still
        // work with allowCredentials(true), unlike a bare "*". Port is wildcarded
        // with :[*]. Keep this in sync with the shop backend's CORS config.
        configuration.setAllowedOriginPatterns(Arrays.asList(
            "http://localhost:[*]",             // frontend on host (any port)
            "http://127.0.0.1:[*]",
            "http://192.168.*.*:[*]", "http://192.168.*.*", // LAN (home/office)
            "http://10.*.*.*:[*]",     "http://10.*.*.*",   // LAN
            "http://172.*.*.*:[*]",    "http://172.*.*.*"   // LAN (incl. Docker bridges)
        ));
        configuration.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "DELETE", "OPTIONS"));
        configuration.setAllowedHeaders(Arrays.asList("Authorization", "Content-Type", "Accept-Encoding", "Connection"));
        configuration.setAllowCredentials(true);
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }
}
