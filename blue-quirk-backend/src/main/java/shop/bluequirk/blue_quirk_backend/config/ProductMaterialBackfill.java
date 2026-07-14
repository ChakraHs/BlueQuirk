package shop.bluequirk.blue_quirk_backend.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import shop.bluequirk.blue_quirk_backend.repository.ProductRepository;

/**
 * Backfills the default materials value ("100% Cotton") on every pre-existing
 * product that has none. The {@code material} column is added by Hibernate's
 * schema update, so old rows come up NULL; this runs once on startup to give
 * them a sensible default. Products that already have a value are untouched, so
 * this is safe to leave enabled across restarts (it simply matches nothing).
 */
@Component
@Order(60)
public class ProductMaterialBackfill implements ApplicationRunner {

    private static final Logger LOG = LoggerFactory.getLogger(ProductMaterialBackfill.class);
    private static final String DEFAULT_MATERIAL = "100% Cotton";

    private final ProductRepository productRepository;

    public ProductMaterialBackfill(ProductRepository productRepository) {
        this.productRepository = productRepository;
    }

    @Override
    public void run(ApplicationArguments args) {
        int updated = productRepository.backfillMissingMaterial(DEFAULT_MATERIAL);
        if (updated > 0) {
            LOG.info("Backfilled default material '{}' on {} product(s).", DEFAULT_MATERIAL, updated);
        }
    }
}
