package shop.bluequirk.blue_quirk_backend.service;

import org.springframework.stereotype.Service;

import shop.bluequirk.blue_quirk_backend.entity.EmailTemplate;
import shop.bluequirk.blue_quirk_backend.repository.EmailTemplateRepository;

@Service
public class EmailTemplateService {

    private final EmailTemplateRepository repository;

    public EmailTemplateService(
            EmailTemplateRepository repository
    ) {
        this.repository = repository;
    }

    public EmailTemplate getByCode(String code) {
        return repository.findByCodeAndActiveTrue(code)
                .orElseThrow(() ->
                        new RuntimeException(
                                "Template not found: " + code));
    }
}
