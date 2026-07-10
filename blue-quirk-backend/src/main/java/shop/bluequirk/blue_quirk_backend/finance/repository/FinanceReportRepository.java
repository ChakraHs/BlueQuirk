package shop.bluequirk.blue_quirk_backend.finance.repository;

import java.time.LocalDateTime;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import shop.bluequirk.blue_quirk_backend.entity.Order;

/**
 * Read-only financial aggregation over the {@code orders} / {@code order_items}
 * tables. Every figure is sourced from the immutable order snapshots (subtotal,
 * cost_total, line_cost, line_profit) so reports never depend on the live
 * catalog and historical numbers stay stable. Cancelled orders are always
 * excluded. Bound to {@link Order} only so Spring Data can host these native
 * queries — no writes are performed.
 */
public interface FinanceReportRepository extends JpaRepository<Order, Long> {

    /**
     * One aggregate row for the window. Columns:
     * [orders, revenue(subtotal), cost(cost_total), discount, shipping, collected(total)].
     */
    @Query(nativeQuery = true, value =
            "SELECT COUNT(*) AS orders, "
            + "COALESCE(SUM(subtotal), 0) AS revenue, "
            + "COALESCE(SUM(cost_total), 0) AS cost, "
            + "COALESCE(SUM(discount_amount), 0) AS discount, "
            + "COALESCE(SUM(shipping_fee), 0) AS shipping, "
            + "COALESCE(SUM(total), 0) AS collected "
            + "FROM orders "
            + "WHERE order_date >= :from AND order_date < :to AND status <> 'CANCELLED'")
    List<Object[]> summaryRow(@Param("from") LocalDateTime from, @Param("to") LocalDateTime to);

    /** Total units sold in the window (sum of order-item quantities). */
    @Query(nativeQuery = true, value =
            "SELECT COALESCE(SUM(oi.quantity), 0) FROM order_items oi "
            + "JOIN orders o ON oi.order_id = o.id "
            + "WHERE o.order_date >= :from AND o.order_date < :to AND o.status <> 'CANCELLED'")
    long sumUnits(@Param("from") LocalDateTime from, @Param("to") LocalDateTime to);

    /** Per-day series. Row = [day 'YYYY-MM-DD', orders, revenue, cost, profit]. */
    @Query(nativeQuery = true, value =
            "SELECT DATE_FORMAT(order_date, '%Y-%m-%d') AS period, COUNT(*) AS orders, "
            + "COALESCE(SUM(subtotal), 0) AS revenue, "
            + "COALESCE(SUM(cost_total), 0) AS cost, "
            + "COALESCE(SUM(subtotal - cost_total), 0) AS profit "
            + "FROM orders "
            + "WHERE order_date >= :from AND order_date < :to AND status <> 'CANCELLED' "
            + "GROUP BY period ORDER BY period")
    List<Object[]> dailyFinancials(@Param("from") LocalDateTime from, @Param("to") LocalDateTime to);

    /** Per-month series. Row = [month 'YYYY-MM', orders, revenue, cost, profit]. */
    @Query(nativeQuery = true, value =
            "SELECT DATE_FORMAT(order_date, '%Y-%m') AS period, COUNT(*) AS orders, "
            + "COALESCE(SUM(subtotal), 0) AS revenue, "
            + "COALESCE(SUM(cost_total), 0) AS cost, "
            + "COALESCE(SUM(subtotal - cost_total), 0) AS profit "
            + "FROM orders "
            + "WHERE order_date >= :from AND order_date < :to AND status <> 'CANCELLED' "
            + "GROUP BY period ORDER BY period")
    List<Object[]> monthlyFinancials(@Param("from") LocalDateTime from, @Param("to") LocalDateTime to);

    /**
     * Per-product performance from line snapshots. Row =
     * [productId, name, units, revenue(line_total), cost(line_cost), profit(line_profit)].
     * Ranked in the service layer (best selling / most profitable / lowest margin).
     */
    @Query(nativeQuery = true, value =
            "SELECT oi.product_id AS pid, MAX(oi.name) AS name, "
            + "COALESCE(SUM(oi.quantity), 0) AS units, "
            + "COALESCE(SUM(oi.line_total), 0) AS revenue, "
            + "COALESCE(SUM(oi.line_cost), 0) AS cost, "
            + "COALESCE(SUM(oi.line_profit), 0) AS profit "
            + "FROM order_items oi JOIN orders o ON oi.order_id = o.id "
            + "WHERE o.order_date >= :from AND o.order_date < :to AND o.status <> 'CANCELLED' "
            + "AND oi.product_id IS NOT NULL "
            + "GROUP BY oi.product_id")
    List<Object[]> productFinancials(@Param("from") LocalDateTime from, @Param("to") LocalDateTime to);
}
