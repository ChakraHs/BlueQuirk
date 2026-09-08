package shop.bluequirk.blue_quirk_backend.progressive.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import shop.bluequirk.blue_quirk_backend.identity.user.CurrentUserService;
import shop.bluequirk.blue_quirk_backend.progressive.dto.ProgressiveSettingsRequest;
import shop.bluequirk.blue_quirk_backend.progressive.dto.ProgressiveSettingsResponse;
import shop.bluequirk.blue_quirk_backend.progressive.service.ProgressiveDiscountService;

/**
 * Admin API for the progressive multi-item discount config (singleton). Admin-only
 * via both the fail-closed SecurityConfig default and an explicit {@code @PreAuthorize}.
 * Thin — all logic lives in {@link ProgressiveDiscountService}.
 */
@RestController
@RequestMapping("/api/progressive-discount")
@PreAuthorize("hasAuthority('admin')")
public class ProgressiveAdminController {

    private final ProgressiveDiscountService service;
    private final CurrentUserService currentUserService;

    public ProgressiveAdminController(ProgressiveDiscountService service,
                                      CurrentUserService currentUserService) {
        this.service = service;
        this.currentUserService = currentUserService;
    }

    @GetMapping
    public ResponseEntity<ProgressiveSettingsResponse> get() {
        return ResponseEntity.ok(service.view());
    }

    @PutMapping
    public ResponseEntity<ProgressiveSettingsResponse> update(@RequestBody ProgressiveSettingsRequest request) {
        String actor = currentUserService.require().getEmail();
        return ResponseEntity.ok(service.update(request, actor));
    }
}
