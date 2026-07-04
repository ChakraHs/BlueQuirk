package shop.bluequirk.blue_quirk_backend.analytics;

import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import shop.bluequirk.blue_quirk_backend.analytics.entity.AnalyticsSession;
import shop.bluequirk.blue_quirk_backend.analytics.repository.AnalyticsEventRepository;
import shop.bluequirk.blue_quirk_backend.analytics.repository.AnalyticsPageViewRepository;
import shop.bluequirk.blue_quirk_backend.analytics.repository.AnalyticsSessionRepository;
import shop.bluequirk.blue_quirk_backend.analytics.service.AnalyticsAggregationService;

/**
 * Background maintenance for analytics (scheduling is enabled app-wide). Three
 * jobs: close idle sessions (so bounce/duration finalize), roll yesterday into a
 * daily summary, and prune raw rows past the retention window. Daily summaries are
 * never deleted.
 */
@Component
public class AnalyticsScheduler {

    private static final Logger log = LoggerFactory.getLogger(AnalyticsScheduler.class);

    private final AnalyticsSessionRepository sessionRepo;
    private final AnalyticsPageViewRepository pageViewRepo;
    private final AnalyticsEventRepository eventRepo;
    private final AnalyticsAggregationService aggregationService;
    private final long sessionTimeoutMinutes;
    private final int retentionRawDays;

    public AnalyticsScheduler(AnalyticsSessionRepository sessionRepo,
                              AnalyticsPageViewRepository pageViewRepo,
                              AnalyticsEventRepository eventRepo,
                              AnalyticsAggregationService aggregationService,
                              @Value("${analytics.session-timeout-minutes:30}") long sessionTimeoutMinutes,
                              @Value("${analytics.retention.raw-days:90}") int retentionRawDays) {
        this.sessionRepo = sessionRepo;
        this.pageViewRepo = pageViewRepo;
        this.eventRepo = eventRepo;
        this.aggregationService = aggregationService;
        this.sessionTimeoutMinutes = sessionTimeoutMinutes;
        this.retentionRawDays = retentionRawDays;
    }

    /** Close sessions idle beyond the timeout, finalizing duration + bounce. */
    @Scheduled(fixedDelay = 10 * 60 * 1000L, initialDelay = 60 * 1000L)
    @Transactional
    public void closeStaleSessions() {
        Instant cutoff = Instant.now().minus(Duration.ofMinutes(sessionTimeoutMinutes));
        List<AnalyticsSession> stale = sessionRepo.findByEndedAtIsNullAndLastActivityAtBefore(cutoff);
        if (stale.isEmpty()) {
            return;
        }
        for (AnalyticsSession s : stale) {
            s.setEndedAt(s.getLastActivityAt());
            s.setDurationSeconds(Math.max(0,
                    Duration.between(s.getStartedAt(), s.getLastActivityAt()).getSeconds()));
            s.setBounce(s.getPageViewCount() <= 1);
        }
        sessionRepo.saveAll(stale);
        log.info("Analytics: closed {} idle session(s).", stale.size());
    }

    /** Roll up yesterday into a permanent daily summary (runs after midnight). */
    @Scheduled(cron = "${analytics.aggregate-cron:0 15 0 * * *}")
    public void aggregateYesterday() {
        aggregationService.aggregateDay(LocalDate.now().minusDays(1));
    }

    /** Prune raw events/page views/closed sessions past the retention window. */
    @Scheduled(cron = "${analytics.cleanup-cron:0 30 3 * * *}")
    @Transactional
    public void cleanupOldRawData() {
        Instant cutoff = Instant.now().minus(Duration.ofDays(retentionRawDays));
        int pv = pageViewRepo.deleteOlderThan(cutoff);
        int ev = eventRepo.deleteOlderThan(cutoff);
        int se = sessionRepo.deleteClosedBefore(cutoff);
        log.info("Analytics retention: pruned {} page views, {} events, {} sessions older than {} days.",
                pv, ev, se, retentionRawDays);
    }
}
