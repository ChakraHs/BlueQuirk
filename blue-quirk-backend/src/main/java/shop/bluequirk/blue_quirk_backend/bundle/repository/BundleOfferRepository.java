package shop.bluequirk.blue_quirk_backend.bundle.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import shop.bluequirk.blue_quirk_backend.bundle.entity.BundleOffer;

public interface BundleOfferRepository extends JpaRepository<BundleOffer, Long> {

    /** All enabled offers, highest priority first (tie-break by newest). */
    List<BundleOffer> findByActiveTrueOrderByPriorityDescIdDesc();

    long countByActiveTrue();

    /**
     * Accrues the denormalized analytics aggregates for one redemption. A single
     * atomic UPDATE, run inside the order transaction so it rolls back with the
     * order if anything downstream fails.
     */
    @Modifying
    @Query("update BundleOffer b set b.usageCount = b.usageCount + 1, "
            + "b.totalDiscountGiven = b.totalDiscountGiven + :discount where b.id = :id")
    int addRedemptionTotals(@Param("id") Long id, @Param("discount") double discount);
}
