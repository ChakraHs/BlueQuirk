package shop.bluequirk.blue_quirk_backend.entity;

import jakarta.persistence.*;

@Entity
@Table(name = "email_template")
public class EmailTemplate {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true, nullable = false)
    private String code;

    @Column(nullable = false)
    private String subject;

    @Lob
    @Column(nullable = false)
    private String body;

    private boolean active = true;

    public EmailTemplate() {}

    public EmailTemplate(
            String code,
            String subject,
            String body,
            boolean active
    ) {
        this.code = code;
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