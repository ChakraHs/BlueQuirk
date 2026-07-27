package shop.bluequirk.blue_quirk_backend.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import shop.bluequirk.blue_quirk_backend.entity.OrderAuditLog;

@Repository
public interface OrderAuditLogRepository extends JpaRepository<OrderAuditLog, Long> {

    /** Full audit history for one order, newest first. */
    List<OrderAuditLog> findByOrderIdOrderByCreatedAtDesc(Long orderId);
}
