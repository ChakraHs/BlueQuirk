package shop.bluequirk.blue_quirk_backend.progressive.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import shop.bluequirk.blue_quirk_backend.progressive.entity.ProgressiveDiscountSettings;

@Repository
public interface ProgressiveDiscountSettingsRepository
        extends JpaRepository<ProgressiveDiscountSettings, Long> {

    /**
     * Accrues one redemption's analytics onto the singleton row atomically (no
     * read-modify-write race under concurrent checkouts). Mirrors the bundle
     * module's {@code addRedemptionTotals}.
     */
    @Modifying
    @Query("update ProgressiveDiscountSettings s set s.usageCount = s.usageCount + 1, "
            + "s.totalDiscountGiven = s.totalDiscountGiven + :amount where s.id = :id")
    void addRedemptionTotals(@Param("id") long id, @Param("amount") double amount);
}
