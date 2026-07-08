package shop.bluequirk.blue_quirk_backend.identity.permission;

import jakarta.persistence.*;

/**
 * A fine-grained action (e.g. {@code PRODUCT_WRITE}, {@code ORDER_READ}) granted via
 * a {@link shop.bluequirk.blue_quirk_backend.identity.role.Role}. Permissions are
 * emitted as JWT authorities so controllers/services can use
 * {@code @PreAuthorize("hasAuthority('PRODUCT_WRITE')")} for future granular control.
 */
@Entity
@Table(name = "permissions")
public class Permission {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String name;

    public Permission() {}

    public Permission(String name) {
        this.name = name;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
}
