package shop.bluequirk.blue_quirk_backend.review.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * Periodically dispatches post-delivery review requests. Thin — all logic lives in
 * {@link ReviewRequestService#processDueOrders()} (which is a fast no-op while the
 * feature is disabled). Scheduling is already enabled app-wide
 * ({@code @EnableScheduling} on the application class), matching {@code TodifyScheduler}
 * and {@code AnalyticsScheduler}. Runs hourly: the request delay is measured in days,
 * so hourly granularity is far more than enough and keeps DB load negligible.
 */
@Component
public class ReviewRequestScheduler {

    private static final Logger LOG = LoggerFactory.getLogger(ReviewRequestScheduler.class);

    private final ReviewRequestService reviewRequestService;

    public ReviewRequestScheduler(ReviewRequestService reviewRequestService) {
        this.reviewRequestService = reviewRequestService;
    }

    /** Every hour, offset a minute after the hour to avoid colliding with other jobs. */
    @Scheduled(cron = "0 1 * * * *")
    public void dispatchDueReviewRequests() {
        try {
            int sent = reviewRequestService.processDueOrders();
            if (sent > 0) LOG.info("Dispatched {} review request(s).", sent);
        } catch (Exception e) {
            // Never let a scheduling failure escalate.
            LOG.warn("Review request dispatch tick failed: {}", e.getMessage());
        }
    }
}
