package shop.bluequirk.blue_quirk_backend.repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import shop.bluequirk.blue_quirk_backend.entity.TodifySyncLog;

@Repository
public interface TodifySyncLogRepository extends JpaRepository<TodifySyncLog, Long> {

    Page<TodifySyncLog> findAllByOrderByCreatedAtDesc(Pageable pageable);

    Page<TodifySyncLog> findByTypeOrderByCreatedAtDesc(TodifySyncLog.Type type, Pageable pageable);

    // Idempotency: has this webhook delivery already been processed?
    boolean existsByDeliveryId(String deliveryId);
}
