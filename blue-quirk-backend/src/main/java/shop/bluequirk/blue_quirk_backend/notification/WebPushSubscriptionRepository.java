package shop.bluequirk.blue_quirk_backend.notification;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

@Repository
public interface WebPushSubscriptionRepository extends JpaRepository<WebPushSubscription, Long> {

    List<WebPushSubscription> findByRecipientUserId(Long recipientUserId);

    Optional<WebPushSubscription> findByEndpoint(String endpoint);

    // Derived delete needs its own transaction (used to prune stale/expired
    // subscriptions from the best-effort, non-transactional send path).
    @Transactional
    void deleteByEndpoint(String endpoint);
}
