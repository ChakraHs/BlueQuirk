package shop.bluequirk.blue_quirk_backend.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import shop.bluequirk.blue_quirk_backend.domain.DefaultEmailTemplates;
import shop.bluequirk.blue_quirk_backend.domain.EmailEvent;
import shop.bluequirk.blue_quirk_backend.entity.EmailTemplate;
import shop.bluequirk.blue_quirk_backend.repository.EmailTemplateRepository;
import shop.bluequirk.blue_quirk_backend.utility.EmailI18n;

/**
 * Seeds a default, editable email template for every {@link EmailEvent} in every
 * supported language on startup, when one with that (code, lang) doesn't already
 * exist. Existing templates are never overwritten, so admin edits are preserved
 * across restarts.
 */
@Component
@Order(50)
public class EmailTemplateSeeder implements ApplicationRunner {

    private static final Logger LOG = LoggerFactory.getLogger(EmailTemplateSeeder.class);

    private final EmailTemplateRepository repository;

    public EmailTemplateSeeder(EmailTemplateRepository repository) {
        this.repository = repository;
    }

    @Override
    public void run(ApplicationArguments args) {
        int created = 0;
        for (EmailEvent event : EmailEvent.values()) {
            for (String lang : EmailI18n.SUPPORTED) {
                if (repository.findByCodeAndLang(event.code(), lang).isEmpty()) {
                    DefaultEmailTemplates.Seed seed = DefaultEmailTemplates.forEvent(event, lang);
                    repository.save(new EmailTemplate(event.code(), lang, seed.subject(), seed.body(), true));
                    created++;
                }
            }
        }
        if (created > 0) {
            LOG.info("Seeded {} default email template(s).", created);
        }
    }
}
