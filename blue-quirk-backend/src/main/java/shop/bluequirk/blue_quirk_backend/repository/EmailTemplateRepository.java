package shop.bluequirk.blue_quirk_backend.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import shop.bluequirk.blue_quirk_backend.entity.EmailTemplate;

public interface EmailTemplateRepository
        extends JpaRepository<EmailTemplate, Long> {

    Optional<EmailTemplate> findByCodeAndActiveTrue(String code);

	Optional<EmailTemplate> findByCode(String code);
}