package shop.bluequirk.blue_quirk_backend.controller;

import java.util.List;
import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import shop.bluequirk.blue_quirk_backend.domain.EmailEvent;
import shop.bluequirk.blue_quirk_backend.domain.EmailTemplateCatalog;
import shop.bluequirk.blue_quirk_backend.entity.EmailTemplate;
import shop.bluequirk.blue_quirk_backend.repository.EmailTemplateRepository;
import shop.bluequirk.blue_quirk_backend.utility.TemplateEngine;

@RestController
@RequestMapping("/api/email-templates")
public class EmailTemplateController {

    private final EmailTemplateRepository repository;

    public EmailTemplateController(EmailTemplateRepository repository) {
        this.repository = repository;
    }

    /** One entry per email event, with whether a template is assigned/active. */
    public record EventInfo(
            String code, String label, String description,
            boolean assigned, boolean active, Long templateId) {}

    public record CatalogResponse(
            List<EventInfo> events,
            List<EmailTemplateCatalog.VariableInfo> variables) {}

    public record PreviewResponse(String subject, String html) {}

    @GetMapping
    public List<EmailTemplate> getAll() {
        return repository.findAll();
    }

    /** Catalog of email events + available template variables (for the admin UI). */
    @GetMapping("/events")
    public CatalogResponse events() {
        List<EventInfo> events = java.util.Arrays.stream(EmailEvent.values())
                .map(e -> {
                    EmailTemplate t = repository.findByCode(e.code()).orElse(null);
                    return new EventInfo(
                            e.code(), e.label(), e.description(),
                            t != null, t != null && t.isActive(),
                            t != null ? t.getId() : null);
                })
                .toList();
        return new CatalogResponse(events, EmailTemplateCatalog.VARIABLES);
    }

    @GetMapping("/{id}")
    public EmailTemplate getById(@PathVariable Long id) {
        return repository.findById(id).orElseThrow(this::notFound);
    }

    @GetMapping("/code/{code}")
    public EmailTemplate getByCode(@PathVariable String code) {
        return repository.findByCode(code).orElseThrow(this::notFound);
    }

    /** Render a template with realistic sample data — used for the live preview. */
    @GetMapping("/{id}/preview")
    public PreviewResponse preview(@PathVariable Long id) {
        EmailTemplate t = repository.findById(id).orElseThrow(this::notFound);
        Map<String, String> vars = EmailTemplateCatalog.sampleVariables();
        return new PreviewResponse(
                TemplateEngine.process(t.getSubject(), vars),
                TemplateEngine.process(t.getBody(), vars));
    }

    @PostMapping
    public EmailTemplate create(@RequestBody EmailTemplate template) {
        return repository.save(template);
    }

    @PutMapping("/{id}")
    public EmailTemplate update(
            @PathVariable Long id,
            @RequestBody EmailTemplate template) {

        EmailTemplate existing = repository.findById(id).orElseThrow(this::notFound);

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

    private ResponseStatusException notFound() {
        return new ResponseStatusException(HttpStatus.NOT_FOUND, "Template not found");
    }
}
