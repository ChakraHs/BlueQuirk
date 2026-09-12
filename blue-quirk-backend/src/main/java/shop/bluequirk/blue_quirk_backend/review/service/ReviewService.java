package shop.bluequirk.blue_quirk_backend.review.service;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import shop.bluequirk.blue_quirk_backend.entity.Order;
import shop.bluequirk.blue_quirk_backend.entity.OrderItem;
import shop.bluequirk.blue_quirk_backend.entity.Product;
import shop.bluequirk.blue_quirk_backend.entity.StoreSettings;
import shop.bluequirk.blue_quirk_backend.repository.OrderRepository;
import shop.bluequirk.blue_quirk_backend.repository.ProductRepository;
import shop.bluequirk.blue_quirk_backend.review.domain.ReviewStatus;
import shop.bluequirk.blue_quirk_backend.review.dto.ReviewModerationRequest;
import shop.bluequirk.blue_quirk_backend.review.dto.ProductRatingsResponse;
import shop.bluequirk.blue_quirk_backend.review.dto.ReviewPageResponse;
import shop.bluequirk.blue_quirk_backend.review.dto.ReviewPublic;
import shop.bluequirk.blue_quirk_backend.review.dto.ReviewResponse;
import shop.bluequirk.blue_quirk_backend.review.dto.ReviewSubmissionRequest;
import shop.bluequirk.blue_quirk_backend.review.dto.ReviewSummaryResponse;
import shop.bluequirk.blue_quirk_backend.review.dto.ReviewTokenInfo;
import shop.bluequirk.blue_quirk_backend.review.entity.Review;
import shop.bluequirk.blue_quirk_backend.review.entity.ReviewRequestToken;
import shop.bluequirk.blue_quirk_backend.review.repository.ReviewRepository;
import shop.bluequirk.blue_quirk_backend.review.repository.ReviewRequestTokenRepository;
import shop.bluequirk.blue_quirk_backend.service.StoreSettingsService;

/**
 * All review logic: public storefront reads (gated by {@code reviewsEnabled}),
 * token-verified customer submission, and admin moderation.
 *
 * <p><b>Two independent guarantees live here, both server-side:</b>
 * <ul>
 *   <li><b>Display gating</b> — every public read short-circuits to an empty
 *       response when {@code reviewsEnabled} is off, and otherwise returns only
 *       {@code APPROVED} rows. A frontend bug can never leak drafts/test data.</li>
 *   <li><b>Verified purchase</b> — {@code verifiedPurchase} is set only after
 *       proving the submission token's order actually contains the reviewed
 *       product; it is never read from client input. Submission itself requires a
 *       valid single-use token (no open form), so reviews can be collected while
 *       display stays hidden, then switched on once genuine.</li>
 * </ul>
 */
@Service
public class ReviewService {

    private static final int MAX_BODY = 2000;
    private static final int MAX_TITLE = 140;
    private static final int MAX_NAME = 120;

    private final ReviewRepository reviews;
    private final ReviewRequestTokenRepository tokens;
    private final OrderRepository orders;
    private final ProductRepository products;
    private final StoreSettingsService settingsService;

    public ReviewService(ReviewRepository reviews,
                         ReviewRequestTokenRepository tokens,
                         OrderRepository orders,
                         ProductRepository products,
                         StoreSettingsService settingsService) {
        this.reviews = reviews;
        this.tokens = tokens;
        this.orders = orders;
        this.products = products;
        this.settingsService = settingsService;
    }

    // ------------------------------------------------------------------ public

    /** Compact rating summary — empty (enabled=false) when reviews are globally off. */
    @Transactional(readOnly = true)
    public ReviewSummaryResponse productSummary(Long productId) {
        if (!settingsService.getOrCreate().isReviewsEnabled()) {
            return ReviewSummaryResponse.disabled();
        }
        return ReviewSummaryResponse.from(reviews.aggregate(productId, ReviewStatus.APPROVED));
    }

