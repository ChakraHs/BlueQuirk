package shop.bluequirk.blue_quirk_backend.service;

import org.springframework.stereotype.Service;

import shop.bluequirk.blue_quirk_backend.entity.EmailTemplate;
import shop.bluequirk.blue_quirk_backend.repository.EmailTemplateRepository;
import shop.bluequirk.blue_quirk_backend.utility.EmailI18n;

@Service
public class EmailTemplateService {

    private final EmailTemplateRepository repository;

    public EmailTemplateService(
            EmailTemplateRepository repository
    ) {
        this.repository = repository;
    }

    /** Active template for a code in the default language (generic ad-hoc sends). */
    public EmailTemplate getByCode(String code) {
        return getByCode(code, EmailI18n.DEFAULT_LANG);
    }

    /** Active template for a code in a specific language, defaulting when missing. */
    public EmailTemplate getByCode(String code, String lang) {
        String l = EmailI18n.normalize(lang);
        return repository.findByCodeAndLangAndActiveTrue(code, l)
                .or(() -> repository.findByCodeAndLangAndActiveTrue(code, EmailI18n.DEFAULT_LANG))
                .orElseThrow(() ->
                        new RuntimeException(
                                "Template not found: " + code));
    }
}
