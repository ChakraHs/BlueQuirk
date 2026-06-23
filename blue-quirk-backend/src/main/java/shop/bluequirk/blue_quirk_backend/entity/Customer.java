package shop.bluequirk.blue_quirk_backend.entity;

import java.time.LocalDateTime;

import jakarta.persistence.*;

/**
 * A person who has placed an order, keyed by email. A Customer exists
 * independently of any login: guest checkouts create a Customer with no linked
 * {@link User} account. When a registered user checks out, their Customer row is
 * linked to the {@code userAccount} so both views stay in sync.
 *
 * <p>Relationship: UserAccount (optional) → Customer → Orders.
 */
@Entity
@Table(name = "customers")
public class Customer {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String email;

    private String firstName;
    private String lastName;
    private String phone;

    // Most recent shipping details captured at checkout (handy for re-orders and
    // the admin profile view). The authoritative per-order copy lives on Order.
    @Column(length = 512)
    private String address;
    private String city;
    private String postalCode;

    // Optional link to a Keycloak-backed account. Null = guest customer.
    @ManyToOne
    @JoinColumn(name = "user_account_id")
    private User userAccount;

    private LocalDateTime createdAt;

    public Customer() {}

    @PrePersist
    void onCreate() {
        if (createdAt == null) createdAt = LocalDateTime.now();
    }

    /** A customer is a "guest" until a login account is linked. */
    @Transient
    public boolean isGuest() {
        return userAccount == null;
    }

    // Getters & setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getFirstName() { return firstName; }
    public void setFirstName(String firstName) { this.firstName = firstName; }

    public String getLastName() { return lastName; }
    public void setLastName(String lastName) { this.lastName = lastName; }

    public String getPhone() { return phone; }
    public void setPhone(String phone) { this.phone = phone; }

    public String getAddress() { return address; }
    public void setAddress(String address) { this.address = address; }

    public String getCity() { return city; }
    public void setCity(String city) { this.city = city; }

    public String getPostalCode() { return postalCode; }
    public void setPostalCode(String postalCode) { this.postalCode = postalCode; }

    public User getUserAccount() { return userAccount; }
    public void setUserAccount(User userAccount) { this.userAccount = userAccount; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
