package shop.bluequirk.blue_quirk_backend.controller;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import shop.bluequirk.blue_quirk_backend.dto.StoreSettingsRequest;
import shop.bluequirk.blue_quirk_backend.entity.StoreSettings;
import shop.bluequirk.blue_quirk_backend.service.R2StorageService;
import shop.bluequirk.blue_quirk_backend.service.StoreSettingsService;

/**
 * Admin endpoints to read and update the store settings (branding, shipping,
 * currency, default language) and to upload the store logo. The public, read-only
 * subset is exposed separately by {@code /api/shop/config} for the storefront.
 */
@RestController
@RequestMapping("/api/settings")
public class SettingsController {

    private static final Logger LOG = LoggerFactory.getLogger(SettingsController.class);

    private final StoreSettingsService settingsService;
    private final R2StorageService r2StorageService;

    public SettingsController(StoreSettingsService settingsService, R2StorageService r2StorageService) {
        this.settingsService = settingsService;
        this.r2StorageService = r2StorageService;
    }

    @GetMapping
    public StoreSettings get() {
        return settingsService.getOrCreate();
    }

    @PutMapping
    public StoreSettings update(@RequestBody StoreSettingsRequest req) {
        return settingsService.update(req);
    }

    /**
     * Upload a new store logo. Stored as-is in R2 (no resizing — logos are small
     * and often need transparency); the returned settings carry the new logoUrl.
     */
    @PostMapping("/logo")
    public ResponseEntity<StoreSettings> uploadLogo(@RequestParam("file") MultipartFile file) {
        if (file.isEmpty()) {
            return ResponseEntity.badRequest().build();
        }
        if (!r2StorageService.isConfigured()) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,
                    "Image storage (Cloudflare R2) is not configured. Set R2_API_TOKEN and retry.");
        }
        try {
            String filename = "logo-" + StringUtils.cleanPath(file.getOriginalFilename());
            String url = r2StorageService.upload(file.getBytes(), filename, file.getContentType());
            return ResponseEntity.ok(settingsService.updateLogo(url));
        } catch (Exception e) {
            LOG.error("Logo upload to R2 failed: {}", e.getMessage(), e);
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Logo upload to Cloudflare R2 failed.");
        }
    }

    /**
     * Generic settings image upload (e.g. hero backgrounds). Stores the file as-is
     * in R2 and returns just the public URL — the admin assigns it to a field and
     * saves via PUT. Kept separate from the product-image pipeline (no variants).
     */
    @PostMapping("/upload")
    public ResponseEntity<UploadResult> upload(@RequestParam("file") MultipartFile file) {
        if (file.isEmpty()) {
            return ResponseEntity.badRequest().build();
        }
        if (!r2StorageService.isConfigured()) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,
                    "Image storage (Cloudflare R2) is not configured. Set R2_API_TOKEN and retry.");
        }
        try {
            String filename = "settings-" + StringUtils.cleanPath(file.getOriginalFilename());
            String url = r2StorageService.upload(file.getBytes(), filename, file.getContentType());
            return ResponseEntity.ok(new UploadResult(url));
        } catch (Exception e) {
            LOG.error("Settings image upload to R2 failed: {}", e.getMessage(), e);
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Image upload to Cloudflare R2 failed.");
        }
    }

    public record UploadResult(String url) {}
}
