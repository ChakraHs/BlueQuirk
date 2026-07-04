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

/**
 * Seeds a default, editable email template for every {@link EmailEvent} on
 * startup when one with that code doesn't already exist. Existing templates are
 * never overwritten, so admin edits are preserved across restarts.
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
            if (repository.findByCode(event.code()).isEmpty()) {
                DefaultEmailTemplates.Seed seed = DefaultEmailTemplates.forEvent(event);
                repository.save(new EmailTemplate(event.code(), seed.subject(), seed.body(), true));
                created++;
            }
        }
        if (created > 0) {
            LOG.info("Seeded {} default email template(s).", created);
        }
    }
}
