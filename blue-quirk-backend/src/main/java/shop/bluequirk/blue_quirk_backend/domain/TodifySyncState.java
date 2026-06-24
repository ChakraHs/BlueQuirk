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
    /** Has Todify-linked items; queued for the async send. */
    PENDING,
    /** Successfully accepted by Todify (todifyOrderId set). */
    SENT,
    /** Send failed; kept locally with an error, awaiting retry/manual action. */
    FAILED,
    /** A scheduled retry is in progress / has been attempted again. */
    RETRYING
}
