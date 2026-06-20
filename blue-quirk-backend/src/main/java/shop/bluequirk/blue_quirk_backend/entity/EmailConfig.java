package shop.bluequirk.blue_quirk_backend.entity;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "email_config")
public class EmailConfig {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String provider; // GMAIL, SENDGRID, MAILGUN

    private String host;
    private Integer port;
    private String username;
    private String password;

    private boolean smtpAuth;
    private boolean starttls;

    private boolean active; // only ONE active config

	public Long getId() {
		return id;
	}

	public void setId(Long id) {
		this.id = id;
	}

	public String getProvider() {
		return provider;
	}

	public void setProvider(String provider) {
		this.provider = provider;
	}

	public String getHost() {
		return host;
	}

	public void setHost(String host) {
		this.host = host;
	}

	public Integer getPort() {
		return port;
	}

	public void setPort(Integer port) {
		this.port = port;
	}

	public String getUsername() {
		return username;
	}

	public void setUsername(String username) {
		this.username = username;
	}

	public String getPassword() {
		return password;
	}

	public void setPassword(String password) {
		this.password = password;
	}

	public boolean isSmtpAuth() {
		return smtpAuth;
	}

	public void setSmtpAuth(boolean smtpAuth) {
		this.smtpAuth = smtpAuth;
	}

	public boolean isStarttls() {
		return starttls;
	}

	public void setStarttls(boolean starttls) {
		this.starttls = starttls;
	}

	public boolean isActive() {
		return active;
	}

	public void setActive(boolean active) {
		this.active = active;
	}
}
