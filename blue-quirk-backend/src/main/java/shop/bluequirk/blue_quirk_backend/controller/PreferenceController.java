package shop.bluequirk.blue_quirk_backend.controller;

import java.util.Set;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import shop.bluequirk.blue_quirk_backend.entity.UserPreference;
import shop.bluequirk.blue_quirk_backend.repository.UserPreferenceRepository;

/**
 * Stores/returns per-user storefront preferences (currently UI language).
 * Keyed by the Keycloak user id, which the frontend reads from the JWT `sub`.
 */
@RestController
@RequestMapping("/api/preferences")
public class PreferenceController {

    private static final Set<String> SUPPORTED_LANGS = Set.of("fr", "ar");

    private final UserPreferenceRepository repository;

    public PreferenceController(UserPreferenceRepository repository) {
        this.repository = repository;
    }

    public record PreferenceRequest(String language) {}

    public record PreferenceResponse(String userId, String language) {}

    @GetMapping("/{userId}")
    public ResponseEntity<PreferenceResponse> getPreference(@PathVariable String userId) {
        return repository.findById(userId)
                .map(p -> ResponseEntity.ok(new PreferenceResponse(p.getUserId(), p.getLanguage())))
                .orElse(ResponseEntity.noContent().build());
    }

    @PutMapping("/{userId}")
    public ResponseEntity<PreferenceResponse> savePreference(
            @PathVariable String userId,
            @RequestBody PreferenceRequest request) {

        String language = request.language();
        if (language == null || !SUPPORTED_LANGS.contains(language)) {
            return ResponseEntity.badRequest().build();
        }

        UserPreference pref = repository.findById(userId)
                .orElseGet(() -> new UserPreference(userId, language));
        pref.setLanguage(language);
        UserPreference saved = repository.save(pref);

        return ResponseEntity.ok(new PreferenceResponse(saved.getUserId(), saved.getLanguage()));
    }
}
