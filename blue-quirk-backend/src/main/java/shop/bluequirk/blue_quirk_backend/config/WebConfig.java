package shop.bluequirk.blue_quirk_backend.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.EnableWebMvc;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
//@EnableWebMvc
public class WebConfig implements WebMvcConfigurer {

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        // Serve /uploads/** URLs from the local "uploads" folder in project root
        registry.addResourceHandler("/uploads/**")
                .addResourceLocations("file:/app/uploads/") // <-- "uploads" folder relative to project root
                .setCachePeriod(3600); // optional caching
    }
}
