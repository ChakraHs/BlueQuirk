package shop.bluequirk.blue_quirk_backend.notification;

/**
 * The kind of admin notification. Kept as a small enum (persisted as a string)
 * so new event types (low stock, cancellations, …) can be added later without a
 * schema change to the value column.
 */
public enum AdminNotificationType {
    NEW_ORDER
}
