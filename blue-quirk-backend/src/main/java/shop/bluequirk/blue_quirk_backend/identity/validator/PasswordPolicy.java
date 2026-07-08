package shop.bluequirk.blue_quirk_backend.identity.validator;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;

import shop.bluequirk.blue_quirk_backend.identity.exception.IdentityException;

/**
 * Server-side password strength enforcement. Complements the DTO {@code @Size}
 * bound with content rules so weak passwords are rejected regardless of client.
 */
@Component
public class PasswordPolicy {

    private static final int MIN_LENGTH = 8;

    public void validate(String password) {
        if (password == null || password.length() < MIN_LENGTH) {
            reject("Password must be at least " + MIN_LENGTH + " characters long.");
        }
        boolean hasLetter = password.chars().anyMatch(Character::isLetter);
        boolean hasDigit = password.chars().anyMatch(Character::isDigit);
        if (!hasLetter || !hasDigit) {
            reject("Password must contain at least one letter and one number.");
        }
    }

    private void reject(String message) {
        throw new IdentityException(HttpStatus.BAD_REQUEST, message);
    }
}
