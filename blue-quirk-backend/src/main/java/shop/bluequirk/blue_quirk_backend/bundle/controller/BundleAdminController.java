package shop.bluequirk.blue_quirk_backend.bundle.controller;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import shop.bluequirk.blue_quirk_backend.bundle.dto.BundleRequest;
import shop.bluequirk.blue_quirk_backend.bundle.dto.BundleResponse;
import shop.bluequirk.blue_quirk_backend.bundle.service.BundleOfferService;
import shop.bluequirk.blue_quirk_backend.identity.user.CurrentUserService;

/**
 * Admin bundle-offer management API. Admin-only via both the fail-closed
 * SecurityConfig default and an explicit {@code @PreAuthorize}. Thin — all logic
 * lives in {@link BundleOfferService}.
 */
@RestController
@RequestMapping("/api/bundles")
@PreAuthorize("hasAuthority('admin')")
public class BundleAdminController {

    private final BundleOfferService service;
    private final CurrentUserService currentUserService;

    public BundleAdminController(BundleOfferService service, CurrentUserService currentUserService) {
        this.service = service;
        this.currentUserService = currentUserService;
    }

    @GetMapping
    public ResponseEntity<List<BundleResponse>> list() {
        return ResponseEntity.ok(service.list());
    }

    @GetMapping("/{id}")
    public ResponseEntity<BundleResponse> get(@PathVariable Long id) {
        return ResponseEntity.ok(service.getById(id));
    }

    @PostMapping
    public ResponseEntity<BundleResponse> create(@RequestBody BundleRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(service.create(request, currentUserService.require()));
    }

    @PutMapping("/{id}")
    public ResponseEntity<BundleResponse> update(@PathVariable Long id,
                                                 @RequestBody BundleRequest request) {
        return ResponseEntity.ok(service.update(id, request, currentUserService.require()));
    }

    @PatchMapping("/{id}/status")
    public ResponseEntity<BundleResponse> setStatus(@PathVariable Long id,
                                                    @RequestBody StatusRequest request) {
        return ResponseEntity.ok(service.setActive(id, request.active(), currentUserService.require()));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        service.delete(id);
        return ResponseEntity.noContent().build();
    }

    public record StatusRequest(boolean active) {}
}
