package shop.bluequirk.blue_quirk_backend.review.controller;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import shop.bluequirk.blue_quirk_backend.identity.user.CurrentUserService;
import shop.bluequirk.blue_quirk_backend.review.dto.ReviewModerationRequest;
import shop.bluequirk.blue_quirk_backend.review.dto.ReviewResponse;
import shop.bluequirk.blue_quirk_backend.review.dto.ReviewSummaryResponse;
import shop.bluequirk.blue_quirk_backend.review.service.ReviewRequestService;
import shop.bluequirk.blue_quirk_backend.review.service.ReviewRequestService.ManualSendResult;
import shop.bluequirk.blue_quirk_backend.review.service.ReviewService;
import shop.bluequirk.blue_quirk_backend.review.service.ReviewService.ReviewPageResponseAdmin;

/**
 * Admin review moderation API. Admin-only via the fail-closed SecurityConfig default
 * plus an explicit {@code @PreAuthorize}. Thin — all logic is in {@link ReviewService}.
 * Mirrors {@code AnnouncementAdminController}.
 */
@RestController
@RequestMapping("/api/reviews")
@PreAuthorize("hasAuthority('admin')")
public class ReviewAdminController {

    private final ReviewService service;
    private final ReviewRequestService reviewRequestService;
    private final CurrentUserService currentUserService;

    public ReviewAdminController(ReviewService service,
                                 ReviewRequestService reviewRequestService,
                                 CurrentUserService currentUserService) {
        this.service = service;
        this.reviewRequestService = reviewRequestService;
        this.currentUserService = currentUserService;
    }

    private String actor() {
        return currentUserService.require().getEmail();
    }

    @GetMapping
    public ReviewPageResponseAdmin list(
            @RequestParam(required = false) Long productId,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String search,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return service.adminList(productId, status, search, page, size);
    }

    @GetMapping("/{id}")
    public ReviewResponse get(@PathVariable Long id) {
        return service.getForAdmin(id);
    }

    @GetMapping("/distribution")
    public ReviewSummaryResponse distribution(@RequestParam Long productId) {
        return service.distribution(productId);
    }

    /** Admin-entered review (e.g. transcribing a genuine testimonial). Defaults to PENDING. */
    @PostMapping
    public ResponseEntity<ReviewResponse> create(@RequestBody AdminReviewCreateRequest req) {
        ReviewResponse created = service.adminCreate(req.review(), req.productId(), req.orderId(),
                req.authorName(), actor());
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @PutMapping("/{id}")
    public ReviewResponse edit(@PathVariable Long id, @RequestBody ReviewModerationRequest req) {
        return service.edit(id, req, actor());
    }

    @PatchMapping("/{id}/approve")
    public ReviewResponse approve(@PathVariable Long id) {
        return service.approve(id, actor());
    }

    @PatchMapping("/{id}/reject")
    public ReviewResponse reject(@PathVariable Long id) {
        return service.reject(id, actor());
    }

    @PatchMapping("/{id}/feature")
    public ReviewResponse feature(@PathVariable Long id, @RequestBody FeatureRequest req) {
        return service.setFeatured(id, req.featured(), actor());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        service.delete(id);
        return ResponseEntity.noContent().build();
    }

    /**
     * Manually send (or just mint) a review request for one order — the "Send review
     * link" button on the order page. Works for orders that shipped before the feature
     * existed. {@code sendEmail} defaults to true; pass false to only get the copyable
     * link back (e.g. to share on WhatsApp).
     */
    @PostMapping("/orders/{orderId}/send")
    public ManualSendResult sendForOrder(@PathVariable Long orderId,
                                         @RequestBody(required = false) SendRequest req) {
        boolean sendEmail = req == null || req.sendEmail() == null || req.sendEmail();
        return reviewRequestService.sendForOrder(orderId, sendEmail);
    }

    public record SendRequest(Boolean sendEmail) {}

    public record FeatureRequest(boolean featured) {}

    public record AdminReviewCreateRequest(
            Long productId,
            Long orderId,
            String authorName,
            ReviewModerationRequest review) {}
}
