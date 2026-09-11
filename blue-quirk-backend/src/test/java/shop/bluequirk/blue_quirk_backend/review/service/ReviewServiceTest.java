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
import shop.bluequirk.blue_quirk_backend.review.domain.ReviewStatus;
import shop.bluequirk.blue_quirk_backend.review.dto.ReviewSubmissionRequest;
import shop.bluequirk.blue_quirk_backend.review.dto.ReviewSummaryResponse;
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
                "nope", 1L, 5, "t", "great", "Sara", null, null, null, null, "fr")))
                .isInstanceOf(ResponseStatusException.class);

        verify(reviews, never()).save(any());
    }
}
