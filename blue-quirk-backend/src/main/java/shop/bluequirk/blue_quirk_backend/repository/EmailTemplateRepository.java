package shop.bluequirk.blue_quirk_backend.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import shop.bluequirk.blue_quirk_backend.entity.EmailTemplate;

public interface EmailTemplateRepository
        extends JpaRepository<EmailTemplate, Long> {

    /** The active template for an event in a specific language (used when sending). */
    Optional<EmailTemplate> findByCodeAndLangAndActiveTrue(String code, String lang);

    /** The template row for an event in a specific language, active or not (admin). */
    Optional<EmailTemplate> findByCodeAndLang(String code, String lang);

    /** All language variants of a given event. */
    List<EmailTemplate> findByCode(String code);
}
