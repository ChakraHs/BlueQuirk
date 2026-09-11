package shop.bluequirk.blue_quirk_backend.notification;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

/**
 * Bridges order placement to the admin notification subsystem. Runs only AFTER
 * the order transaction commits (so a failed/rolled-back order never notifies)
 * and asynchronously (so checkout latency is unaffected). Any failure here is
 * swallowed — the customer's order is already durable and successful.
 */
@Component
public class NewOrderNotificationListener {

    private static final Logger LOG = LoggerFactory.getLogger(NewOrderNotificationListener.class);

    private final AdminNotificationService service;

    public NewOrderNotificationListener(AdminNotificationService service) {
        this.service = service;
    }

    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onNewOrder(NewOrderNotificationEvent event) {
        try {
            service.createForNewOrder(event);
        } catch (Exception e) {
            LOG.warn("Admin notification for order {} failed after commit: {}",
                    event.orderId(), e.getMessage());
        }
    }
}
