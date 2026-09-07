package shop.bluequirk.blue_quirk_backend.announcement.controller;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import shop.bluequirk.blue_quirk_backend.announcement.dto.AnnouncementRequest;
import shop.bluequirk.blue_quirk_backend.announcement.dto.AnnouncementResponse;
import shop.bluequirk.blue_quirk_backend.announcement.dto.BarSettings;
import shop.bluequirk.blue_quirk_backend.announcement.service.AnnouncementService;
import shop.bluequirk.blue_quirk_backend.identity.user.CurrentUserService;

/**
 * Admin announcement management API. Admin-only via both the fail-closed
 * SecurityConfig default and an explicit {@code @PreAuthorize}. Thin — all logic
 * lives in {@link AnnouncementService}.
 */
@RestController
@RequestMapping("/api/announcements")
@PreAuthorize("hasAuthority('admin')")
public class AnnouncementAdminController {

    private final AnnouncementService service;
    private final CurrentUserService currentUserService;

    public AnnouncementAdminController(AnnouncementService service,
                                       CurrentUserService currentUserService) {
        this.service = service;
        this.currentUserService = currentUserService;
    }

    private String actor() {
        return currentUserService.require().getEmail();
    }

    @GetMapping
    public List<AnnouncementResponse> list() {
        return service.list();
    }

    @GetMapping("/{id}")
    public AnnouncementResponse get(@PathVariable Long id) {
        return service.get(id);
    }

    @PostMapping
    public ResponseEntity<AnnouncementResponse> create(@RequestBody AnnouncementRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.create(request, actor()));
    }

    @PutMapping("/{id}")
    public AnnouncementResponse update(@PathVariable Long id, @RequestBody AnnouncementRequest request) {
        return service.update(id, request, actor());
    }

    @PatchMapping("/{id}/status")
    public AnnouncementResponse setStatus(@PathVariable Long id, @RequestBody StatusRequest request) {
        return service.setActive(id, request.active(), actor());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        service.delete(id);
        return ResponseEntity.noContent().build();
    }

    @PutMapping("/reorder")
    public List<AnnouncementResponse> reorder(@RequestBody ReorderRequest request) {
        return service.reorder(request.ids(), actor());
    }

    // --- Global bar settings (enabled + colors + transition + speed) ---

    @GetMapping("/settings")
    public BarSettings getSettings() {
        return service.barSettings();
    }

    @PutMapping("/settings")
    public BarSettings updateSettings(@RequestBody BarSettings request) {
        return service.updateBarSettings(request);
    }

    public record StatusRequest(boolean active) {}
    public record ReorderRequest(List<Long> ids) {}
}
