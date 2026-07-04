package shop.bluequirk.blue_quirk_backend.analytics.repository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import shop.bluequirk.blue_quirk_backend.analytics.dto.LabelCount;
import shop.bluequirk.blue_quirk_backend.analytics.entity.AnalyticsSession;

public interface AnalyticsSessionRepository extends JpaRepository<AnalyticsSession, Long> {

    Optional<AnalyticsSession> findBySessionId(String sessionId);

    /** Open sessions idle past the cutoff — the reaper closes these. */
    List<AnalyticsSession> findByEndedAtIsNullAndLastActivityAtBefore(Instant cutoff);

    /** Total visits (sessions) started in the window. */
    long countByStartedAtBetween(Instant from, Instant to);

    /** Approximate online visitors: sessions active since the given instant. */
    long countByLastActivityAtAfter(Instant since);

    // ---- window aggregates (a session is attributed to the day it started) ----

    @Query("SELECT COUNT(DISTINCT s.visitorId) FROM AnalyticsSession s "
            + "WHERE s.startedAt >= :from AND s.startedAt < :to")
    long countUniqueVisitors(@Param("from") Instant from, @Param("to") Instant to);

    @Query("SELECT COUNT(DISTINCT s.visitorId) FROM AnalyticsSession s "
            + "WHERE s.newVisitor = true AND s.startedAt >= :from AND s.startedAt < :to")
    long countNewVisitors(@Param("from") Instant from, @Param("to") Instant to);

    @Query("SELECT COUNT(s) FROM AnalyticsSession s "
            + "WHERE s.pageViewCount <= 1 AND s.startedAt >= :from AND s.startedAt < :to")
    long countBounces(@Param("from") Instant from, @Param("to") Instant to);

    @Query("SELECT COALESCE(AVG(s.durationSeconds), 0) FROM AnalyticsSession s "
            + "WHERE s.endedAt IS NOT NULL AND s.startedAt >= :from AND s.startedAt < :to")
    double avgDurationSeconds(@Param("from") Instant from, @Param("to") Instant to);

    // ---- breakdowns (grouped by session) ----

    /** Raw [DeviceType, count] rows — mapped to labels in the service (avoids enum CAST in JPQL). */
    @Query("SELECT s.deviceType, COUNT(s) FROM AnalyticsSession s "
            + "WHERE s.deviceType IS NOT NULL AND s.startedAt >= :from AND s.startedAt < :to "
            + "GROUP BY s.deviceType ORDER BY COUNT(s) DESC")
    List<Object[]> deviceBreakdown(@Param("from") Instant from, @Param("to") Instant to);

    @Query("SELECT new shop.bluequirk.blue_quirk_backend.analytics.dto.LabelCount(s.browser, COUNT(s)) "
            + "FROM AnalyticsSession s WHERE s.browser IS NOT NULL AND s.startedAt >= :from AND s.startedAt < :to "
            + "GROUP BY s.browser ORDER BY COUNT(s) DESC")
    List<LabelCount> browserBreakdown(@Param("from") Instant from, @Param("to") Instant to);

    @Query("SELECT new shop.bluequirk.blue_quirk_backend.analytics.dto.LabelCount(s.os, COUNT(s)) "
            + "FROM AnalyticsSession s WHERE s.os IS NOT NULL AND s.startedAt >= :from AND s.startedAt < :to "
            + "GROUP BY s.os ORDER BY COUNT(s) DESC")
    List<LabelCount> osBreakdown(@Param("from") Instant from, @Param("to") Instant to);

    @Query("SELECT new shop.bluequirk.blue_quirk_backend.analytics.dto.LabelCount(s.screen, COUNT(s)) "
            + "FROM AnalyticsSession s WHERE s.screen IS NOT NULL AND s.startedAt >= :from AND s.startedAt < :to "
            + "GROUP BY s.screen ORDER BY COUNT(s) DESC")
    List<LabelCount> screenBreakdown(@Param("from") Instant from, @Param("to") Instant to);

    /** Raw [ReferrerSource, count] rows — mapped to labels in the service. */
    @Query("SELECT s.referrerSource, COUNT(s) FROM AnalyticsSession s "
            + "WHERE s.referrerSource IS NOT NULL AND s.startedAt >= :from AND s.startedAt < :to "
            + "GROUP BY s.referrerSource ORDER BY COUNT(s) DESC")
    List<Object[]> referrerBreakdown(@Param("from") Instant from, @Param("to") Instant to);

    @Query("SELECT new shop.bluequirk.blue_quirk_backend.analytics.dto.LabelCount(s.country, COUNT(s)) "
            + "FROM AnalyticsSession s WHERE s.country IS NOT NULL AND s.startedAt >= :from AND s.startedAt < :to "
            + "GROUP BY s.country ORDER BY COUNT(s) DESC")
    List<LabelCount> countryBreakdown(@Param("from") Instant from, @Param("to") Instant to);

    @Query("SELECT new shop.bluequirk.blue_quirk_backend.analytics.dto.LabelCount(s.city, COUNT(s)) "
            + "FROM AnalyticsSession s WHERE s.city IS NOT NULL AND s.startedAt >= :from AND s.startedAt < :to "
            + "GROUP BY s.city ORDER BY COUNT(s) DESC")
    List<LabelCount> cityBreakdown(@Param("from") Instant from, @Param("to") Instant to);

    /** Landing bounces per entry path — the numerator for page-level bounce rate. */
    @Query("SELECT new shop.bluequirk.blue_quirk_backend.analytics.dto.LabelCount(s.entryPath, COUNT(s)) "
            + "FROM AnalyticsSession s WHERE s.pageViewCount <= 1 AND s.entryPath IS NOT NULL "
            + "AND s.startedAt >= :from AND s.startedAt < :to GROUP BY s.entryPath")
    List<LabelCount> landingBouncesByPath(@Param("from") Instant from, @Param("to") Instant to);

    /** Sessions landing on each entry path — the denominator for page-level bounce rate. */
    @Query("SELECT new shop.bluequirk.blue_quirk_backend.analytics.dto.LabelCount(s.entryPath, COUNT(s)) "
            + "FROM AnalyticsSession s WHERE s.entryPath IS NOT NULL "
            + "AND s.startedAt >= :from AND s.startedAt < :to GROUP BY s.entryPath")
    List<LabelCount> landingsByPath(@Param("from") Instant from, @Param("to") Instant to);

    /** Sessions whose last page was each path — the numerator for exit rate. */
    @Query("SELECT new shop.bluequirk.blue_quirk_backend.analytics.dto.LabelCount(s.exitPath, COUNT(s)) "
            + "FROM AnalyticsSession s WHERE s.exitPath IS NOT NULL "
            + "AND s.startedAt >= :from AND s.startedAt < :to GROUP BY s.exitPath")
    List<LabelCount> exitsByPath(@Param("from") Instant from, @Param("to") Instant to);

    /** Per-day visits + unique visitors (UTC day). Row = [day, visits, uniques]. */
    @Query(nativeQuery = true, value =
            "SELECT DATE_FORMAT(started_at, '%Y-%m-%d') AS d, COUNT(*) AS visits, "
            + "COUNT(DISTINCT visitor_id) AS uniques FROM analytics_session "
            + "WHERE started_at >= :from AND started_at < :to GROUP BY d ORDER BY d")
    List<Object[]> dailyVisits(@Param("from") Instant from, @Param("to") Instant to);

    @Modifying
    @Query("DELETE FROM AnalyticsSession s WHERE s.endedAt IS NOT NULL AND s.startedAt < :cutoff")
    int deleteClosedBefore(@Param("cutoff") Instant cutoff);
}
