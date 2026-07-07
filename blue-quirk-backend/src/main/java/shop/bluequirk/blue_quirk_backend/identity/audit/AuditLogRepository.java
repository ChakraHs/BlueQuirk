package shop.bluequirk.blue_quirk_backend.identity.audit;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface AuditLogRepository extends JpaRepository<AuditLog, Long> {
    List<AuditLog> findTop50ByUserIdOrderByCreatedAtDesc(Long userId);
}
