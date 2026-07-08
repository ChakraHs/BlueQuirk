package shop.bluequirk.blue_quirk_backend.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import shop.bluequirk.blue_quirk_backend.domain.TodifySyncState;
import shop.bluequirk.blue_quirk_backend.entity.Order;

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
}