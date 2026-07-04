package shop.bluequirk.blue_quirk_backend.analytics.repository;

import java.time.Instant;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import shop.bluequirk.blue_quirk_backend.analytics.dto.PageStatRow;
import shop.bluequirk.blue_quirk_backend.analytics.dto.ProductViewRow;
import shop.bluequirk.blue_quirk_backend.analytics.entity.AnalyticsPageView;

public interface AnalyticsPageViewRepository extends JpaRepository<AnalyticsPageView, Long> {

    long countByCreatedAtBetween(Instant from, Instant to);

    /** Per-path metrics ordered by popularity (also feeds "top pages"). */
    @Query("SELECT new shop.bluequirk.blue_quirk_backend.analytics.dto.PageStatRow("
            + "pv.path, pv.pageType, COUNT(pv), COUNT(DISTINCT pv.visitorId), AVG(pv.durationMs), "
            + "SUM(CASE WHEN pv.exit = true THEN 1L ELSE 0L END)) "
            + "FROM AnalyticsPageView pv WHERE pv.createdAt >= :from AND pv.createdAt < :to "
            + "GROUP BY pv.path, pv.pageType ORDER BY COUNT(pv) DESC")
    List<PageStatRow> pageStats(@Param("from") Instant from, @Param("to") Instant to);

    /** Per-product view counts from product page views. */
    @Query("SELECT new shop.bluequirk.blue_quirk_backend.analytics.dto.ProductViewRow("
            + "pv.productId, COUNT(pv), COUNT(DISTINCT pv.visitorId)) "
            + "FROM AnalyticsPageView pv WHERE pv.productId IS NOT NULL "
            + "AND pv.createdAt >= :from AND pv.createdAt < :to GROUP BY pv.productId")
    List<ProductViewRow> productViews(@Param("from") Instant from, @Param("to") Instant to);

    /** Page views per day (UTC). Row = [day, count]. */
    @Query(nativeQuery = true, value =
            "SELECT DATE_FORMAT(created_at, '%Y-%m-%d') AS d, COUNT(*) AS c "
            + "FROM analytics_page_view WHERE created_at >= :from AND created_at < :to GROUP BY d ORDER BY d")
    List<Object[]> dailyPageViews(@Param("from") Instant from, @Param("to") Instant to);

    /**
     * Ordered (session, pageType) stream for the user-journey builder. Only the
     * columns needed to reconstruct paths, to keep it cheap.
     */
    @Query(nativeQuery = true, value =
            "SELECT session_id, page_type FROM analytics_page_view "
            + "WHERE created_at >= :from AND created_at < :to ORDER BY session_id, created_at, id")
    List<Object[]> journeySteps(@Param("from") Instant from, @Param("to") Instant to);

    @Modifying
    @Query("DELETE FROM AnalyticsPageView pv WHERE pv.createdAt < :cutoff")
    int deleteOlderThan(@Param("cutoff") Instant cutoff);
}
