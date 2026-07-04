package shop.bluequirk.blue_quirk_backend.analytics.repository;

import java.time.LocalDateTime;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import shop.bluequirk.blue_quirk_backend.entity.Order;

/**
 * Read-only sales aggregation over the existing {@code orders} table. Revenue is
 * sourced here (authoritative), not from the client {@code purchase} event.
 * Cancelled orders are excluded. Bound to the {@link Order} entity purely so
 * Spring Data can host these native queries; no writes are performed.
 */
public interface AnalyticsOrderStatsRepository extends JpaRepository<Order, Long> {

    /** Orders + revenue per day (local day). Row = [day, orders, revenue]. */
    @Query(nativeQuery = true, value =
            "SELECT DATE_FORMAT(order_date, '%Y-%m-%d') AS d, COUNT(*) AS orders, "
            + "COALESCE(SUM(total), 0) AS revenue FROM orders "
            + "WHERE order_date >= :from AND order_date < :to AND status <> 'CANCELLED' "
            + "GROUP BY d ORDER BY d")
    List<Object[]> dailySales(@Param("from") LocalDateTime from, @Param("to") LocalDateTime to);

    @Query(nativeQuery = true, value =
            "SELECT COUNT(*) FROM orders WHERE order_date >= :from AND order_date < :to AND status <> 'CANCELLED'")
    long countOrders(@Param("from") LocalDateTime from, @Param("to") LocalDateTime to);

    @Query(nativeQuery = true, value =
            "SELECT COALESCE(SUM(total), 0) FROM orders WHERE order_date >= :from AND order_date < :to AND status <> 'CANCELLED'")
    double sumRevenue(@Param("from") LocalDateTime from, @Param("to") LocalDateTime to);

    /**
     * Authoritative per-product purchases (from order line items, cancelled orders
     * excluded). Row = [productId, orders, units]. Feeds the product funnel's
     * "purchases" column and conversion rate.
     */
    @Query(nativeQuery = true, value =
            "SELECT oi.product_id AS pid, COUNT(DISTINCT o.id) AS orders, COALESCE(SUM(oi.quantity), 0) AS units "
            + "FROM order_items oi JOIN orders o ON oi.order_id = o.id "
            + "WHERE o.order_date >= :from AND o.order_date < :to AND o.status <> 'CANCELLED' "
            + "AND oi.product_id IS NOT NULL GROUP BY oi.product_id")
    List<Object[]> productPurchases(@Param("from") LocalDateTime from, @Param("to") LocalDateTime to);
}
