package shop.bluequirk.blue_quirk_backend.promotion.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import shop.bluequirk.blue_quirk_backend.promotion.entity.PromotionUsage;

public interface PromotionUsageRepository extends JpaRepository<PromotionUsage, Long> {

    /** How many times this customer (by email) has already redeemed this promotion. */
    long countByPromotionIdAndCustomerEmailIgnoreCase(Long promotionId, String customerEmail);

    long countByPromotionId(Long promotionId);
}
