package shop.bluequirk.blue_quirk_backend.promotion.engine;

import java.time.LocalDateTime;

/**
 * Immutable inputs the {@link PromotionEngine} needs to evaluate a coupon. The
 * engine is intentionally DB-free: the caller resolves prices and usage counts
 * (server-side, from the catalog and the promotion tables) and passes them in,
 * which keeps evaluation pure and trivially unit-testable.
 *
 * @param subtotal            server-computed goods subtotal (never client-supplied)
 * @param shipping            server-computed shipping fee
 * @param customerEmail       lower-cased email, or null for an anonymous quote
 * @param customerId          customer id when known, else null
 * @param firstOrder          whether this would be the customer's first order
 * @param customerUsageCount  how many times this customer already redeemed the coupon
 * @param now                 evaluation timestamp (injectable for tests)
 */
public record PromotionContext(
        double subtotal,
        double shipping,
        String customerEmail,
        Long customerId,
        boolean firstOrder,
        long customerUsageCount,
        LocalDateTime now
) {
    public static PromotionContext of(double subtotal, double shipping, String customerEmail,
                                      Long customerId, boolean firstOrder, long customerUsageCount) {
        return new PromotionContext(subtotal, shipping, customerEmail, customerId,
                firstOrder, customerUsageCount, LocalDateTime.now());
    }
}
