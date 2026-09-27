package shop.bluequirk.blue_quirk_backend.careguide.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;

/**
 * One language's copy of a {@link CareGuideTemplate} — the "Care &amp; Wear"
 * guide sections written in a single language (fr | en | ar). Mirrors
 * {@code ProductTranslation}: one row per (template, lang) with the translatable
 * fields on the row and a unique constraint on {@code (template_id, lang)}.
 *
 * <p>Each of the five sections maps to a customer-facing block on the product
 * page (fabric &amp; feel, washing &amp; drying, ironing, print care, tips). All
 * are plain text (never rendered as HTML), so there is no XSS surface — line
 * breaks are preserved by the storefront.
 */
@Entity
@Table(
    name = "care_guide_template_translations",
    uniqueConstraints = {
        @UniqueConstraint(columnNames = {"template_id", "lang"})
    }
)
public class CareGuideTemplateTranslation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** Language code: fr | en | ar. */
    @Column(nullable = false, length = 8)
    private String lang;

    // NOTE: these are long free text. In this project `@Lob` ALONE maps to
    // LONGTEXT on MariaDB, but `@Lob` + `@Column` forces length 255 → TINYTEXT and
    // truncates the content (see EmailTemplate/Order). Since these fields need an
    // explicit column name, we use `columnDefinition = "LONGTEXT"` (no `@Lob`),
    // exactly like EmailTemplate.body.

    /** Fabric & feel — what the garment is made of and how it feels/behaves. */
    @Column(name = "fabric_and_feel", columnDefinition = "LONGTEXT")
    private String fabricAndFeel;

    /** How to wash and dry the item. */
    @Column(name = "washing_and_drying", columnDefinition = "LONGTEXT")
    private String washingAndDrying;

    /** Ironing guidance. */
    @Column(columnDefinition = "LONGTEXT")
    private String ironing;

    /** Caring for the printed design. */
    @Column(name = "print_care", columnDefinition = "LONGTEXT")
    private String printCare;

    /** Practical everyday tips. */
    @Column(columnDefinition = "LONGTEXT")
    private String tips;

    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "template_id")
    private CareGuideTemplate template;

    public CareGuideTemplateTranslation() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getLang() { return lang; }
    public void setLang(String lang) { this.lang = lang; }

    public String getFabricAndFeel() { return fabricAndFeel; }
    public void setFabricAndFeel(String fabricAndFeel) { this.fabricAndFeel = fabricAndFeel; }

    public String getWashingAndDrying() { return washingAndDrying; }
    public void setWashingAndDrying(String washingAndDrying) { this.washingAndDrying = washingAndDrying; }

    public String getIroning() { return ironing; }
    public void setIroning(String ironing) { this.ironing = ironing; }

    public String getPrintCare() { return printCare; }
    public void setPrintCare(String printCare) { this.printCare = printCare; }

    public String getTips() { return tips; }
    public void setTips(String tips) { this.tips = tips; }

    public CareGuideTemplate getTemplate() { return template; }
    public void setTemplate(CareGuideTemplate template) { this.template = template; }

    /** True when at least one section carries text — used to reject empty guides. */
    public boolean hasAnyContent() {
        return hasText(fabricAndFeel) || hasText(washingAndDrying) || hasText(ironing)
                || hasText(printCare) || hasText(tips);
    }

    private static boolean hasText(String s) {
        return s != null && !s.isBlank();
    }
}
