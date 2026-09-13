package shop.bluequirk.blue_quirk_backend.finance.entity;

import java.time.Instant;
import java.time.LocalDate;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;

/**
 * A business expense / cost (ads, hosting, UGC, misc…) recorded by an admin. These
 * are deducted from net order profit to give the store's REAL profit (bottom line)
 * over a period. One row per cost entry; {@code category} is a free label so new
 * cost types can be added without a code change.
 */
@Entity
@Table(name = "expenses")
public class Expense {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private double amount;

    /** Free-text cost type (e.g. "Ads / Marketing", "Hosting", "UGC", "Autre"). */
    @Column(nullable = false)
    private String category;

    @Column(length = 500)
    private String note;

    /** The date the cost applies to (defaults to today when omitted). */
    @Column(name = "expense_date", nullable = false)
    private LocalDate expenseDate;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "created_by_email")
    private String createdByEmail;

    @PrePersist
    void onCreate() {
        if (createdAt == null) createdAt = Instant.now();
        if (expenseDate == null) expenseDate = LocalDate.now();
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public double getAmount() { return amount; }
    public void setAmount(double amount) { this.amount = amount; }

    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }

    public String getNote() { return note; }
    public void setNote(String note) { this.note = note; }

    public LocalDate getExpenseDate() { return expenseDate; }
    public void setExpenseDate(LocalDate expenseDate) { this.expenseDate = expenseDate; }

    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }

    public String getCreatedByEmail() { return createdByEmail; }
    public void setCreatedByEmail(String createdByEmail) { this.createdByEmail = createdByEmail; }
}
