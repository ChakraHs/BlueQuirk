package shop.bluequirk.blue_quirk_backend.controller;

import java.util.List;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import jakarta.annotation.PostConstruct;
import shop.bluequirk.blue_quirk_backend.entity.Image;
import shop.bluequirk.blue_quirk_backend.repository.ImageRepository;
import shop.bluequirk.blue_quirk_backend.service.R2StorageService;


@RestController
@RequestMapping("/api/images")
public class ImageController {

    private static final Logger LOG = LoggerFactory.getLogger(ImageController.class);

    private final ImageRepository imageRepository;
    private final R2StorageService r2StorageService;

    @Autowired
    public ImageController(ImageRepository imageRepository, R2StorageService r2StorageService) {
        this.imageRepository = imageRepository;
        this.r2StorageService = r2StorageService;
    }

    @PostConstruct
    void warnIfStorageMisconfigured() {
        if (!r2StorageService.isConfigured()) {
            LOG.error("Cloudflare R2 is NOT configured (set R2_API_TOKEN / CLOUDFLARE_API_TOKEN). "
                    + "Product image uploads will be rejected until it is configured.");
        }
    }

    // GET: List images with pagination
    @GetMapping
    public ResponseEntity<List<Image>> getImages(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {

        Page<Image> imagePage = imageRepository.findAll(PageRequest.of(page, size));

        HttpHeaders headers = new HttpHeaders();
        headers.add("Content-Range",
                String.format("images %d-%d/%d",
                        page * size,
                        Math.min((page + 1) * size - 1, (int) imagePage.getTotalElements() - 1),
                        imagePage.getTotalElements())
        );
        headers.add("Access-Control-Expose-Headers", "Content-Range"); // CORS

        return ResponseEntity.ok().headers(headers).body(imagePage.getContent());
    }

    /**
     * Upload a product image. Images are stored ONLY in Cloudflare R2 (via the
     * existing {@link R2StorageService}); the database keeps just the returned R2
     * URL. There is no local-disk storage path: when R2 is not configured we fail
     * loudly with 503 rather than silently writing to the backend's disk.
     */
    @PostMapping
    public ResponseEntity<Image> uploadImage(@RequestParam("file") MultipartFile file) {
        if (file.isEmpty()) {
            return ResponseEntity.badRequest().build();
        }

        if (!r2StorageService.isConfigured()) {
            LOG.error("Rejected image upload: Cloudflare R2 is not configured (missing R2_API_TOKEN).");
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,
                    "Image storage (Cloudflare R2) is not configured. Set R2_API_TOKEN and retry.");
        }

        try {
            String filename = StringUtils.cleanPath(file.getOriginalFilename());

            // Upload to Cloudflare R2 and persist only the returned public URL.
            String url = r2StorageService.upload(file.getBytes(), filename, file.getContentType());

            Image image = new Image();
            image.setFileName(filename);
            image.setUrl(url);

            Image saved = imageRepository.save(image);
            return ResponseEntity.ok(saved);
        } catch (Exception e) {
            LOG.error("Image upload to R2 failed: {}", e.getMessage(), e);
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Image upload to Cloudflare R2 failed.");
        }
    }
}
