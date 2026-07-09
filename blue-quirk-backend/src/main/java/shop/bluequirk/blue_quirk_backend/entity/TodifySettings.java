package shop.bluequirk.blue_quirk_backend.entity;

import java.time.Instant;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;

/**
 * Singleton row (id = 1) holding the admin-editable Todify connection config.
 * Persisting it in the DB lets an admin configure the integration from the
 * dashboard at runtime instead of setting env vars + redeploying. Any field left
 * null/blank falls back to the corresponding {@code todify.*} environment default
 * (see {@code TodifyConfigService}), so existing env-based deployments keep working.
 */
@Entity
@Table(name = "todify_settings")
public class TodifySettings {

    public static final long SINGLETON_ID = 1L;

    @Id
    private Long id = SINGLETON_ID;

    // null → fall back to the todify.enabled env default.
    private Boolean enabled;

    // Secrets are stored so the admin can manage them without a redeploy. Access
    // to this table is admin-only (fail-closed SecurityConfig); treat DB dumps
    // accordingly. Left blank → env fallback.
    @Column(name = "api_token", length = 512)
    private String apiToken;

    @Column(name = "base_url")
    private String baseUrl;

    @Column(name = "webhook_secret", length = 512)
    private String webhookSecret;

    @Column(name = "updated_at")
    private Instant updatedAt;

    @Column(name = "updated_by_email")
    private String updatedByEmail;

    @PreUpdate
    void onUpdate() { this.updatedAt = Instant.now(); }

    public TodifySettings() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Boolean getEnabled() { return enabled; }
    public void setEnabled(Boolean enabled) { this.enabled = enabled; }

    public String getApiToken() { return apiToken; }
    public void setApiToken(String apiToken) { this.apiToken = apiToken; }

    public String getBaseUrl() { return baseUrl; }
    public void setBaseUrl(String baseUrl) { this.baseUrl = baseUrl; }

    public String getWebhookSecret() { return webhookSecret; }
    public void setWebhookSecret(String webhookSecret) { this.webhookSecret = webhookSecret; }

    public Instant getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(Instant updatedAt) { this.updatedAt = updatedAt; }

    public String getUpdatedByEmail() { return updatedByEmail; }
    public void setUpdatedByEmail(String updatedByEmail) { this.updatedByEmail = updatedByEmail; }
}
