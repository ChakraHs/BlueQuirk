package shop.bluequirk.blue_quirk_backend.repository;

import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import shop.bluequirk.blue_quirk_backend.domain.OrderStatus;
import shop.bluequirk.blue_quirk_backend.domain.TodifySyncState;
import shop.bluequirk.blue_quirk_backend.entity.Order;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

@Repository
public interface OrderRepository extends JpaRepository<Order, Long> {
    List<Order> findByUserId(Long userId);

    List<Order> findByCustomerIdOrderByOrderDateDesc(Long customerId);

    /** How many orders this customer already has — used to detect a first order. */
    long countByCustomerId(Long customerId);

    Optional<Order> findByOrderNumberIgnoreCase(String orderNumber);

    // --- Todify ---
    Optional<Order> findByTodifyOrderId(String todifyOrderId);

    // Orders whose sync failed and are still under the retry ceiling.
    List<Order> findByTodifySyncStateInAndTodifySyncAttemptsLessThan(
            Collection<TodifySyncState> states, int maxAttempts);

    // Successfully-sent orders whose Todify status is not yet terminal — for the
    // fallback status poll.
    List<Order> findByTodifySyncStateAndTodifyStatusNotIn(
            TodifySyncState state, Collection<String> terminalStatuses);

    // --- Reviews ---
    /**
     * Orders delivered on/before {@code cutoff} that have not yet had a post-delivery
     * review request. Drives {@code ReviewRequestScheduler}. Bounded to a small batch
     * so a backlog can never overwhelm one tick.
     */
    @Query("""
           select o from Order o
           where o.status = :status
             and o.deliveredAt is not null
             and o.deliveredAt <= :cutoff
             and o.reviewRequestSentAt is null
           order by o.deliveredAt asc
           """)
    List<Order> findDueForReviewRequest(@Param("status") OrderStatus status,
                                        @Param("cutoff") LocalDateTime cutoff,
                                        Pageable pageable);

    // --- Dashboard: orders-over-time -------------------------------------------
    /** Lightweight (orderDate, status) projection for one order used by the chart. */
    interface OrderDateStatus {
        LocalDateTime getOrderDate();
        OrderStatus getStatus();
    }

    /**
     * Minimal (date + status) rows for orders placed in the half-open window
     * {@code [from, to)}. Used by the orders-over-time chart, which buckets and
     * zero-fills in the service (DB-agnostic — no MariaDB-specific date functions).
     */
    @Query("select o.orderDate as orderDate, o.status as status from Order o " +
           "where o.orderDate >= :from and o.orderDate < :to")
    List<OrderDateStatus> findDateStatusBetween(@Param("from") LocalDateTime from,
                                                @Param("to") LocalDateTime to);
}