    /** Paged APPROVED reviews — empty (enabled=false) when reviews are globally off. */
    @Transactional(readOnly = true)
    public ReviewPageResponse productReviews(Long productId, int page, Integer size) {
        StoreSettings s = settingsService.getOrCreate();
        if (!s.isReviewsEnabled()) {
            return ReviewPageResponse.disabled();
        }
        int pageSize = clampSize(size != null ? size : s.getReviewsPerPage());
        Pageable pageable = PageRequest.of(Math.max(0, page), pageSize);
        Page<Review> found = reviews.findByProductIdAndStatusOrderByFeaturedDescCreatedAtDesc(
                productId, ReviewStatus.APPROVED, pageable);
        List<ReviewPublic> cards = found.getContent().stream().map(ReviewPublic::from).toList();
        return new ReviewPageResponse(true, cards, found.getNumber(), found.getTotalPages(),
                found.getTotalElements(), found.hasNext());
    }

    /**
     * Batch ratings (average + count) for many products — the compact card badge in
     * listings. Empty when reviews are disabled; products without approved reviews are
     * omitted. One grouped query, so a whole grid costs a single round-trip.
     */
    @Transactional(readOnly = true)
    public ProductRatingsResponse productRatings(List<Long> productIds) {
        if (!settingsService.getOrCreate().isReviewsEnabled() || productIds == null || productIds.isEmpty()) {
            return ProductRatingsResponse.disabled();
        }
        // Bound the id list so a crafted request can't ask for thousands at once.
        List<Long> ids = productIds.stream().filter(java.util.Objects::nonNull).distinct().limit(100).toList();
        Map<Long, ProductRatingsResponse.Rating> ratings = new java.util.HashMap<>();
        for (var row : reviews.aggregateForProducts(ids, ReviewStatus.APPROVED)) {
            double avg = Math.round(row.getAverage() * 10.0) / 10.0;
            ratings.put(row.getProductId(), new ProductRatingsResponse.Rating(avg, row.getTotal()));
        }
        return new ProductRatingsResponse(true, ratings);
    }

    /** Approved photo reviews for the "customer photos" strip. */
    @Transactional(readOnly = true)
    public ReviewPageResponse productPhotos(Long productId, int limit) {
        StoreSettings s = settingsService.getOrCreate();
        if (!s.isReviewsEnabled() || !s.isReviewPhotosEnabled()) {
            return ReviewPageResponse.disabled();
        }
        Pageable pageable = PageRequest.of(0, clampSize(limit));
        Page<Review> found = reviews
                .findByProductIdAndStatusAndPhotoThumbnailUrlIsNotNullOrderByCreatedAtDesc(
                        productId, ReviewStatus.APPROVED, pageable);
        List<ReviewPublic> cards = found.getContent().stream().map(ReviewPublic::from).toList();
        return new ReviewPageResponse(true, cards, 0, found.getTotalPages(),
                found.getTotalElements(), found.hasNext());
    }

    // ------------------------------------------------------ token + submission

    /** Info the submission page needs (redeemability + the order's products). */
    @Transactional(readOnly = true)
    public ReviewTokenInfo tokenInfo(String token) {
        ReviewRequestToken t = tokens.findByToken(token).orElse(null);
        if (t == null || !t.isRedeemable()) return ReviewTokenInfo.invalid();
        Order order = orders.findById(t.getOrderId()).orElse(null);
        if (order == null) return ReviewTokenInfo.invalid();
        // Distinct products on the order (a customer reviews one product per token).
        List<ReviewTokenInfo.TokenProduct> productList = order.getItems().stream()
                .filter(i -> i.getProductId() != null)
                .collect(Collectors.toMap(OrderItem::getProductId, i -> i, (a, b) -> a))
                .values().stream()
                .map(i -> new ReviewTokenInfo.TokenProduct(i.getProductId(), i.getName(), i.getImageUrl()))
                .toList();
        return new ReviewTokenInfo(true, order.getOrderNumber(), productList);
    }

