package shop.bluequirk.blue_quirk_backend.integration.todify;

import java.util.List;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import shop.bluequirk.blue_quirk_backend.domain.TodifySyncState;
import shop.bluequirk.blue_quirk_backend.entity.Order;
import shop.bluequirk.blue_quirk_backend.repository.OrderRepository;

/**
 * Background reliability jobs for the Todify integration:
 * <ul>
 *   <li><b>Retry</b> — resends orders stuck in PENDING/FAILED/RETRYING under the
 *       attempt ceiling, so a transient Todify outage never loses an order.</li>
 *   <li><b>Fallback poll</b> — refreshes the status of already-sent, non-terminal
 *       orders, recovering from any missed {@code order.status_changed} webhook.</li>
 * </ul>
 * Both no-op when Todify is unconfigured. Spacing/limits keep us well under the
 * 60 req/min rate limit.
 */
@Component
public class TodifyScheduler {

    private static final Logger LOG = LoggerFactory.getLogger(TodifyScheduler.class);
    private static final int BATCH = 20;

    private final OrderRepository orderRepository;
    private final TodifyService todifyService;

    public TodifyScheduler(OrderRepository orderRepository, TodifyService todifyService) {
        this.orderRepository = orderRepository;
        this.todifyService = todifyService;
    }

    /** Resend failed/pending orders. Every 2 minutes by default. */
    @Scheduled(fixedDelayString = "${todify.retry.interval-ms:120000}", initialDelay = 30000)
    public void retryFailedOrders() {
        if (!todifyService.isConfigured()) return;
        List<Order> due = orderRepository.findByTodifySyncStateInAndTodifySyncAttemptsLessThan(
                List.of(TodifySyncState.PENDING, TodifySyncState.FAILED, TodifySyncState.RETRYING),
                todifyService.getMaxAttempts());
        if (due.isEmpty()) return;

        int count = 0;
        for (Order order : due) {
            if (count++ >= BATCH) break;
            try {
                todifyService.syncOrder(order.getId());
            } catch (Exception e) {
                LOG.warn("Retry sync failed for order {}: {}", order.getId(), e.getMessage());
            }
        }
        LOG.info("Todify retry job processed {} order(s)", Math.min(count, BATCH));
    }

    /** Reconcile status of sent, non-terminal orders. Every 15 minutes by default. */
    @Scheduled(fixedDelayString = "${todify.poll.interval-ms:900000}", initialDelay = 60000)
    public void pollOrderStatuses() {
        if (!todifyService.isConfigured()) return;
        List<Order> sent = orderRepository.findByTodifySyncStateAndTodifyStatusNotIn(
                TodifySyncState.SENT, TodifyStatusMapper.TERMINAL);
        if (sent.isEmpty()) return;

        int count = 0;
        for (Order order : sent) {
            if (count++ >= BATCH) break;
            try {
                todifyService.refreshOrderStatus(order.getId());
            } catch (Exception e) {
                LOG.warn("Status poll failed for order {}: {}", order.getId(), e.getMessage());
            }
        }
        LOG.info("Todify poll job refreshed {} order(s)", Math.min(count, BATCH));
    }
}
