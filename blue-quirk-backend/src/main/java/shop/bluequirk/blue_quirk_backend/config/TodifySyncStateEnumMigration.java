package shop.bluequirk.blue_quirk_backend.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

/**
 * Ensures the {@code orders.todify_sync_state} column can store every
 * {@link shop.bluequirk.blue_quirk_backend.domain.TodifySyncState} value.
 *
 * <p>The column was created as a MariaDB {@code ENUM(...)} whose value list is
 * fixed at creation. Hibernate's {@code ddl-auto=update} never widens an enum's
 * value list, so adding a new Java enum constant (e.g. {@code MANUAL}) would
 * otherwise fail at runtime with a data-truncation error the moment an order is
 * switched to that state. This runner detects a missing value and widens the
 * column in place. Fully idempotent: a no-op once the column already contains
 * every value, and a no-op on a fresh DB where the column is a plain VARCHAR.
 */
@Component
@Order(30)
public class TodifySyncStateEnumMigration implements ApplicationRunner {

    private static final Logger LOG = LoggerFactory.getLogger(TodifySyncStateEnumMigration.class);

    /** The full value set the application expects — keep in sync with the enum. */
    private static final String DESIRED_ENUM =
            "ENUM('NOT_APPLICABLE','MANUAL','PENDING','SENT','FAILED','RETRYING',"
            + "'CANCELLATION_PENDING','CANCELLED')";

    private final JdbcTemplate jdbc;

    public TodifySyncStateEnumMigration(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @Override
    public void run(ApplicationArguments args) {
        String columnType = currentColumnType();
        if (columnType == null) {
            return; // column not present yet (very first boot) — Hibernate will create it
        }
        // Only ENUM columns have a fixed value list to widen. A VARCHAR already
        // accepts any name, so there is nothing to do.
        if (!columnType.toLowerCase().startsWith("enum(")) {
            return;
        }
        if (columnType.toUpperCase().contains("'MANUAL'")) {
            return; // already widened
        }
        try {
            jdbc.execute("ALTER TABLE orders MODIFY COLUMN todify_sync_state " + DESIRED_ENUM + " NULL");
            LOG.info("Widened orders.todify_sync_state enum to include MANUAL (was: {})", columnType);
        } catch (Exception e) {
            LOG.warn("Could not widen orders.todify_sync_state enum: {}", e.getMessage());
        }
    }

    private String currentColumnType() {
        try {
            return jdbc.queryForObject(
                    "SELECT column_type FROM information_schema.columns "
                            + "WHERE table_schema = DATABASE() AND table_name = 'orders' "
                            + "AND column_name = 'todify_sync_state'",
                    String.class);
        } catch (Exception e) {
            return null; // table/column not there yet
        }
    }
}
