package shop.bluequirk.blue_quirk_backend.controller;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import jakarta.annotation.PostConstruct;
import shop.bluequirk.blue_quirk_backend.service.R2StorageService;

/**
 * Uploads a product's optional featured video to Cloudflare R2, mirroring the
 * image upload flow ({@link ImageController}). We only accept MP4 (H.264) — the
 * one format that plays inline across every browser/device without transcoding —
 * and store the file untouched (no server-side processing); the returned public
 * URL is then attached to the product's {@code video} field by the admin UI.
 *
 * <p>As with images there is no local-disk fallback: if R2 is not configured we
 * fail loudly (503) rather than silently writing to the backend's disk.
 */
@RestController
@RequestMapping("/api/videos")
public class VideoController {

    private static final Logger LOG = LoggerFactory.getLogger(VideoController.class);

    // 120 MB — matches the multipart ceiling in application.properties and is
    // ample for a short product clip.
    private static final long MAX_BYTES = 120L * 1024 * 1024;

    private final R2StorageService r2StorageService;

    public VideoController(R2StorageService r2StorageService) {
        this.r2StorageService = r2StorageService;
    }

    @PostConstruct
    void warnIfStorageMisconfigured() {
        if (!r2StorageService.isConfigured()) {
            LOG.error("Cloudflare R2 is NOT configured (set R2_API_TOKEN / CLOUDFLARE_API_TOKEN). "
                    + "Product video uploads will be rejected until it is configured.");
        }
    }

    /**
     * The response the admin UI links to a product: the public R2 URL of the MP4
     * plus its byte size (handy to display; also persisted on the product).
     */
    public record VideoUploadResponse(String videoUrl, long fileSize, String contentType) {}

    @PostMapping
    public ResponseEntity<VideoUploadResponse> uploadVideo(@RequestParam("file") MultipartFile file) {
        if (file.isEmpty()) {
            return ResponseEntity.badRequest().build();
        }
        if (file.getSize() > MAX_BYTES) {
            throw new ResponseStatusException(HttpStatus.PAYLOAD_TOO_LARGE,
                    "Video exceeds the 120 MB limit. Please upload a shorter/compressed MP4.");
        }
        if (!isMp4(file)) {
            throw new ResponseStatusException(HttpStatus.UNSUPPORTED_MEDIA_TYPE,
                    "Only MP4 (H.264) videos are supported.");
        }
        if (!r2StorageService.isConfigured()) {
            LOG.error("Rejected video upload: Cloudflare R2 is not configured (missing R2_API_TOKEN).");
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,
                    "Video storage (Cloudflare R2) is not configured. Set R2_API_TOKEN and retry.");
        }

        try {
            String filename = StringUtils.cleanPath(
                    file.getOriginalFilename() == null ? "video.mp4" : file.getOriginalFilename());
            String url = r2StorageService.upload(file.getBytes(), filename, "video/mp4");
            return ResponseEntity.ok(new VideoUploadResponse(url, file.getSize(), "video/mp4"));
        } catch (Exception e) {
            LOG.error("Video upload to R2 failed: {}", e.getMessage(), e);
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Video upload to Cloudflare R2 failed.");
        }
    }

    /** Accepts only MP4 — by declared content type or, as a fallback, the extension. */
    private boolean isMp4(MultipartFile file) {
        String type = file.getContentType();
        if (type != null && (type.equalsIgnoreCase("video/mp4") || type.equalsIgnoreCase("video/x-m4v"))) {
            return true;
        }
        String name = file.getOriginalFilename();
        return name != null && name.toLowerCase().endsWith(".mp4");
    }
}
