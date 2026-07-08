package shop.bluequirk.blue_quirk_backend.identity.role;

import java.util.HashSet;
import java.util.Set;

import jakarta.persistence.*;
import shop.bluequirk.blue_quirk_backend.identity.permission.Permission;

/**
 * A named authority granted to users. Role names are kept lowercase ({@code admin},
 * {@code user}, future {@code vendor}) to match the Keycloak realm roles so every
 * existing {@code hasAuthority("admin")} rule keeps working unchanged through the
 * coexistence phase. A role aggregates fine-grained {@link Permission}s.
 */
@Entity
@Table(name = "roles")
public class Role {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String name;

    @Column
    private String description;

    @ManyToMany(fetch = FetchType.EAGER)
    @JoinTable(
            name = "role_permissions",
            joinColumns = @JoinColumn(name = "role_id"),
            inverseJoinColumns = @JoinColumn(name = "permission_id"))
    private Set<Permission> permissions = new HashSet<>();

    public Role() {}

    public Role(String name, String description) {
        this.name = name;
        this.description = description;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public Set<Permission> getPermissions() { return permissions; }
    public void setPermissions(Set<Permission> permissions) { this.permissions = permissions; }
}
