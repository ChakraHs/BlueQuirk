package shop.bluequirk.blue_quirk_backend.controller;

import java.util.List;

import org.springframework.web.bind.annotation.*;

import shop.bluequirk.blue_quirk_backend.entity.EmailTemplate;
import shop.bluequirk.blue_quirk_backend.repository.EmailTemplateRepository;

@RestController
@RequestMapping("/api/email-templates")
public class EmailTemplateController {

    private final EmailTemplateRepository repository;

    public EmailTemplateController(EmailTemplateRepository repository) {
        this.repository = repository;
    }

    @GetMapping
    public List<EmailTemplate> getAll() {
        return repository.findAll();
    }

    @GetMapping("/{id}")
    public EmailTemplate getById(@PathVariable Long id) {
        return repository.findById(id)
                .orElseThrow(() -> new RuntimeException("Template not found"));
    }

    @GetMapping("/code/{code}")
    public EmailTemplate getByCode(@PathVariable String code) {
        return repository.findByCode(code)
                .orElseThrow(() -> new RuntimeException("Template not found"));
    }

    @PostMapping
    public EmailTemplate create(@RequestBody EmailTemplate template) {
        return repository.save(template);
    }

    @PutMapping("/{id}")
    public EmailTemplate update(
            @PathVariable Long id,
            @RequestBody EmailTemplate template) {

        EmailTemplate existing = repository.findById(id)
                .orElseThrow(() -> new RuntimeException("Template not found"));

        existing.setCode(template.getCode());
        existing.setSubject(template.getSubject());
        existing.setBody(template.getBody());
        existing.setActive(template.isActive());

        return repository.save(existing);
    }

    @DeleteMapping("/{id}")
    public void delete(@PathVariable Long id) {
        repository.deleteById(id);
    }
}