package shop.bluequirk.blue_quirk_backend.review.controller;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import shop.bluequirk.blue_quirk_backend.entity.Image;
import shop.bluequirk.blue_quirk_backend.review.dto.ProductRatingsResponse;
import shop.bluequirk.blue_quirk_backend.review.dto.ReviewPageResponse;
import shop.bluequirk.blue_quirk_backend.review.dto.ReviewResponse;
import shop.bluequirk.blue_quirk_backend.review.dto.ReviewSubmissionRequest;
import shop.bluequirk.blue_quirk_backend.review.dto.ReviewSummaryResponse;
import shop.bluequirk.blue_quirk_backend.review.dto.ReviewTokenInfo;
import shop.bluequirk.blue_quirk_backend.review.service.ReviewService;
import shop.bluequirk.blue_quirk_backend.service.ProductImageService;
import shop.bluequirk.blue_quirk_backend.service.R2StorageService;

/**
 * Public storefront review API under {@code /api/shop/reviews/**} (the same
 * display-only, non-secret prefix as {@code /api/shop/announcements}). Reads are
 * open; the two write endpoints (submit + photo) require a valid single-use delivery
 * token — there is deliberately no anonymous form. The GET endpoints return empty
 * responses while {@code reviewsEnabled} is off (enforced in {@link ReviewService}),
 * so the storefront renders no review DOM at all.
 */
@RestController
@RequestMapping("/api/shop/reviews")
public class ReviewPublicController {

    private static final Logger LOG = LoggerFactory.getLogger(ReviewPublicController.class);

    private final ReviewService service;
    private final ProductImageService productImageService;
    private final R2StorageService r2StorageService;

    public ReviewPublicController(ReviewService service,
                                  ProductImageService productImageService,
                                  R2StorageService r2StorageService) {
        this.service = service;
        this.productImageService = productImageService;
        this.r2StorageService = r2StorageService;
    }

    // --- reads (gated by reviewsEnabled inside the service) ---

    @GetMapping("/product/{productId}/summary")
    public ReviewSummaryResponse summary(@PathVariable Long productId) {
        return service.productSummary(productId);
    }

    /**
     * Batch ratings for the product-card badge in listings: {@code ?ids=1,2,3}. One
     * request per grid (no N+1). Empty while reviews are disabled.
     */
    @GetMapping("/summaries")
    public ProductRatingsResponse summaries(@RequestParam("ids") java.util.List<Long> ids) {
        return service.productRatings(ids);
    }

    @GetMapping("/product/{productId}")
    public ReviewPageResponse reviews(@PathVariable Long productId,
                                      @RequestParam(defaultValue = "0") int page,
                                      @RequestParam(required = false) Integer size) {
        return service.productReviews(productId, page, size);
    }

    @GetMapping("/product/{productId}/photos")
    public ReviewPageResponse photos(@PathVariable Long productId,
                                     @RequestParam(defaultValue = "12") int limit) {
        return service.productPhotos(productId, limit);
    }

    // --- token-gated submission ---

    /** Info the submission page needs (redeemability + the order's products). No PII. */
    @GetMapping("/token/{token}")
    public ReviewTokenInfo tokenInfo(@PathVariable String token) {
        return service.tokenInfo(token);
    }

    @PostMapping("/submit")
    public ReviewSubmissionResult submit(@RequestBody ReviewSubmissionRequest req) {
        ReviewResponse created = service.submit(req);
        boolean approved = "APPROVED".equals(created.status());
        return new ReviewSubmissionResult(approved ? "approved" : "pending");
    }

    /**
     * Upload a customer review photo. Token-gated (no anonymous upload surface) and
     * only reachable while the token is redeemable. Reuses the product image pipeline
     * (R2 + auto WebP thumbnail/display variants). The photo is NOT public yet — it is
     * only attached to a review, which still needs admin approval before it shows.
     */
    @PostMapping("/photo")
    public PhotoUploadResult uploadPhoto(@RequestParam("token") String token,
                                         @RequestParam("file") MultipartFile file) {
        if (!service.tokenInfo(token).valid()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "This review link is invalid or expired.");
        }
        if (file == null || file.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "No file provided.");
        }
        if (!r2StorageService.isConfigured()) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,
                    "Image storage is not configured.");
        }
        try {
            String filename = "review-" + StringUtils.cleanPath(file.getOriginalFilename());
            Image image = productImageService.buildOptimizedImage(
                    file.getBytes(), filename, file.getContentType());
            return new PhotoUploadResult(image.getDisplayUrl(), image.getThumbnailUrl());
        } catch (Exception e) {
            LOG.error("Review photo upload failed: {}", e.getMessage(), e);
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Photo upload failed.");
        }
    }

    public record ReviewSubmissionResult(String status) {}
    public record PhotoUploadResult(String url, String thumbnailUrl) {}
}