    /**
     * Redeem a token and store a review. Verification (the token's order actually
     * contains the reviewed product) is what makes it a Verified purchase — the
     * client can never assert that itself. Note: submission is intentionally NOT
     * gated by {@code reviewsEnabled} — the whole point is to gather genuine reviews
     * while display stays hidden, then flip the switch.
     */
    @Transactional
    public ReviewResponse submit(ReviewSubmissionRequest req) {
        if (req == null || req.token() == null) {
            throw badRequest("A review token is required.");
        }
        ReviewRequestToken token = tokens.findByToken(req.token())
                .orElseThrow(() -> badRequest("This review link is invalid."));
        if (!token.isRedeemable()) {
            throw badRequest("This review link has expired or was already used.");
        }
        Order order = orders.findById(token.getOrderId())
                .orElseThrow(() -> badRequest("This review link is invalid."));

        Long productId = req.productId();
        boolean onOrder = productId != null && order.getItems().stream()
                .anyMatch(i -> productId.equals(i.getProductId()));
        if (!onOrder) {
            throw badRequest("The selected product is not part of this order.");
        }

        int rating = req.rating() == null ? 0 : req.rating();
        if (rating < 1 || rating > 5) throw badRequest("Please choose a rating from 1 to 5 stars.");
        String body = requireText(req.body(), MAX_BODY, "review");
        // The form no longer asks for a name — use the (verified) order's first name
        // so the card still shows a real reviewer. Falls back to the customer name,
        // then a neutral label. Never blank.
        String author = trimToNull(req.authorName());
        if (author == null) author = displayNameFromOrder(order);
        author = author.length() > MAX_NAME ? author.substring(0, MAX_NAME) : author;

        StoreSettings s = settingsService.getOrCreate();

        Review r = new Review();
        r.setProductId(productId);
        r.setOrderId(order.getId());
        r.setRating(rating);
        r.setTitle(clip(trimToNull(req.title()), MAX_TITLE));
        r.setBody(body);
        r.setAuthorName(author);
        r.setSizePurchased(clip(trimToNull(req.sizePurchased()), 40));
        r.setVariantColor(clip(trimToNull(req.variantColor()), 60));
        r.setVerifiedPurchase(true); // proven above — never from client input
        // Photos only when the store allows them; still hidden until APPROVED.
        if (s.isReviewPhotosEnabled()) {
            r.setPhotoUrl(trimToNull(req.photoUrl()));
            r.setPhotoThumbnailUrl(trimToNull(req.photoThumbnailUrl()));
        }
        r.setLang(normalizeLang(req.lang()));
        if (s.isReviewsAutoApprove()) {
            r.setStatus(ReviewStatus.APPROVED);
            r.setApprovedAt(Instant.now());
            r.setModeratedByEmail("auto-approve");
        } else {
            r.setStatus(ReviewStatus.PENDING);
        }
        Review saved = reviews.save(r);

        // Single-use: burn the token so the link can't be replayed.
        token.setUsedAt(Instant.now());
        tokens.save(token);

        return toResponse(saved);
    }

    // ------------------------------------------------------------------- admin

    @Transactional(readOnly = true)
    public ReviewPageResponseAdmin adminList(Long productId, String status, String search,
                                             int page, int size) {
        ReviewStatus st = parseStatusOrNull(status);
        String q = trimToNull(search) == null ? null : "%" + search.trim().toLowerCase() + "%";
        Pageable pageable = PageRequest.of(Math.max(0, page), clampSize(size));
        Page<Review> found = reviews.adminSearch(productId, st, q, pageable);
        Map<Long, String> names = productNames(found.getContent());
        List<ReviewResponse> list = found.getContent().stream()
                .map(r -> ReviewResponse.from(r, names.get(r.getProductId())))
                .toList();
        return new ReviewPageResponseAdmin(list, found.getNumber(), found.getTotalPages(),
                found.getTotalElements(), found.hasNext(),
                reviews.countByStatus(ReviewStatus.PENDING),
                reviews.countByStatus(ReviewStatus.APPROVED),
                reviews.countByStatus(ReviewStatus.REJECTED));
    }

