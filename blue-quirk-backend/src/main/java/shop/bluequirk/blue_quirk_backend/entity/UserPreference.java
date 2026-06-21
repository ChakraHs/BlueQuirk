package shop.bluequirk.blue_quirk_backend.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/**
 * Per-user storefront preferences, keyed by the Keycloak user id (the JWT `sub`).
 * Kept here (not in the Keycloak realm) so it can evolve without touching the
 * identity service. Currently holds the preferred UI language (fr | ar).
 */
@Entity
@Table(name = "user_preferences")
public class UserPreference {

    @Id
    @Column(name = "user_id")
    private String userId;

    @Column(nullable = false)
    private String language;

    public UserPreference() {}

    public UserPreference(String userId, String language) {
        this.userId = userId;
        this.language = language;
    }

    public String getUserId() { return userId; }
    public void setUserId(String userId) { this.userId = userId; }

    public String getLanguage() { return language; }
    public void setLanguage(String language) { this.language = language; }
}
