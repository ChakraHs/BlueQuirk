package shop.bluequirk.blue_quirk_backend.analytics.repository;

import java.time.Instant;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import shop.bluequirk.blue_quirk_backend.analytics.domain.EventType;
import shop.bluequirk.blue_quirk_backend.analytics.dto.ProductEventRow;
import shop.bluequirk.blue_quirk_backend.analytics.entity.AnalyticsEvent;

public interface AnalyticsEventRepository extends JpaRepository<AnalyticsEvent, Long> {

    long countByTypeAndCreatedAtBetween(EventType type, Instant from, Instant to);

    /** Distinct sessions that fired an event of the given type (funnel width). */
    @Query("SELECT COUNT(DISTINCT e.sessionId) FROM AnalyticsEvent e "
            + "WHERE e.type = :type AND e.createdAt >= :from AND e.createdAt < :to")
    long countSessionsWithType(@Param("type") EventType type,
                               @Param("from") Instant from, @Param("to") Instant to);

    /** Per-product event counts (add-to-cart / begin-checkout / purchase / wishlist). */
    @Query("SELECT new shop.bluequirk.blue_quirk_backend.analytics.dto.ProductEventRow("
            + "e.productId, e.type, COUNT(e)) FROM AnalyticsEvent e "
            + "WHERE e.productId IS NOT NULL AND e.createdAt >= :from AND e.createdAt < :to "
            + "GROUP BY e.productId, e.type")
    List<ProductEventRow> productEventCounts(@Param("from") Instant from, @Param("to") Instant to);

    @Modifying
    @Query("DELETE FROM AnalyticsEvent e WHERE e.createdAt < :cutoff")
    int deleteOlderThan(@Param("cutoff") Instant cutoff);
}
