package shop.bluequirk.blue_quirk_backend.review.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.web.server.ResponseStatusException;

import shop.bluequirk.blue_quirk_backend.entity.StoreSettings;
import shop.bluequirk.blue_quirk_backend.repository.OrderRepository;
import shop.bluequirk.blue_quirk_backend.repository.ProductRepository;
import shop.bluequirk.blue_quirk_backend.review.domain.DisplayNameMode;
import shop.bluequirk.blue_quirk_backend.review.domain.ReviewStatus;
import shop.bluequirk.blue_quirk_backend.review.dto.ReviewModerationRequest;
import shop.bluequirk.blue_quirk_backend.review.dto.ReviewResponse;
import shop.bluequirk.blue_quirk_backend.review.dto.ReviewSubmissionRequest;
import shop.bluequirk.blue_quirk_backend.review.dto.ReviewSummaryResponse;
import shop.bluequirk.blue_quirk_backend.review.entity.Review;
import shop.bluequirk.blue_quirk_backend.review.repository.ReviewAuditLogRepository;
import shop.bluequirk.blue_quirk_backend.review.repository.ReviewRepository;
import shop.bluequirk.blue_quirk_backend.review.repository.ReviewRequestTokenRepository;
import shop.bluequirk.blue_quirk_backend.service.StoreSettingsService;

/**
 * Guards the two core promises of the review system:
 *  1. Nothing is exposed publicly while reviews are disabled (and the repository is
 *     never even queried — no chance of leaking pending/rejected/test rows).
 *  2. Submission requires a valid delivery token (no anonymous/open form).
 */
@ExtendWith(MockitoExtension.class)
class ReviewServiceTest {

    @Mock ReviewRepository reviews;
    @Mock ReviewRequestTokenRepository tokens;
    @Mock OrderRepository orders;
    @Mock ProductRepository products;
    @Mock StoreSettingsService settingsService;
    @Mock ReviewAuditLogRepository auditLogs;

    @InjectMocks ReviewService service;

    private StoreSettings settings;

    @BeforeEach
    void setUp() {
        settings = new StoreSettings();
    }

    @Test
    void summary_isEmpty_andRepositoryUntouched_whenReviewsDisabled() {
        settings.setReviewsEnabled(false);
        when(settingsService.getOrCreate()).thenReturn(settings);

        ReviewSummaryResponse summary = service.productSummary(42L);

        assertThat(summary.enabled()).isFalse();
        assertThat(summary.total()).isZero();
        verifyNoInteractions(reviews); // never queried while disabled → cannot leak
    }

    @Test
    void reviewsPage_isEmpty_andRepositoryUntouched_whenReviewsDisabled() {
        settings.setReviewsEnabled(false);
        when(settingsService.getOrCreate()).thenReturn(settings);

        var page = service.productReviews(42L, 0, null);

        assertThat(page.enabled()).isFalse();
        assertThat(page.reviews()).isEmpty();
        verifyNoInteractions(reviews);
    }

    @Test
    void summary_queriesApprovedOnly_whenEnabled() {
        settings.setReviewsEnabled(true);
        when(settingsService.getOrCreate()).thenReturn(settings);
        when(reviews.aggregate(eq(42L), eq(ReviewStatus.APPROVED))).thenReturn(null);

        ReviewSummaryResponse summary = service.productSummary(42L);

        assertThat(summary.enabled()).isTrue();
        verify(reviews).aggregate(42L, ReviewStatus.APPROVED); // APPROVED only
    }

    @Test
    void submit_rejectsUnknownToken() {
        when(tokens.findByToken("nope")).thenReturn(java.util.Optional.empty());

        assertThatThrownBy(() -> service.submit(new ReviewSubmissionRequest(
                "nope", 1L, null, 5, "t", "great", "Sara", null, null, null, null, "fr")))
                .isInstanceOf(ResponseStatusException.class);

        verify(reviews, never()).save(any());
    }

    // --- Display-name derivation (feature: choose displayed name on approval) ----

    private Review reviewWithOriginal(String original) {
        Review r = new Review();
        r.setAuthorName(original);
        r.setOriginalAuthorName(original);
        r.setBody("great tee");
        r.setRating(5);
        return r;
    }

    @Test
    void resolveDisplayName_coversAllModes() {
        Review r = reviewWithOriginal("Sara Bennani");
        assertThat(service.resolveDisplayName(r, DisplayNameMode.ORIGINAL, null)).isEqualTo("Sara Bennani");
        assertThat(service.resolveDisplayName(r, DisplayNameMode.FIRST_NAME, null)).isEqualTo("Sara");
        assertThat(service.resolveDisplayName(r, DisplayNameMode.ANONYMIZED, null)).isEqualTo("Sara B.");
        assertThat(service.resolveDisplayName(r, DisplayNameMode.CUSTOM, "Une cliente")).isEqualTo("Une cliente");
    }

    @Test
    void resolveDisplayName_anonymized_singleWord_returnsWord() {
        Review r = reviewWithOriginal("Sara");
        assertThat(service.resolveDisplayName(r, DisplayNameMode.ANONYMIZED, null)).isEqualTo("Sara");
    }

    @Test
    void resolveDisplayName_custom_requiresValue() {
        Review r = reviewWithOriginal("Sara Bennani");
        assertThatThrownBy(() -> service.resolveDisplayName(r, DisplayNameMode.CUSTOM, null))
                .isInstanceOf(ResponseStatusException.class);
    }

    @Test
    void edit_appliesDisplayNameMode_preservesOriginal_andAudits() {
        Review r = new Review();
        r.setId(7L);
        r.setAuthorName("Sara Bennani"); // acts as the (legacy) submitted name
        r.setBody("Really love it");
        r.setRating(5);
        r.setStatus(ReviewStatus.PENDING);
        when(reviews.findById(7L)).thenReturn(java.util.Optional.of(r));
        when(reviews.save(any(Review.class))).thenAnswer(inv -> inv.getArgument(0));
        when(products.findById(any())).thenReturn(java.util.Optional.empty());

        ReviewResponse res = service.edit(7L,
                new ReviewModerationRequest(null, null, null, null, null, null, null, null,
                        null, null, "ANONYMIZED", null),
                "admin@redquirk.com");

        // Public name anonymized, but the original is snapshotted + preserved.
        assertThat(res.authorName()).isEqualTo("Sara B.");
        assertThat(r.getOriginalAuthorName()).isEqualTo("Sara Bennani");
        assertThat(r.getDisplayNameMode()).isEqualTo(DisplayNameMode.ANONYMIZED);
        verify(auditLogs).save(any()); // the edit is recorded for transparency
    }
}
