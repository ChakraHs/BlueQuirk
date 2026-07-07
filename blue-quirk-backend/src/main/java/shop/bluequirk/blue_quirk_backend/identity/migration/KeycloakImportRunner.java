package shop.bluequirk.blue_quirk_backend.identity.migration;

import java.io.File;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

import shop.bluequirk.blue_quirk_backend.identity.config.IdentityProperties;

/**
 * Runs the one-time Keycloak user import on startup when
 * {@code bluequirk.security.migration.keycloak-export-file} points at a readable
 * export. No-ops otherwise. Ordered after {@link
 * shop.bluequirk.blue_quirk_backend.identity.config.IdentityDataInitializer} so
 * roles are seeded first. Idempotent — safe to leave configured across restarts.
 */
@Component
@Order(2)
public class KeycloakImportRunner implements ApplicationRunner {

    private static final Logger LOG = LoggerFactory.getLogger(KeycloakImportRunner.class);

    private final KeycloakRealmImportService importService;
    private final IdentityProperties props;

    public KeycloakImportRunner(KeycloakRealmImportService importService, IdentityProperties props) {
        this.importService = importService;
        this.props = props;
    }

    @Override
    public void run(ApplicationArguments args) {
        String path = props.getMigration().getKeycloakExportFile();
        if (!StringUtils.hasText(path)) {
            return;
        }
        File file = new File(path);
        if (!file.isFile() || !file.canRead()) {
            LOG.warn("Keycloak export file '{}' not found or unreadable; skipping user import", path);
            return;
        }
        try {
            LOG.info("Importing Keycloak users from {}", path);
            importService.importFromFile(file);
        } catch (Exception e) {
            // Never block startup on a migration error — log for the operator.
            LOG.error("Keycloak user import failed: {}", e.getMessage(), e);
        }
    }
}
