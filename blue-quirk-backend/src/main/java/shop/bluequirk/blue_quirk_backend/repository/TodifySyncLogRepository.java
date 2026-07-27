package shop.bluequirk.blue_quirk_backend.repository;

import java.util.List;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import shop.bluequirk.blue_quirk_backend.entity.TodifySyncLog;

@Repository
public interface TodifySyncLogRepository extends JpaRepository<TodifySyncLog, Long> {

    Page<TodifySyncLog> findAllByOrderByCreatedAtDesc(Pageable pageable);

    Page<TodifySyncLog> findByTypeOrderByCreatedAtDesc(TodifySyncLog.Type type, Pageable pageable);

    // Idempotency: has this webhook delivery already been processed?
    boolean existsByDeliveryId(String deliveryId);

    /** All sync logs for one order, newest first (the "View Synchronization Logs" action). */
    List<TodifySyncLog> findByOrderIdOrderByCreatedAtDesc(Long orderId);

    /** Remove an order's sync logs as part of its safe/permanent deletion. */
    @Transactional
    void deleteByOrderId(Long orderId);
}
