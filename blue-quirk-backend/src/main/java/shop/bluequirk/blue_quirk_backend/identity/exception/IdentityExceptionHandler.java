package shop.bluequirk.blue_quirk_backend.identity.exception;

import java.time.Instant;
import java.util.Map;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import shop.bluequirk.blue_quirk_backend.identity.auth.AuthController;
import shop.bluequirk.blue_quirk_backend.identity.account.AccountController;

/**
 * Translates Identity Domain exceptions into JSON responses. Scoped to the identity
 * controllers via {@code assignableTypes} so it never alters error handling for the
 * business endpoints.
 */
@RestControllerAdvice(assignableTypes = {AuthController.class, AccountController.class})
public class IdentityExceptionHandler {

    @ExceptionHandler(IdentityException.class)
    public ResponseEntity<Map<String, Object>> handleIdentity(IdentityException ex) {
        return ResponseEntity.status(ex.getStatus()).body(Map.of(
                "timestamp", Instant.now().toString(),
                "status", ex.getStatus().value(),
                "error", ex.getStatus().getReasonPhrase(),
                "message", ex.getMessage()));
    }
}
