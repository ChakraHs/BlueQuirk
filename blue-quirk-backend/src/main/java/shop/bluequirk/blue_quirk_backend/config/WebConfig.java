package shop.bluequirk.blue_quirk_backend.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class WebConfig implements WebMvcConfigurer {

    // Where locally-stored uploads live. Defaults to a relative "uploads" folder
    // for local dev; the container profile points it at the mounted /app/uploads
    // volume so images survive redeploys. Configure with app.uploads.dir / UPLOADS_DIR.
    @Value("${app.uploads.dir:uploads}")
    private String uploadsDir;

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        String location = uploadsDir.endsWith("/") ? uploadsDir : uploadsDir + "/";
        registry.addResourceHandler("/uploads/**")
                .addResourceLocations("file:" + location)
                .setCachePeriod(3600);
    }
}
