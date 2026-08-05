package shop.bluequirk.blue_quirk_backend.entity;

import jakarta.persistence.*;

@Entity
@Table(name = "email_template", uniqueConstraints = @UniqueConstraint(
        name = "uk_email_template_code_lang", columnNames = {"code", "lang"}))
public class EmailTemplate {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // No longer unique on its own: a template exists per (code, lang) so the same
    // event can carry a French and an Arabic body.
    @Column(nullable = false)
    private String code;

    // Language of this template body: "fr" (default) or "ar". The DB default lets
    // the column be added non-destructively to an existing table (rows backfill to 'fr').
    @Column(nullable = false, length = 8, columnDefinition = "varchar(8) default 'fr'")
    private String lang = "fr";

    @Column(nullable = false)
    private String subject;

    // Full HTML email body. Explicit LONGTEXT: on this MariaDB setup a plain
    // @Lob String maps to TINYTEXT (255 chars), which truncates real emails.
    @Column(columnDefinition = "LONGTEXT", nullable = false)
    private String body;

    private boolean active = true;

    public EmailTemplate() {}

    public EmailTemplate(
            String code,
            String lang,
            String subject,
            String body,
            boolean active
    ) {
        this.code = code;
        this.lang = lang;
        this.subject = subject;
        this.body = body;
        this.active = active;
    }

    public Long getId() {
        return id;
    }

    public String getCode() {
        return code;
    }

    public void setCode(String code) {
        this.code = code;
    }

    public String getLang() {
        return lang;
    }

    public void setLang(String lang) {
        this.lang = lang;
    }

    public String getSubject() {
        return subject;
    }

    public void setSubject(String subject) {
        this.subject = subject;
    }

    public String getBody() {
        return body;
    }

    public void setBody(String body) {
        this.body = body;
    }

    public boolean isActive() {
        return active;
    }

    public void setActive(boolean active) {
        this.active = active;
    }
}