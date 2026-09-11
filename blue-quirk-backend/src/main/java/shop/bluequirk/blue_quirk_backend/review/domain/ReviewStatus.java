package shop.bluequirk.blue_quirk_backend.review.domain;

/**
 * Moderation lifecycle of a customer review. A review is <b>only ever shown to the
 * public</b> when it is {@link #APPROVED} <i>and</i> the storefront-wide
 * {@code reviewsEnabled} flag is on — both conditions are enforced in
 * {@code ReviewService}/{@code ReviewRepository}, never left to the client. This is
 * the core "never fake social proof" guarantee: nothing surfaces without an admin's
 * explicit approval.
 */
public enum ReviewStatus {
    PENDING,   // submitted, awaiting admin moderation — never public
    APPROVED,  // admin-approved — public only when reviewsEnabled == true
    REJECTED   // admin-rejected — never public
}
