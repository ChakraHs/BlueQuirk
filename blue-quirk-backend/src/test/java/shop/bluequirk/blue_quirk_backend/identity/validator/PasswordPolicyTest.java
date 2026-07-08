package shop.bluequirk.blue_quirk_backend.identity.validator;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import org.junit.jupiter.api.Test;

import shop.bluequirk.blue_quirk_backend.identity.exception.IdentityException;

class PasswordPolicyTest {

    private final PasswordPolicy policy = new PasswordPolicy();

    @Test
    void acceptsStrongPassword() {
        assertThatCode(() -> policy.validate("Password1")).doesNotThrowAnyException();
    }

    @Test
    void rejectsTooShort() {
        assertThatThrownBy(() -> policy.validate("Pw1")).isInstanceOf(IdentityException.class);
    }

    @Test
    void rejectsNoDigit() {
        assertThatThrownBy(() -> policy.validate("PasswordOnly")).isInstanceOf(IdentityException.class);
    }

    @Test
    void rejectsNoLetter() {
        assertThatThrownBy(() -> policy.validate("12345678")).isInstanceOf(IdentityException.class);
    }

    @Test
    void rejectsNull() {
        assertThatThrownBy(() -> policy.validate(null)).isInstanceOf(IdentityException.class);
    }
}
