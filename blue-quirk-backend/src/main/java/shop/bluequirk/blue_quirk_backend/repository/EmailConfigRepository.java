package shop.bluequirk.blue_quirk_backend.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import shop.bluequirk.blue_quirk_backend.entity.EmailConfig;

public interface EmailConfigRepository extends JpaRepository<EmailConfig, Long> {
    Optional<EmailConfig> findByActiveTrue();
}
