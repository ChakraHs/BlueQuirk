package shop.bluequirk.blue_quirk_backend.identity.exception;

import org.springframework.http.HttpStatus;

/** Base type for Identity Domain errors, carrying the HTTP status to surface. */
public class IdentityException extends RuntimeException {

    private final HttpStatus status;

    public IdentityException(HttpStatus status, String message) {
        super(message);
        this.status = status;
    }

    public HttpStatus getStatus() {
        return status;
    }
}
