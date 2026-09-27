package shop.bluequirk.blue_quirk_backend.careguide.controller;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import shop.bluequirk.blue_quirk_backend.careguide.dto.CareGuideTemplateRequest;
import shop.bluequirk.blue_quirk_backend.careguide.dto.CareGuideTemplateResponse;
import shop.bluequirk.blue_quirk_backend.careguide.service.CareGuideService;
import shop.bluequirk.blue_quirk_backend.identity.user.CurrentUserService;

/**
 * Admin API for managing "Care &amp; Wear" guide templates. Admin-only via both
 * the fail-closed SecurityConfig default and an explicit {@code @PreAuthorize}.
 * The storefront never calls this — products carry their resolved guide in the
 * product detail response — so no public controller is needed. The admin product
 * form uses {@link #list()} to populate the template picker.
 */
@RestController
@RequestMapping("/api/care-guides")
@PreAuthorize("hasAuthority('admin')")
public class CareGuideAdminController {

    private final CareGuideService service;
    private final CurrentUserService currentUserService;

    public CareGuideAdminController(CareGuideService service, CurrentUserService currentUserService) {
        this.service = service;
        this.currentUserService = currentUserService;
    }

    private String actor() {
        return currentUserService.require().getEmail();
    }

    @GetMapping
    public List<CareGuideTemplateResponse> list() {
        return service.list();
    }

    @GetMapping("/{id}")
    public CareGuideTemplateResponse get(@PathVariable Long id) {
        return service.get(id);
    }

    @PostMapping
    public ResponseEntity<CareGuideTemplateResponse> create(@RequestBody CareGuideTemplateRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.create(request, actor()));
    }

    @PutMapping("/{id}")
    public CareGuideTemplateResponse update(@PathVariable Long id, @RequestBody CareGuideTemplateRequest request) {
        return service.update(id, request, actor());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        service.delete(id);
        return ResponseEntity.noContent().build();
    }
}
