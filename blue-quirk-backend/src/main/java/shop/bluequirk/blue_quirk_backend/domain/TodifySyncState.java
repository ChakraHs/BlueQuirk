package shop.bluequirk.blue_quirk_backend.domain;

/**
 * Synchronization state of a local order with Todify fulfillment.
 *
 * <p>The local order is always the source of truth and is never lost regardless
 * of this state — it only reflects whether Todify has accepted the order yet.
 */
public enum TodifySyncState {
    /** No line item is linked to a Todify template — nothing to sync. */
    NOT_APPLICABLE,
    /**
     * The admin chose to manage this order manually (fulfil it directly in Todify
     * or elsewhere). Excluded from the automatic send + retry job, but stays visible
     * in the Todify orders list and can be switched back to automatic at any time.
     */
    MANUAL,
    /** Has Todify-linked items; queued for the async send. */
    PENDING,
    /** Successfully accepted by Todify (todifyOrderId set). */
    SENT,
    /** Send failed; kept locally with an error, awaiting retry/manual action. */
    FAILED,
    /** A scheduled retry is in progress / has been attempted again. */
    RETRYING,
    /**
     * The order was cancelled locally and the cancellation request to Todify is
     * still pending — Todify errored, was unreachable, or has not confirmed yet.
     * Retryable (scheduler + manual admin retry). Deletion is blocked in this
     * state for orders that exist in Todify.
     */
    CANCELLATION_PENDING,
    /** Todify has confirmed the cancellation — terminal. Safe to delete. */
    CANCELLED
}
