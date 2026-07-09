package shop.bluequirk.blue_quirk_backend.integration.todify;

import java.time.format.DateTimeFormatter;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import shop.bluequirk.blue_quirk_backend.entity.TodifySettings;
import shop.bluequirk.blue_quirk_backend.repository.TodifySettingsRepository;

/**
 * Single source of truth for the effective Todify connection config. Values come
 * from the admin-editable {@link TodifySettings} DB row when set, otherwise from
 * the {@code todify.*} environment defaults — so the integration can be configured
 * from the dashboard at runtime, and env-only deployments still work unchanged.
 */
@Service
public class TodifyConfigService {

    private final TodifySettingsRepository repository;

    private final boolean envEnabled;
    private final String envBaseUrl;
    private final String envApiToken;
    private final String envWebhookSecret;

    public TodifyConfigService(
            TodifySettingsRepository repository,
            @Value("${todify.enabled:true}") boolean envEnabled,
            @Value("${todify.base-url:https://todify.ma/api/v1}") String envBaseUrl,
            @Value("${todify.api-token:}") String envApiToken,
            @Value("${todify.webhook-secret:}") String envWebhookSecret) {
        this.repository = repository;
        this.envEnabled = envEnabled;
        this.envBaseUrl = normalize(envBaseUrl);
        this.envApiToken = trim(envApiToken);
        this.envWebhookSecret = trim(envWebhookSecret);
    }

    // --- effective values (DB overrides env) ---

    public boolean effectiveEnabled() {
        TodifySettings s = row();
        if (s != null && s.getEnabled() != null) return s.getEnabled();
        return envEnabled;
    }

    public String effectiveApiToken() {
        return firstNonBlank(row() != null ? row().getApiToken() : null, envApiToken);
    }

    public String effectiveBaseUrl() {
        String db = row() != null ? row().getBaseUrl() : null;
        return normalize(firstNonBlank(db, envBaseUrl));
    }

    public String effectiveWebhookSecret() {
        return firstNonBlank(row() != null ? row().getWebhookSecret() : null, envWebhookSecret);
    }

    /** Todify can run only when enabled and both token + base URL are present. */
    public boolean isConfigured() {
        return effectiveEnabled()
                && !effectiveApiToken().isBlank()
                && !effectiveBaseUrl().isBlank();
    }

    // --- admin read/update ---

    @Transactional(readOnly = true)
    public TodifySettingsView view() {
        String token = effectiveApiToken();
        String secret = effectiveWebhookSecret();
        TodifySettings s = row();
        return new TodifySettingsView(
                effectiveEnabled(),
                effectiveBaseUrl(),
                !token.isBlank(),
                mask(token),
                !secret.isBlank(),
                isConfigured(),
                source(),
                s != null && s.getUpdatedAt() != null
                        ? s.getUpdatedAt().atZone(java.time.ZoneOffset.UTC).format(DateTimeFormatter.ISO_INSTANT) : null,
                s != null ? s.getUpdatedByEmail() : null);
    }

    @Transactional
    public TodifySettingsView update(UpdateTodifySettingsRequest req, String actorEmail) {
        TodifySettings s = repository.findById(TodifySettings.SINGLETON_ID).orElseGet(() -> {
            TodifySettings fresh = new TodifySettings();
            fresh.setId(TodifySettings.SINGLETON_ID);
            return fresh;
        });

        if (req.enabled() != null) s.setEnabled(req.enabled());
        if (req.baseUrl() != null) s.setBaseUrl(trimToNull(req.baseUrl()));
        // Secrets: null = leave unchanged; provided (even blank) = set/clear.
        if (req.apiToken() != null) s.setApiToken(trimToNull(req.apiToken()));
        if (req.webhookSecret() != null) s.setWebhookSecret(trimToNull(req.webhookSecret()));
        s.setUpdatedByEmail(actorEmail);
        // Ensure updatedAt is set on first insert too (PreUpdate only fires on update).
        s.setUpdatedAt(java.time.Instant.now());

        repository.save(s);
        return view();
    }

    // --- helpers ---

    private TodifySettings row() {
        return repository.findById(TodifySettings.SINGLETON_ID).orElse(null);
    }

    /** "db" if the DB row overrides any connection field, else "env". */
    private String source() {
        TodifySettings s = row();
        boolean dbHasValue = s != null && (s.getEnabled() != null
                || notBlank(s.getApiToken()) || notBlank(s.getBaseUrl()) || notBlank(s.getWebhookSecret()));
        return dbHasValue ? "db" : "env";
    }

    private static String mask(String secret) {
        if (secret == null || secret.isBlank()) return null;
        String s = secret.trim();
        return s.length() <= 4 ? "••••" : "••••" + s.substring(s.length() - 4);
    }

    private static String normalize(String url) {
        return url == null ? "" : url.trim().replaceAll("/+$", "");
    }

    private static String firstNonBlank(String a, String b) {
        if (a != null && !a.isBlank()) return a.trim();
        return b == null ? "" : b.trim();
    }

    private static boolean notBlank(String s) { return s != null && !s.isBlank(); }
    private static String trim(String s) { return s == null ? "" : s.trim(); }
    private static String trimToNull(String s) { return notBlank(s) ? s.trim() : null; }

    // --- DTOs ---

    /** Admin view — never exposes the raw token/secret, only masked + presence flags. */
    public record TodifySettingsView(
            boolean enabled,
            String baseUrl,
            boolean apiTokenSet,
            String apiTokenMasked,
            boolean webhookSecretSet,
            boolean configured,
            String source,
            String updatedAt,
            String updatedByEmail) {}

    /** Update payload. Null fields are left unchanged (so the UI never needs the current secret). */
    public record UpdateTodifySettingsRequest(
            Boolean enabled,
            String baseUrl,
            String apiToken,
            String webhookSecret) {}
}