    @Transactional(readOnly = true)
    public ReviewResponse getForAdmin(Long id) {
        return toResponse(find(id));
    }

    /** Star distribution for a product, across APPROVED reviews (admin insight). */
    @Transactional(readOnly = true)
    public ReviewSummaryResponse distribution(Long productId) {
        return ReviewSummaryResponse.from(reviews.aggregate(productId, ReviewStatus.APPROVED));
    }

    @Transactional
    public ReviewResponse approve(Long id, String actor) {
        Review r = find(id);
        r.setStatus(ReviewStatus.APPROVED);
        r.setApprovedAt(Instant.now());
        r.setModeratedByEmail(actor);
        return toResponse(reviews.save(r));
    }

    @Transactional
    public ReviewResponse reject(Long id, String actor) {
        Review r = find(id);
        r.setStatus(ReviewStatus.REJECTED);
        r.setModeratedByEmail(actor);
        return toResponse(reviews.save(r));
    }

    @Transactional
    public ReviewResponse setFeatured(Long id, boolean featured, String actor) {
        Review r = find(id);
        r.setFeatured(featured);
        r.setModeratedByEmail(actor);
        return toResponse(reviews.save(r));
    }

    @Transactional
    public void delete(Long id) {
        if (!reviews.existsById(id)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Review not found");
        }
        reviews.deleteById(id);
    }

    @Transactional
    public ReviewResponse edit(Long id, ReviewModerationRequest req, String actor) {
        Review r = find(id);
        if (req.rating() != null) {
            if (req.rating() < 1 || req.rating() > 5) throw badRequest("Rating must be 1–5.");
            r.setRating(req.rating());
        }
        if (req.title() != null) r.setTitle(clip(trimToNull(req.title()), MAX_TITLE));
        if (req.body() != null) r.setBody(requireText(req.body(), MAX_BODY, "review"));
        if (req.authorName() != null) r.setAuthorName(requireText(req.authorName(), MAX_NAME, "name"));
        if (req.sizePurchased() != null) r.setSizePurchased(clip(trimToNull(req.sizePurchased()), 40));
        if (req.variantColor() != null) r.setVariantColor(clip(trimToNull(req.variantColor()), 60));
        if (req.featured() != null) r.setFeatured(req.featured());
        if (req.photoUrl() != null) r.setPhotoUrl(trimToNull(req.photoUrl()));
        if (req.photoThumbnailUrl() != null) r.setPhotoThumbnailUrl(trimToNull(req.photoThumbnailUrl()));
        if (req.status() != null) {
            ReviewStatus st = parseStatusOrNull(req.status());
            if (st == null) throw badRequest("Unknown status: " + req.status());
            r.setStatus(st);
            if (st == ReviewStatus.APPROVED && r.getApprovedAt() == null) r.setApprovedAt(Instant.now());
        }
        r.setModeratedByEmail(actor);
        return toResponse(reviews.save(r));
    }

