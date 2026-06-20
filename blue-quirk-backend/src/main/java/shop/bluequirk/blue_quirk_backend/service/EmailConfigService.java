package shop.bluequirk.blue_quirk_backend.service;

import org.springframework.stereotype.Service;

import shop.bluequirk.blue_quirk_backend.entity.EmailConfig;
import shop.bluequirk.blue_quirk_backend.repository.EmailConfigRepository;

@Service
public class EmailConfigService {

    private final EmailConfigRepository repository;

    public EmailConfigService(EmailConfigRepository repository) {
        this.repository = repository;
    }

    public EmailConfig getActiveConfig() {
        return repository.findByActiveTrue()
                .orElseThrow(() -> new RuntimeException("No active email config found"));
    }
}