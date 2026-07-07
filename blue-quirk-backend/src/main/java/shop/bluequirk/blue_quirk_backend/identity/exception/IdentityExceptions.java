package shop.bluequirk.blue_quirk_backend.identity.exception;

import org.springframework.http.HttpStatus;

/** Concrete Identity Domain errors grouped together for readability. */
public final class IdentityExceptions {

    private IdentityExceptions() {}

    public static class EmailAlreadyExists extends IdentityException {
        public EmailAlreadyExists() {
            super(HttpStatus.CONFLICT, "An account with this email already exists.");
        }
    }

    public static class InvalidCredentials extends IdentityException {
        public InvalidCredentials() {
            super(HttpStatus.UNAUTHORIZED, "Invalid email or password.");
        }
    }

    public static class AccountLocked extends IdentityException {
        public AccountLocked() {
            super(HttpStatus.LOCKED, "Account temporarily locked due to too many failed attempts. Try again later.");
        }
    }

    public static class AccountDisabled extends IdentityException {
        public AccountDisabled() {
            super(HttpStatus.FORBIDDEN, "This account is disabled.");
        }
    }

    public static class InvalidToken extends IdentityException {
        public InvalidToken(String what) {
            super(HttpStatus.BAD_REQUEST, "The " + what + " is invalid or has expired.");
        }
    }

    public static class RateLimited extends IdentityException {
        public RateLimited() {
            super(HttpStatus.TOO_MANY_REQUESTS, "Too many requests. Please slow down and try again shortly.");
        }
    }

    public static class NotFound extends IdentityException {
        public NotFound(String what) {
            super(HttpStatus.NOT_FOUND, what + " not found.");
        }
    }
}
