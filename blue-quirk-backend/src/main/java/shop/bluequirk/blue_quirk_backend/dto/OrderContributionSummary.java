package shop.bluequirk.blue_quirk_backend.dto;

/**
 * Compact per-order profitability row for the admin order LIST. Admin-only — it
 * carries confidential cost figures, so it is served from a dedicated admin
 * endpoint and is NEVER part of {@link OrderResponse} (which public order tracking
 * and a customer's own history return).
 *
 * <p><b>Net contribution</b> follows the finance spec exactly:
 * {@code productRevenue + shippingCharged − discount − productCost − deliveryCost
 * − packagingCost}, which is algebraically the order {@code total − costTotal −
 * realShippingCost − packagingCost} (computed via {@code FinancialCalculationService}).
 * Every figure is a frozen order-time snapshot, so historical rows never change when
 * catalog prices or settings change later.
 *
 * <p>{@code realized} is true only when the order is <b>Delivered</b> (cash is in).
 * A {@code cancelled} order is never realized profit — the UI shows its contribution
 * as void and totals must exclude it from realized sums.
 */
public record OrderContributionSummary(
        Long orderId,
        String status,
        double productRevenue,   // goods subtotal (pre-discount)
        double shippingCharged,  // customer-facing shipping fee
        double discount,         // total discount (bundle + progressive + coupon)
        double productCost,      // Σ(cost × qty), frozen
        double deliveryCost,     // internal real shipping cost, frozen
        double packagingCost,    // flat per-order packaging + confirmation cost, frozen
        double netContribution,  // total − productCost − deliveryCost − packagingCost
        boolean realized,        // status == DELIVERED
        boolean cancelled        // status == CANCELLED (never realized profit)
) {}
