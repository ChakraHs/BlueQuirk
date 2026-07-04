package shop.bluequirk.blue_quirk_backend.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class CorsConfig {

    @Bean
    public WebMvcConfigurer corsConfigurer() {
        return new WebMvcConfigurer() {
            @Override
            public void addCorsMappings(CorsRegistry registry) {
                // Use allowedOriginPatterns (not allowedOrigins) so we can match
                // by pattern while still sending Access-Control-Allow-Credentials.
                // This lets the storefront be reached over the LAN by phone/other
                // devices via the machine's IP (http://192.168.x.x:3000), which
                // otherwise gets blocked by CORS. Port is wildcarded with :[*], and
                // a no-port variant covers frontends served on port 80.
                registry.addMapping("/**") // allow all endpoints
                        .allowedOriginPatterns(
                            "http://localhost:[*]",             // frontend on host (any port)
                            "http://127.0.0.1:[*]",
                            "http://host.docker.internal:[*]",  // frontend from host when backend in Docker
                            "http://192.168.*.*:[*]", "http://192.168.*.*", // LAN (home/office)
                            "http://10.*.*.*:[*]",     "http://10.*.*.*",   // LAN
                            "http://172.*.*.*:[*]",    "http://172.*.*.*"   // LAN (incl. Docker bridges)
                        )
                        .allowedMethods("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS")
                        .allowedHeaders("*")
                        .allowCredentials(true);
            }
        };
    }
}
