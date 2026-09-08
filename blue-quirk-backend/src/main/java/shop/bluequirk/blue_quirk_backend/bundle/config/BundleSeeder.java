package shop.bluequirk.blue_quirk_backend.bundle.config;

import java.util.Set;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import shop.bluequirk.blue_quirk_backend.bundle.domain.BundleEligibility;
import shop.bluequirk.blue_quirk_backend.bundle.domain.BundlePricingMethod;
import shop.bluequirk.blue_quirk_backend.bundle.entity.BundleOffer;
import shop.bluequirk.blue_quirk_backend.bundle.repository.BundleOfferRepository;
import shop.bluequirk.blue_quirk_backend.entity.Category;
import shop.bluequirk.blue_quirk_backend.repository.CategoryRepository;

/**
 * Seeds the initial "Build Your Bloom Set" bundle offer ONCE, only when no bundle
 * offers exist yet. These are just <b>default values</b> the admin can freely edit
 * afterwards (via /admin-v2/marketing/bundles) — nothing about the offer is
 * hard-coded into the pricing logic.
 *
 * <p>The offer targets the "Bloom" collection (category). If that category exists
 * the offer is seeded enabled and scoped to it; if it does not exist yet, the
 * offer is seeded <b>disabled</b> with no scope so it never mis-applies — an admin
 * picks the collection and turns it on. Never overwrites once created, so admin
 * edits and enable/disable survive restarts.
 */
@Component
@Order(60)
public class BundleSeeder implements ApplicationRunner {

    private static final Logger LOG = LoggerFactory.getLogger(BundleSeeder.class);

    private final BundleOfferRepository offerRepository;
    private final CategoryRepository categoryRepository;

    public BundleSeeder(BundleOfferRepository offerRepository, CategoryRepository categoryRepository) {
        this.offerRepository = offerRepository;
        this.categoryRepository = categoryRepository;
    }

    @Override
    public void run(ApplicationArguments args) {
        if (offerRepository.count() > 0) {
            return; // already seeded / admin-managed — never touch it again
        }

        Long bloomCategoryId = categoryRepository.findAll().stream()
                .filter(c -> c.getName() != null && c.getName().toLowerCase().contains("bloom"))
                .map(Category::getId)
                .findFirst()
                .orElse(null);

        BundleOffer offer = new BundleOffer();
        offer.setName("Build Your Bloom Set");
        offer.setDescription("Mix & match any 2 Bloom designs for a set price.");
        offer.setMinQuantity(2);
        offer.setPricingMethod(BundlePricingMethod.FIXED_BUNDLE_PRICE);
        offer.setBundleValue(349);
        offer.setEligibility(BundleEligibility.CATEGORY);
        offer.setAllowMixing(true);
        offer.setAllowSameProduct(true);
        offer.setDisplayOnProduct(true);
        offer.setDisplayInCart(true);

        if (bloomCategoryId != null) {
            offer.setEligibleCategoryIds(Set.of(bloomCategoryId));
            offer.setActive(true);
            LOG.info("Seeded default 'Build Your Bloom Set' bundle (ON) scoped to Bloom category id {}", bloomCategoryId);
        } else {
            offer.setActive(false); // no scope yet → keep off so it never mis-applies
            LOG.info("Seeded default 'Build Your Bloom Set' bundle (OFF) — no 'Bloom' category found; "
                    + "pick a collection and enable it in Admin → Marketing → Bundles.");
        }
        offer.setCreatedByEmail("system");
        offer.setUpdatedByEmail("system");
        offerRepository.save(offer);
    }
}
