package shop.bluequirk.blue_quirk_backend.entity;

import jakarta.persistence.*;

@Entity
@Table(name = "users")
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Link to the Keycloak account (the JWT `sub`). Source of truth for identity
    // stays in Keycloak; this row carries app-side relations (orders, etc.).
    // Nullable + unique so legacy/admin-created rows without a Keycloak account
    // still validate (MariaDB allows multiple NULLs under a UNIQUE constraint).
    @Column(name = "keycloak_id", unique = true)
    private String keycloakId;

    @Column(nullable = false, unique = true)
    private String email;

    // Keycloak owns credentials, so locally-provisioned users have no password.
    @Column
    private String password;

    @Column(nullable = false)
    private String name;

    // Constructors
    public User() {}

    public User(String email, String password, String name) {
        this.email = email;
        this.password = password;
        this.name = name;
    }

    // Getters & Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getKeycloakId() { return keycloakId; }
    public void setKeycloakId(String keycloakId) { this.keycloakId = keycloakId; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getPassword() { return password; }
    public void setPassword(String password) { this.password = password; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
}
