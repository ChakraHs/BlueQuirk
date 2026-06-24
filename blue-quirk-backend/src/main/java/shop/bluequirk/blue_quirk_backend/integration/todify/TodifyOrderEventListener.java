package shop.bluequirk.blue_quirk_backend.integration.todify;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

/**
 * Bridges order placement to Todify sync. Runs only AFTER the order transaction
 * commits (so the row is visible) and asynchronously (so checkout latency is
 * unaffected). A failure here never affects the customer's order — it is logged
 * and the scheduled retry job will pick the order up.
 */
@Component
public class TodifyOrderEventListener {

    private static final Logger LOG = LoggerFactory.getLogger(TodifyOrderEventListener.class);

    private final TodifyService todifyService;

    public TodifyOrderEventListener(TodifyService todifyService) {
        this.todifyService = todifyService;
    }

    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onOrderPlaced(OrderPlacedEvent event) {
        try {
            todifyService.syncOrder(event.orderId());
        } catch (Exception e) {
            // syncOrder already persists failures; this is a last-resort guard.
            LOG.warn("Todify sync after commit failed for order {}: {}", event.orderId(), e.getMessage());
        }
    }
}
