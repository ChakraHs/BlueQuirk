package shop.bluequirk.blue_quirk_backend.review.domain;

/**
 * How a review's public author name is derived from the customer's originally
 * submitted name. Chosen by the admin at moderation time. The original submitted
 * name is always preserved on the review row ({@code originalAuthorName}); this
 * mode only controls what is shown publicly ({@code authorName}).
 */
public enum DisplayNameMode {
    /** Show the full name exactly as submitted. */
    ORIGINAL,
    /** Show only the first name / first word (privacy-friendly default). */
    FIRST_NAME,
    /** First name + last-name initial, e.g. "Sara B." (partial anonymization). */
    ANONYMIZED,
    /** A custom display name typed by the admin. */
    CUSTOM
}
