package shop.bluequirk.blue_quirk_backend.integration.todify;

/**
 * Raised when a Todify API call returns a non-2xx response or cannot be reached.
 * Carries the HTTP status (0 for transport failures) and the raw response body so
 * callers can log and persist the error for retry/diagnostics.
 */
public class TodifyApiException extends RuntimeException {

    private final int status;
    private final String body;

    public TodifyApiException(int status, String body, String message) {
        super(message);
        this.status = status;
        this.body = body;
    }

    public TodifyApiException(String message, Throwable cause) {
        super(message, cause);
        this.status = 0;
        this.body = null;
    }

    public int getStatus() { return status; }
    public String getBody() { return body; }

    /** Rate-limited — caller should back off and retry later. */
    public boolean isRateLimited() { return status == 429; }
}