    /**
     * Admin-entered review (e.g. transcribing a genuine WhatsApp testimonial). Stored
     * as PENDING by default so it still passes through the normal approval gate.
     * Verified-purchase is only set when a real orderId is supplied and contains the
     * product — never fabricated.
     */
    @Transactional
    public ReviewResponse adminCreate(ReviewModerationRequest req, Long productId, Long orderId,
                                      String authorName, String actor) {
        if (productId == null) throw badRequest("A product is required.");
        int rating = req.rating() == null ? 0 : req.rating();
        if (rating < 1 || rating > 5) throw badRequest("Rating must be 1–5.");
        Review r = new Review();
        r.setProductId(productId);
        r.setRating(rating);
        r.setTitle(clip(trimToNull(req.title()), MAX_TITLE));
        r.setBody(requireText(req.body(), MAX_BODY, "review"));
        r.setAuthorName(requireText(authorName, MAX_NAME, "name"));
        r.setSizePurchased(clip(trimToNull(req.sizePurchased()), 40));
        r.setVariantColor(clip(trimToNull(req.variantColor()), 60));
        r.setPhotoUrl(trimToNull(req.photoUrl()));
        r.setPhotoThumbnailUrl(trimToNull(req.photoThumbnailUrl()));
        r.setFeatured(Boolean.TRUE.equals(req.featured()));
        if (orderId != null) {
            Order order = orders.findById(orderId).orElse(null);
            boolean onOrder = order != null && order.getItems().stream()
                    .anyMatch(i -> productId.equals(i.getProductId()));
            if (onOrder) {
                r.setOrderId(orderId);
                r.setVerifiedPurchase(true);
            }
        }
        ReviewStatus st = parseStatusOrNull(req.status());
        r.setStatus(st != null ? st : ReviewStatus.PENDING);
        if (r.getStatus() == ReviewStatus.APPROVED) {
            r.setApprovedAt(Instant.now());
        }
        r.setModeratedByEmail(actor);
        return toResponse(reviews.save(r));
    }

    // ----------------------------------------------------------------- helpers

    private Review find(Long id) {
        return reviews.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Review not found"));
    }

    private ReviewResponse toResponse(Review r) {
        String name = products.findById(r.getProductId()).map(Product::getName).orElse(null);
        return ReviewResponse.from(r, name);
    }

    /** Batch-resolve product display names for an admin page (one query, no N+1). */
    private Map<Long, String> productNames(List<Review> page) {
        List<Long> ids = page.stream().map(Review::getProductId).distinct().toList();
        if (ids.isEmpty()) return Map.of();
        return products.findAllById(ids).stream()
                .collect(Collectors.toMap(Product::getId, Product::getName, (a, b) -> a));
    }

    private ReviewStatus parseStatusOrNull(String raw) {
        String v = trimToNull(raw);
        if (v == null) return null;
        try {
            return ReviewStatus.valueOf(v.toUpperCase());
        } catch (IllegalArgumentException e) {
            return null;
        }
    }

    private int clampSize(int size) {
        if (size < 1) return 8;
        return Math.min(size, 50);
    }

    private String requireText(String v, int max, String field) {
        String t = trimToNull(v);
        if (t == null) throw badRequest("The " + field + " is required.");
        return t.length() > max ? t.substring(0, max) : t;
    }

    private String clip(String v, int max) {
        if (v == null) return null;
        return v.length() > max ? v.substring(0, max) : v;
    }

    private String trimToNull(String s) {
        return (s != null && !s.isBlank()) ? s.trim() : null;
    }

    /** A display name for a review from its order: first name, else first word of the full name. */
    private String displayNameFromOrder(Order order) {
        String first = trimToNull(order.getFirstName());
        if (first != null) return first;
        String full = trimToNull(order.getCustomerName());
        if (full != null) return full.split("\\s+")[0]; // just the first word, for privacy
        return "Client";
    }

    private String normalizeLang(String lang) {
        String l = lang == null ? "" : lang.trim().toLowerCase();
        return (l.equals("en") || l.equals("ar")) ? l : "fr";
    }

    private ResponseStatusException badRequest(String msg) {
        return new ResponseStatusException(HttpStatus.BAD_REQUEST, msg);
    }

    /** Admin page wrapper with moderation-queue counts for the table header. */
    public record ReviewPageResponseAdmin(
            List<ReviewResponse> reviews,
            int page,
            int totalPages,
            long totalElements,
            boolean hasMore,
            long pendingCount,
            long approvedCount,
            long rejectedCount) {}
}
