package shop.bluequirk.blue_quirk_backend.identity.security;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Duration;

import org.junit.jupiter.api.Test;

class RateLimiterTest {

    @Test
    void allowsUpToLimitThenBlocks() {
        RateLimiter limiter = new RateLimiter();
        Duration window = Duration.ofMinutes(1);

        assertThat(limiter.tryAcquire("k", 3, window)).isTrue();
        assertThat(limiter.tryAcquire("k", 3, window)).isTrue();
        assertThat(limiter.tryAcquire("k", 3, window)).isTrue();
        assertThat(limiter.tryAcquire("k", 3, window)).isFalse();
    }

    @Test
    void keysAreIndependent() {
        RateLimiter limiter = new RateLimiter();
        Duration window = Duration.ofMinutes(1);

        assertThat(limiter.tryAcquire("a", 1, window)).isTrue();
        assertThat(limiter.tryAcquire("a", 1, window)).isFalse();
        assertThat(limiter.tryAcquire("b", 1, window)).isTrue();
    }

    @Test
    void windowResetsAfterExpiry() throws InterruptedException {
        RateLimiter limiter = new RateLimiter();
        Duration window = Duration.ofMillis(50);

        assertThat(limiter.tryAcquire("w", 1, window)).isTrue();
        assertThat(limiter.tryAcquire("w", 1, window)).isFalse();
        Thread.sleep(70);
        assertThat(limiter.tryAcquire("w", 1, window)).isTrue();
    }
}
