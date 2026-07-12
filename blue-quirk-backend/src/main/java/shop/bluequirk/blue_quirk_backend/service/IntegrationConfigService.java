package shop.bluequirk.blue_quirk_backend.service;

import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import shop.bluequirk.blue_quirk_backend.entity.IntegrationSettings;
import shop.bluequirk.blue_quirk_backend.repository.IntegrationSettingsRepository;

/**
 * Single source of truth for third-party credentials (Cloudflare R2, Resend).
 * Values come from the admin-editable {@link IntegrationSettings} DB row when
 * set, otherwise from the {@code r2.*}/{@code resend.*} environment defaults — so
 * the keys can be rotated from the dashboard at runtime, and env-only deployments
 * still work unchanged.
 *
 * <p>Consumers ({@code R2StorageService}, {@code ResendEmailProvider}) resolve
 * the effective value on each use, so a dashboard change takes effect without a
 * restart.
 */
@Service
public class IntegrationConfigService {

    private static final Logger LOG = LoggerFactory.getLogger(IntegrationConfigService.class);

    private final IntegrationSettingsRepository repository;

    private final String envR2ApiToken;
    private final String envResendApiKey;
    private final String envResendFrom;

    public IntegrationConfigService(
            IntegrationSettingsRepository repository,
            @Value("${r2.api-token:}") String envR2ApiToken,
            @Value("${resend.api-key:}") String envResendApiKey,
            @Value("${resend.from:}") String envResendFrom) {
        this.repository = repository;
        this.envR2ApiToken = trim(envR2ApiToken);
        this.envResendApiKey = trim(envResendApiKey);
        this.envResendFrom = trim(envResendFrom);
    }

    // --- effective values (DB overrides env) ---

    public String effectiveR2ApiToken() {
        return firstNonBlank(row() != null ? row().getR2ApiToken() : null, envR2ApiToken);
    }

    public String effectiveResendApiKey() {
        return firstNonBlank(row() != null ? row().getResendApiKey() : null, envResendApiKey);
    }

    public String effectiveResendFrom() {
        return firstNonBlank(row() != null ? row().getResendFrom() : null, envResendFrom);
    }

    // --- admin read/update ---

    @Transactional(readOnly = true)
    public IntegrationSettingsView view() {
        String r2 = effectiveR2ApiToken();
        String resendKey = effectiveResendApiKey();
        IntegrationSettings s = row();
        return new IntegrationSettingsView(
                !r2.isBlank(),
                mask(r2),
                r2Source(),
                !resendKey.isBlank(),
                mask(resendKey),
                resendKeySource(),
                effectiveResendFrom(),
                s != null && s.getUpdatedAt() != null
                        ? s.getUpdatedAt().atZone(ZoneOffset.UTC).format(DateTimeFormatter.ISO_INSTANT) : null,
                s != null ? s.getUpdatedByEmail() : null);
    }

    @Transactional
    public IntegrationSettingsView update(UpdateIntegrationSettingsRequest req, String actorEmail) {
        IntegrationSettings s = repository.findById(IntegrationSettings.SINGLETON_ID).orElseGet(() -> {
            IntegrationSettings fresh = new IntegrationSettings();
            fresh.setId(IntegrationSettings.SINGLETON_ID);
            return fresh;
        });

        // Secrets: null = leave unchanged; provided (even blank) = set/clear so
        // the admin can revert to the env default by clearing the field.
        if (req.r2ApiToken() != null) s.setR2ApiToken(trimToNull(req.r2ApiToken()));
        if (req.resendApiKey() != null) s.setResendApiKey(trimToNull(req.resendApiKey()));
        if (req.resendFrom() != null) s.setResendFrom(trimToNull(req.resendFrom()));
        s.setUpdatedByEmail(actorEmail);
        // Ensure updatedAt is set on first insert too (PreUpdate only fires on update).
        s.setUpdatedAt(java.time.Instant.now());

        repository.save(s);
        return view();
    }

    // --- helpers ---

    /** Reads the singleton row, tolerating an early/absent table (env fallback). */
    private IntegrationSettings row() {
        try {
            return repository.findById(IntegrationSettings.SINGLETON_ID).orElse(null);
        } catch (RuntimeException e) {
            LOG.debug("integration_settings lookup failed; using env defaults: {}", e.getMessage());
            return null;
        }
    }

    private String r2Source() {
        IntegrationSettings s = row();
        return s != null && notBlank(s.getR2ApiToken()) ? "db" : "env";
    }

    private String resendKeySource() {
        IntegrationSettings s = row();
        boolean db = s != null && (notBlank(s.getResendApiKey()) || notBlank(s.getResendFrom()));
        return db ? "db" : "env";
    }

    private static String mask(String secret) {
        if (secret == null || secret.isBlank()) return null;
        String s = secret.trim();
        return s.length() <= 4 ? "••••" : "••••" + s.substring(s.length() - 4);
    }

    private static String firstNonBlank(String a, String b) {
        if (a != null && !a.isBlank()) return a.trim();
        return b == null ? "" : b.trim();
    }

    private static boolean notBlank(String s) { return s != null && !s.isBlank(); }
    private static String trim(String s) { return s == null ? "" : s.trim(); }
    private static String trimToNull(String s) { return notBlank(s) ? s.trim() : null; }

    // --- DTOs ---

    /** Admin view — never exposes raw secrets, only masked values + presence flags. */
    public record IntegrationSettingsView(
            boolean r2ApiTokenSet,
            String r2ApiTokenMasked,
            String r2Source,
            boolean resendApiKeySet,
            String resendApiKeyMasked,
            String resendSource,
            String resendFrom,
            String updatedAt,
            String updatedByEmail) {}

    /** Update payload. Null fields are left unchanged (so the UI never needs the current secret). */
    public record UpdateIntegrationSettingsRequest(
            String r2ApiToken,
            String resendApiKey,
            String resendFrom) {}
}
