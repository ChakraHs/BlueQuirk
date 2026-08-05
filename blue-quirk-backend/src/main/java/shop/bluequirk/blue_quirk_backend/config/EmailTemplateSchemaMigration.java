package shop.bluequirk.blue_quirk_backend.config;

import java.util.List;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

/**
 * One-time upgrade for the {@code email_template} table to the multilingual
 * schema (one row per {@code code} + {@code lang}). Runs before
 * {@link EmailTemplateSeeder} (@Order 50).
 *
 * <p>Hibernate's {@code ddl-auto=update} adds the new {@code lang} column and the
 * composite unique key, but it never <em>drops</em> the old single-column unique
 * index on {@code code} — which would block a second (Arabic) row for the same
 * event. This runner detects and drops that legacy index. Because the legacy
 * index only exists on a pre-multilingual database, finding it also marks the
 * upgrade moment: the old (single-language) template rows are cleared so the
 * seeder regenerates clean French + Arabic defaults. On a fresh database (table
 * created new by Hibernate) there is no legacy index and nothing is deleted.
 */
@Component
@Order(40)
public class EmailTemplateSchemaMigration implements ApplicationRunner {

    private static final Logger LOG = LoggerFactory.getLogger(EmailTemplateSchemaMigration.class);

    private final JdbcTemplate jdbc;

    public EmailTemplateSchemaMigration(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @Override
    public void run(ApplicationArguments args) {
        if (!tableExists()) {
            return; // fresh DB — Hibernate creates the table already multilingual
        }
        // Always backfill any null/blank language to the default.
        jdbc.update("UPDATE email_template SET lang = 'fr' WHERE lang IS NULL OR lang = ''");

        String legacyIndex = findLegacyCodeUniqueIndex();
        if (legacyIndex == null) {
            return; // already migrated
        }
        try {
            jdbc.execute("ALTER TABLE email_template DROP INDEX `" + legacyIndex + "`");
            int cleared = jdbc.update("DELETE FROM email_template");
            LOG.info("Upgraded email_template to multilingual schema: dropped legacy unique index '{}', "
                    + "cleared {} old row(s) for reseeding (fr + ar).", legacyIndex, cleared);
        } catch (Exception e) {
            LOG.warn("Could not drop legacy email_template unique index '{}': {}", legacyIndex, e.getMessage());
        }
    }

    private boolean tableExists() {
        Integer n = jdbc.queryForObject(
                "SELECT COUNT(*) FROM information_schema.tables "
                        + "WHERE table_schema = DATABASE() AND table_name = 'email_template'",
                Integer.class);
        return n != null && n > 0;
    }

    /**
     * The name of a UNIQUE index on {@code email_template} that covers only the
     * {@code code} column (the pre-multilingual constraint), or null when none —
     * excluding PRIMARY and the new composite {@code (code, lang)} key.
     */
    private String findLegacyCodeUniqueIndex() {
        List<String> candidates = jdbc.queryForList(
                "SELECT index_name FROM information_schema.statistics "
                        + "WHERE table_schema = DATABASE() AND table_name = 'email_template' "
                        + "AND non_unique = 0 AND index_name <> 'PRIMARY' "
                        + "GROUP BY index_name "
                        + "HAVING COUNT(*) = 1 AND MAX(column_name) = 'code'",
                String.class);
        return candidates.isEmpty() ? null : candidates.get(0);
    }
}
