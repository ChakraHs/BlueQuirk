package shop.bluequirk.blue_quirk_backend.review.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import shop.bluequirk.blue_quirk_backend.review.entity.ReviewRequestToken;

@Repository
public interface ReviewRequestTokenRepository extends JpaRepository<ReviewRequestToken, Long> {

    /** Look up a token by its secret (redeemability — expiry/used — checked in the service). */
    Optional<ReviewRequestToken> findByToken(String token);

    /** Guards against issuing a second token for an order the scheduler already processed. */
    boolean existsByOrderId(Long orderId);

    /** The (idempotent) token minted for an order, if any. */
    Optional<ReviewRequestToken> findFirstByOrderId(Long orderId);
}
