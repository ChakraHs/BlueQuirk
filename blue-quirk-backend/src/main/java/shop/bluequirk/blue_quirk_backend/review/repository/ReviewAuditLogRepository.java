package shop.bluequirk.blue_quirk_backend.review.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import shop.bluequirk.blue_quirk_backend.review.entity.ReviewAuditLog;

public interface ReviewAuditLogRepository extends JpaRepository<ReviewAuditLog, Long> {

    List<ReviewAuditLog> findByReviewIdOrderByCreatedAtDesc(Long reviewId);
}
