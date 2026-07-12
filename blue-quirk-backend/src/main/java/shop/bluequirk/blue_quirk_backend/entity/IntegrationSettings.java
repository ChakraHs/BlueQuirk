package shop.bluequirk.blue_quirk_backend.entity;

import java.time.Instant;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;

/**
 * Singleton row (id = 1) holding admin-editable credentials for third-party
 * services that were previously env-only: Cloudflare R2 (image storage) and
 * Resend (transactional email). Persisting them in the DB lets an admin manage
 * the keys from the dashboard at runtime instead of editing env vars + redeploying.
 *
 * <p>Any field left null/blank falls back to the corresponding environment
 * default (see {@code IntegrationConfigService}), so existing env-based
 * deployments keep working unchanged. Access to this table is admin-only
 * (fail-closed SecurityConfig); treat DB dumps as secret-bearing.
 */
@Entity
@Table(name = "integration_settings")
public class IntegrationSettings {

    public static final long SINGLETON_ID = 1L;

    @Id
    private Long id = SINGLETON_ID;

    // --- Cloudflare R2 (image storage) ---
    // Blank → fall back to the r2.api-token env default (R2_API_TOKEN).
    @Column(name = "r2_api_token", length = 512)
    private String r2ApiToken;

    // --- Resend (transactional email) ---
    // Blank → fall back to the resend.api-key env default (RESEND_API_KEY).
    @Column(name = "resend_api_key", length = 512)
    private String resendApiKey;

    // From-address for outgoing mail, e.g. "BlueQuirk <orders@contact.redquirk.com>".
    // Blank → fall back to the resend.from env default (RESEND_FROM).
    @Column(name = "resend_from", length = 255)
    private String resendFrom;

    @Column(name = "updated_at")
    private Instant updatedAt;

    @Column(name = "updated_by_email")
    private String updatedByEmail;

    @PreUpdate
    void onUpdate() { this.updatedAt = Instant.now(); }

    public IntegrationSettings() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getR2ApiToken() { return r2ApiToken; }
    public void setR2ApiToken(String r2ApiToken) { this.r2ApiToken = r2ApiToken; }

    public String getResendApiKey() { return resendApiKey; }
    public void setResendApiKey(String resendApiKey) { this.resendApiKey = resendApiKey; }

    public String getResendFrom() { return resendFrom; }
    public void setResendFrom(String resendFrom) { this.resendFrom = resendFrom; }

    public Instant getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(Instant updatedAt) { this.updatedAt = updatedAt; }

    public String getUpdatedByEmail() { return updatedByEmail; }
    public void setUpdatedByEmail(String updatedByEmail) { this.updatedByEmail = updatedByEmail; }
}
