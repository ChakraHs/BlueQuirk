package shop.bluequirk.blue_quirk_backend.analytics.service;

import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.List;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.fasterxml.jackson.databind.ObjectMapper;

import shop.bluequirk.blue_quirk_backend.analytics.dto.LabelCount;
import shop.bluequirk.blue_quirk_backend.analytics.dto.PageStatRow;
import shop.bluequirk.blue_quirk_backend.analytics.dto.ProductViewRow;
import shop.bluequirk.blue_quirk_backend.analytics.entity.AnalyticsDailyStats;
import shop.bluequirk.blue_quirk_backend.analytics.repository.AnalyticsDailyStatsRepository;
import shop.bluequirk.blue_quirk_backend.analytics.repository.AnalyticsOrderStatsRepository;
import shop.bluequirk.blue_quirk_backend.analytics.repository.AnalyticsPageViewRepository;
import shop.bluequirk.blue_quirk_backend.analytics.repository.AnalyticsSessionRepository;

/**
 * Rolls one day of raw events into a single {@link AnalyticsDailyStats} row. These
 * summaries are kept forever (raw rows are pruned after the retention window), so
 * long historical ranges can be served without touching raw tables. Idempotent:
 * re-running a day overwrites its row.
 */
@Service
public class AnalyticsAggregationService {

    private static final Logger log = LoggerFactory.getLogger(AnalyticsAggregationService.class);
    private static final ZoneId ZONE = ZoneId.systemDefault();
    private static final int TOP = 20;

    private final AnalyticsSessionRepository sessionRepo;
    private final AnalyticsPageViewRepository pageViewRepo;
    private final AnalyticsOrderStatsRepository orderStatsRepo;
    private final AnalyticsDailyStatsRepository dailyStatsRepo;
    private final ObjectMapper objectMapper;

    public AnalyticsAggregationService(AnalyticsSessionRepository sessionRepo,
                                       AnalyticsPageViewRepository pageViewRepo,
                                       AnalyticsOrderStatsRepository orderStatsRepo,
                                       AnalyticsDailyStatsRepository dailyStatsRepo,
                                       ObjectMapper objectMapper) {
        this.sessionRepo = sessionRepo;
        this.pageViewRepo = pageViewRepo;
        this.orderStatsRepo = orderStatsRepo;
        this.dailyStatsRepo = dailyStatsRepo;
        this.objectMapper = objectMapper;
    }

    @Transactional
    public void aggregateDay(LocalDate day) {
        Instant from = day.atStartOfDay(ZONE).toInstant();
        Instant to = day.plusDays(1).atStartOfDay(ZONE).toInstant();
        LocalDateTime fromLocal = LocalDateTime.ofInstant(from, ZONE);
        LocalDateTime toLocal = LocalDateTime.ofInstant(to, ZONE);

        long visits = sessionRepo.countByStartedAtBetween(from, to);
        long uniques = sessionRepo.countUniqueVisitors(from, to);
        long newVisitors = sessionRepo.countNewVisitors(from, to);
        long bounces = sessionRepo.countBounces(from, to);
        double avgSession = sessionRepo.avgDurationSeconds(from, to);
        long pageViews = pageViewRepo.countByCreatedAtBetween(from, to);
        long orders = orderStatsRepo.countOrders(fromLocal, toLocal);
        double revenue = orderStatsRepo.sumRevenue(fromLocal, toLocal);

        AnalyticsDailyStats row = dailyStatsRepo.findByDay(day).orElseGet(AnalyticsDailyStats::new);
        row.setDay(day);
        row.setTotalVisits(visits);
        row.setSessions(visits);
        row.setUniqueVisitors(uniques);
        row.setNewVisitors(newVisitors);
        row.setReturningVisitors(Math.max(0, uniques - newVisitors));
        row.setPageViews(pageViews);
        row.setBounces(bounces);
        row.setAvgSessionSeconds(Math.round(avgSession));
        row.setOrders(orders);
        row.setRevenue(revenue);

        row.setTopPagesJson(json(topPages(from, to)));
        row.setTopProductsJson(json(topProducts(from, to)));
        row.setReferrersJson(json(LabelCount.fromEnumRows(sessionRepo.referrerBreakdown(from, to))));
        row.setDevicesJson(json(LabelCount.fromEnumRows(sessionRepo.deviceBreakdown(from, to))));
        row.setCountriesJson(json(sessionRepo.countryBreakdown(from, to)));

        dailyStatsRepo.save(row);
        log.info("Analytics: aggregated {} ({} visits, {} page views, {} orders).",
                day, visits, pageViews, orders);
    }

    private List<LabelCount> topPages(Instant from, Instant to) {
        return pageViewRepo.pageStats(from, to).stream()
                .limit(TOP)
                .map((PageStatRow r) -> new LabelCount(r.path(), r.views()))
                .toList();
    }

    private List<LabelCount> topProducts(Instant from, Instant to) {
        return pageViewRepo.productViews(from, to).stream()
                .sorted((a, b) -> Long.compare(b.views(), a.views()))
                .limit(TOP)
                .map((ProductViewRow r) -> new LabelCount(String.valueOf(r.productId()), r.views()))
                .toList();
    }

    private String json(Object value) {
        try {
            return objectMapper.writeValueAsString(value);
        } catch (Exception e) {
            return "[]";
        }
    }
}
