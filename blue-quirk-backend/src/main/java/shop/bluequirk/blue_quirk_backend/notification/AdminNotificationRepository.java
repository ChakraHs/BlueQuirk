package shop.bluequirk.blue_quirk_backend.notification;

import java.util.List;

import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;

@Repository
public interface AdminNotificationRepository extends JpaRepository<AdminNotification, Long> {

    /** Most recent notifications for one admin (newest first), capped by the page size. */
    List<AdminNotification> findByRecipientUserIdOrderByCreatedAtDesc(Long recipientUserId, Pageable pageable);

    /** Unread count for the bell badge. */
    long countByRecipientUserIdAndReadAtIsNull(Long recipientUserId);

    /** Idempotency guard — has this admin already been notified about this order? */
    boolean existsByRecipientUserIdAndOrderIdAndType(Long recipientUserId, Long orderId, AdminNotificationType type);

    /** Marks a single notification read, but only if it belongs to the caller. */
    @Modifying
    @Query("update AdminNotification n set n.readAt = :now "
            + "where n.id = :id and n.recipientUserId = :userId and n.readAt is null")
    int markRead(@Param("id") Long id, @Param("userId") Long userId, @Param("now") Instant now);

    /** Marks every unread notification for one admin as read. */
    @Modifying
    @Query("update AdminNotification n set n.readAt = :now "
            + "where n.recipientUserId = :userId and n.readAt is null")
    int markAllRead(@Param("userId") Long userId, @Param("now") Instant now);
}
