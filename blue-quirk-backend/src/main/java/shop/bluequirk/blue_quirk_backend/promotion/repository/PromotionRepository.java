package shop.bluequirk.blue_quirk_backend.promotion.repository;

import java.time.Instant;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import shop.bluequirk.blue_quirk_backend.promotion.entity.Promotion;

public interface PromotionRepository extends JpaRepository<Promotion, Long> {

    Optional<Promotion> findByCodeIgnoreCase(String code);

    boolean existsByCodeIgnoreCase(String code);

    /**
     * Atomically claims one global usage slot. The conditional {@code WHERE} makes
     * this the concurrency guard for the global limit: two checkouts racing on the
     * last slot both run this single UPDATE, but only one satisfies
     * {@code usageCount < maxGlobalUsage} and gets a row-count of 1 — the other
     * gets 0 and is rejected. Unlimited promotions (null limit) always succeed.
     *
     * @return 1 if a slot was claimed, 0 if the global limit is already reached.
     */
    @Modifying
    @Query("UPDATE Promotion p SET p.usageCount = p.usageCount + 1, p.lastUsedAt = :now " +
           "WHERE p.id = :id AND (p.maxGlobalUsage IS NULL OR p.usageCount < p.maxGlobalUsage)")
    int tryClaimUsageSlot(@Param("id") Long id, @Param("now") Instant now);

    /** Releases a previously claimed slot (compensating action if the order fails after claiming). */
    @Modifying
    @Query("UPDATE Promotion p SET p.usageCount = p.usageCount - 1 " +
           "WHERE p.id = :id AND p.usageCount > 0")
    void releaseUsageSlot(@Param("id") Long id);

    /** Accrues the analytics totals for one confirmed redemption. */
    @Modifying
    @Query("UPDATE Promotion p SET p.totalDiscountGiven = p.totalDiscountGiven + :discount, " +
           "p.totalRevenueGenerated = p.totalRevenueGenerated + :revenue WHERE p.id = :id")
    void addRedemptionTotals(@Param("id") Long id,
                             @Param("discount") double discount,
                             @Param("revenue") double revenue);
}
